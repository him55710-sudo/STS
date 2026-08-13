import { NextRequest, NextResponse } from "next/server";
import { extractJson, visionJson } from "@/lib/llm";
import type { Category, DetectedObject } from "@/lib/types";

export const maxDuration = 40;

/**
 * AI Object Detection — 사업계획서 §09 "Detect" 단계.
 * GEMINI_API_KEY가 설정되면 Gemini 비전 모델로 실제 탐지하고,
 * 없거나 실패하면 데모용 mock 결과를 반환한다 (AI 실패는 정상 상황 — PRD §56).
 */


/**
 * Fashion-aware detection prompt (fashion_v2) — 온톨로지 기반.
 * 대형(의류) / 중형(신발·가방·모자·벨트·안경) / 소형(시계·팔찌·목걸이·귀걸이·반지)을
 * 크기와 무관하게 각각 독립 객체로 요구하고, tight box를 강제한다.
 */
const PROMPT = `You are a visual commerce tagging engine for fashion content. Detect every distinct purchasable item visible in this image.

Detect ALL of these when visible, each as its own object:
- Garments: shirt, t-shirt, knit, blouse, hoodie, sweatshirt / jacket, blazer, coat, cardigan, fleece / pants, jeans, trousers, shorts / skirt, dress
- Footwear: each pair of shoes, sneakers, loafers, boots, sandals, clogs (one object for the pair)
- Bags: handbag, shoulder bag, crossbody bag, backpack, tote
- Accessories (do NOT skip these even if small): hat, cap, glasses, sunglasses, belt, scarf, watch, bracelet, necklace, earrings, ring
- Non-fashion products if present: furniture, home decor, electronics, beauty products

Rules:
- Products only — never the person, body parts, or background architecture.
- Layered items are separate objects (jacket AND the shirt under it AND pants AND shoes AND bag).
- box_2d must be TIGHT around the item itself: [ymin, xmin, ymax, xmax] on a 0-1000 scale. A top ends at the waist; pants start at the waist; do not extend a garment box over the whole body.
- Small accessories (watch, jewelry): include them even at low confidence; use a small tight box.
- Max 10 objects, most prominent first.
- label is a short English item name; labelKo is a short Korean shopping label (e.g. "울 코트", "가죽 시계").
- category is one of: fashion, beauty, interior, tech, lifestyle.
- confidence is 0~1.

Additionally, for each object extract structured retrieval attributes:
- brandCandidates: brands this item could be, ONLY when there is visible evidence (logo, distinctive design signature). Each entry has brand, confidence 0~1, and evidence (what you actually see, e.g. "black heart-A chest logo", "triangle metal plate"). If there is NO visible evidence, return an EMPTY array — never guess a brand from vibes.
- pattern: one of solid / stripe / check / graphic / logo / denim / other.
- logo: detected true/false; if true add text (letters if readable), description (shape/placement, e.g. "black heart with letter A, left chest"), confidence.
- visibleText: any readable text on the item.
- distinctiveFeatures: 1-3 short phrases a shopper would use (e.g. "ribbed crewneck", "gum sole", "flap pocket").
- fit: short fit descriptor if apparent (e.g. "oversized", "slim", "wide leg").`;

/**
 * Provider 중립 JSON 계약 — Gemini responseSchema 의존을 제거하고
 * 프롬프트로 형식을 강제한다 (OpenAI 호환 provider도 동일하게 동작).
 */
const JSON_HINT = `Return ONLY JSON in this exact shape (no markdown fence, no prose):
{"objects":[{
  "box_2d":[ymin,xmin,ymax,xmax],          // integers 0-1000, TIGHT around the item
  "label":"english item name",
  "labelKo":"짧은 한국어 상품 라벨",
  "category":"fashion|beauty|interior|tech|lifestyle",
  "confidence":0.0-1.0,
  "brandCandidates":[{"brand":"","confidence":0.0-1.0,"evidence":["what you actually see"]}],
  "pattern":"solid|stripe|check|graphic|logo|denim|other",
  "logo":{"detected":true|false,"text":"","description":"","confidence":0.0-1.0},
  "visibleText":[""],
  "distinctiveFeatures":["ribbed crewneck"],
  "fit":"oversized|slim|wide leg|..."
}]}`;

const MOCK: DetectedObject[] = [
  { label: "top", labelKo: "상의", category: "fashion", x: 0.3, y: 0.15, w: 0.4, h: 0.3, confidence: 0.72 },
  { label: "bottom", labelKo: "하의", category: "fashion", x: 0.32, y: 0.48, w: 0.36, h: 0.3, confidence: 0.66 },
  { label: "shoes", labelKo: "신발", category: "fashion", x: 0.36, y: 0.82, w: 0.28, h: 0.12, confidence: 0.61 },
];

export async function POST(req: NextRequest) {
  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const image = body.image;
  if (!image?.startsWith("data:image/")) {
    return NextResponse.json({ error: "image dataURL required" }, { status: 400 });
  }

  if (process.env.VISION_PIPELINE === "legacy") {
    return NextResponse.json({ objects: MOCK, source: "mock", pipelineVersion: "legacy" });
  }
  const t0 = Date.now();

  // provider 체인 (Letsur → Gemini) — 어떤 provider든 동일한 JSON 계약을 반환한다
  const result = await visionJson({
    imageDataUrl: image,
    prompt: PROMPT,
    jsonHint: JSON_HINT,
    timeoutMs: 30000,
  });

  if (!result.data) {
    if (result.status === "quota") {
      // 쿼터 소진은 일반 실패와 구분해 클라이언트에 알린다 (온디바이스로 계속 진행)
      console.warn(`[vision] ${result.provider} quota exhausted`);
      return NextResponse.json({ objects: [], source: "quota", provider: result.provider, pipelineVersion: "fashion_v3" });
    }
    if (result.status === "unavailable" && result.provider === "none") {
      return NextResponse.json({ objects: MOCK, source: "mock", pipelineVersion: "legacy" });
    }
    console.warn(`[vision] detect failed: ${result.provider} ${result.status} ${result.detail ?? ""}`);
    return NextResponse.json({ objects: MOCK, source: "fallback", provider: result.provider, pipelineVersion: "legacy" });
  }

  try {
    // provider마다 배열 또는 {objects:[...]} 로 감싸 반환할 수 있어 둘 다 수용
    const parsed = extractJson<unknown>(result.data);
    const raw = (Array.isArray(parsed)
      ? parsed
      : ((parsed as { objects?: unknown[] } | null)?.objects ?? [])) as Array<{
      box_2d: number[];
      label: string;
      labelKo: string;
      category: Category;
      confidence: number;
      brandCandidates?: { brand: string; confidence: number; evidence: string[] }[];
      pattern?: "solid" | "stripe" | "check" | "graphic" | "logo" | "denim" | "other";
      logo?: { detected: boolean; text?: string; description?: string; confidence: number };
      visibleText?: string[];
      distinctiveFeatures?: string[];
      fit?: string;
    }>;

    const objects: DetectedObject[] = raw
      .filter((o) => Array.isArray(o.box_2d) && o.box_2d.length === 4)
      .slice(0, 10)
      .map((o) => {
        const [ymin, xmin, ymax, xmax] = o.box_2d;
        return {
          label: o.label,
          labelKo: o.labelKo || o.label,
          category: o.category ?? "fashion",
          x: clamp(xmin / 1000),
          y: clamp(ymin / 1000),
          w: clamp((xmax - xmin) / 1000),
          h: clamp((ymax - ymin) / 1000),
          confidence: clamp(o.confidence ?? 0.5),
          attributes: {
            brandCandidates: (o.brandCandidates ?? [])
              .filter((b) => b.brand && Array.isArray(b.evidence) && b.evidence.length > 0)
              .slice(0, 3),
            pattern: o.pattern,
            logo: o.logo,
            visibleText: o.visibleText?.slice(0, 3),
            distinctiveFeatures: o.distinctiveFeatures?.slice(0, 3) ?? [],
            fit: o.fit,
          },
        };
      })
      // 소형 액세서리(시계 등)를 위해 최소 크기 하한을 낮게 유지
      .filter((o) => o.w > 0.008 && o.h > 0.008);

    if (objects.length === 0) throw new Error("no objects parsed");

    console.log(
      `[vision] ${result.provider} detect ${objects.length} objects in ${Date.now() - t0}ms:`,
      objects.map((o) => o.label).join(", ")
    );
    // source는 하위호환을 위해 "gemini"(=정밀 탐지 성공)를 유지하고, provider를 따로 노출한다
    return NextResponse.json({
      objects,
      source: "gemini",
      provider: result.provider,
      pipelineVersion: "fashion_v3",
    });
  } catch (e) {
    // AI 실패는 사용자 흐름을 막지 않는다 — mock으로 계속 진행 (PRD §56)
    console.warn(`[vision] parse failed (${result.provider}): ${(e as Error).message}`);
    return NextResponse.json({ objects: MOCK, source: "fallback", provider: result.provider, pipelineVersion: "legacy" });
  }
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
