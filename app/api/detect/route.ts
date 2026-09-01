import { NextRequest, NextResponse } from "next/server";
import { extractJson, visionJson } from "@/lib/llm";
import type { Category, DetectedObject } from "@/lib/types";
import { z } from "zod";

export const maxDuration = 40;
export const runtime = "nodejs";

export const MAX_IMAGE_BYTES = 100 * 1024;
export const MAX_IMAGE_PIXELS = 4_000_000;
const MAX_DATA_URL_LENGTH = 150_000;

const requestSchema = z.strictObject({
  image: z.string().min(1).max(MAX_DATA_URL_LENGTH),
});

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i;

type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

type ImageDimensions = { readonly width: number; readonly height: number };

type ImageParseResult =
  | { readonly kind: "valid" }
  | { readonly kind: "invalid" }
  | { readonly kind: "too-large" };

const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function imageDimensions(bytes: Buffer, mimeType: ImageMimeType): ImageDimensions | null {
  switch (mimeType) {
    case "image/png":
      if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    case "image/jpeg":
      return jpegDimensions(bytes);
    case "image/webp":
      return webpDimensions(bytes);
    default:
      return null;
  }
}

function jpegDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    if (marker === undefined) return null;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if ((marker >= 0xd0 && marker <= 0xd8) || marker === 0x01) continue;
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) return null;
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  return null;
}

function webpDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8L") {
    if (bytes.length < 27 || bytes[21] !== 0x2f) return null;
    return {
      width: 1 + (bytes[22] | (bytes[23] << 8) | ((bytes[24] & 0x3f) << 16)),
      height: 1 + ((bytes[24] >> 6) | (bytes[25] << 2) | ((bytes[26] & 0xf) << 10)),
    };
  }
  if (chunk === "VP8 ") {
    for (let offset = 20; offset + 9 < bytes.length; offset += 1) {
      if (bytes[offset] === 0x9d && bytes[offset + 1] === 0x01 && bytes[offset + 2] === 0x2a) {
        return { width: bytes.readUInt16LE(offset + 3) & 0x3fff, height: bytes.readUInt16LE(offset + 5) & 0x3fff };
      }
    }
  }
  return null;
}

function parseImageDataUrl(dataUrl: string): ImageParseResult {
  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return { kind: "invalid" };
  const mimeType = match[1]?.toLowerCase();
  const payload = match[2];
  if (!payload || (payload.length & 3) !== 0 || (mimeType !== "image/jpeg" && mimeType !== "image/png" && mimeType !== "image/webp")) return { kind: "invalid" };
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  const decodedLength = (payload.length / 4) * 3 - padding;
  if (decodedLength <= 0 || decodedLength > MAX_IMAGE_BYTES) return { kind: "too-large" };
  const bytes = Buffer.from(payload, "base64");
  const dimensions = imageDimensions(bytes, mimeType);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return { kind: "invalid" };
  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) return { kind: "too-large" };
  return { kind: "valid" };
}

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
- modelIdentifiers: exact SKU, style code, model code, barcode or GTIN text only when readable; otherwise an empty array.
- materials: visually supported material terms such as oxford cotton, denim, suede, leather, or knit; otherwise an empty array.
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
  "modelIdentifiers":[""],
  "materials":[""],
  "distinctiveFeatures":["ribbed crewneck"],
  "fit":"oversized|slim|wide leg|..."
}]}`;

const MOCK: DetectedObject[] = [
  { label: "top", labelKo: "상의", category: "fashion", x: 0.3, y: 0.15, w: 0.4, h: 0.3, confidence: 0.72 },
  { label: "bottom", labelKo: "하의", category: "fashion", x: 0.32, y: 0.48, w: 0.36, h: 0.3, confidence: 0.66 },
  { label: "shoes", labelKo: "신발", category: "fashion", x: 0.36, y: 0.82, w: 0.28, h: 0.12, confidence: 0.61 },
];

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "image dataURL required" }, { status: 400 });
  }
  const image = parsedBody.data.image;
  const parsedImage = parseImageDataUrl(image);
  switch (parsedImage.kind) {
    case "invalid":
      return NextResponse.json({ error: "invalid image dataURL" }, { status: 400 });
    case "too-large":
      return NextResponse.json({ error: "image payload exceeds safety limits" }, { status: 413 });
    case "valid":
      break;
    default:
      return assertNever(parsedImage);
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
      modelIdentifiers?: string[];
      materials?: string[];
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
            modelIdentifiers: o.modelIdentifiers?.filter(Boolean).slice(0, 3),
            materials: o.materials?.filter(Boolean).slice(0, 3),
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

function assertNever(value: never): never {
  throw new Error(`unexpected image validation result: ${JSON.stringify(value)}`);
}
