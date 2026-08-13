import { NextRequest, NextResponse } from "next/server";
import type { Category, DetectedObject } from "@/lib/types";

export const maxDuration = 30;

/**
 * AI Object Detection — 사업계획서 §09 "Detect" 단계.
 * GEMINI_API_KEY가 설정되면 Gemini 비전 모델로 실제 탐지하고,
 * 없거나 실패하면 데모용 mock 결과를 반환한다 (AI 실패는 정상 상황 — PRD §56).
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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
- confidence is 0~1.`;

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      box_2d: { type: "ARRAY", items: { type: "INTEGER" } },
      label: { type: "STRING" },
      labelKo: { type: "STRING" },
      category: {
        type: "STRING",
        enum: ["fashion", "beauty", "interior", "tech", "lifestyle"],
      },
      confidence: { type: "NUMBER" },
    },
    required: ["box_2d", "label", "labelKo", "category", "confidence"],
  },
};

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

  const key = process.env.GEMINI_API_KEY;
  if (!key || process.env.VISION_PIPELINE === "legacy") {
    return NextResponse.json({ objects: MOCK, source: "mock", pipelineVersion: "legacy" });
  }
  const t0 = Date.now();

  const [meta, data] = image.split(",", 2);
  const mimeType = meta.slice(5, meta.indexOf(";"));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ inlineData: { mimeType, data } }, { text: PROMPT }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(25000),
      }
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("empty response");

    const raw = JSON.parse(text) as Array<{
      box_2d: number[];
      label: string;
      labelKo: string;
      category: Category;
      confidence: number;
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
        };
      })
      // 소형 액세서리(시계 등)를 위해 최소 크기 하한을 낮게 유지
      .filter((o) => o.w > 0.008 && o.h > 0.008);

    console.log(
      `[vision] gemini detect ${objects.length} objects in ${Date.now() - t0}ms:`,
      objects.map((o) => o.label).join(", ")
    );
    return NextResponse.json({ objects, source: "gemini", pipelineVersion: "fashion_v2" });
  } catch {
    // AI 실패는 사용자 흐름을 막지 않는다 — mock으로 계속 진행 (PRD §56)
    return NextResponse.json({ objects: MOCK, source: "fallback", pipelineVersion: "legacy" });
  }
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
