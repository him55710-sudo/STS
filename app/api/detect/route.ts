import { NextRequest, NextResponse } from "next/server";
import type { Category, DetectedObject } from "@/lib/types";

export const maxDuration = 30;

/**
 * AI Object Detection — 사업계획서 §09 "Detect" 단계.
 * GEMINI_API_KEY가 설정되면 Gemini 비전 모델로 실제 탐지하고,
 * 없거나 실패하면 데모용 mock 결과를 반환한다 (AI 실패는 정상 상황 — PRD §56).
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const PROMPT = `You are a visual commerce tagging engine. Detect every distinct purchasable product visible in this image (clothing items, shoes, bags, accessories, furniture, home decor, electronics, beauty products, etc.).

Rules:
- Detect the products a shopper could buy, not people or background architecture.
- Separate items worn together (coat / shirt / pants / shoes / bag are each their own object).
- Max 8 objects, most prominent first.
- box_2d is [ymin, xmin, ymax, xmax] on a 0-1000 scale.
- labelKo is a short Korean shopping label (e.g. "울 코트", "세라믹 머그").
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
  if (!key) {
    return NextResponse.json({ objects: MOCK, source: "mock" });
  }

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
      .slice(0, 8)
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
      .filter((o) => o.w > 0.02 && o.h > 0.02);

    return NextResponse.json({ objects, source: "gemini" });
  } catch {
    // AI 실패는 사용자 흐름을 막지 않는다 — mock으로 계속 진행 (PRD §56)
    return NextResponse.json({ objects: MOCK, source: "fallback" });
  }
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
