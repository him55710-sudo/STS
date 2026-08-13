import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * 웹 상품 검색 — provider adapter 체인.
 *
 *  1) Naver Shopping OpenAPI  (NAVER_CLIENT_ID/SECRET 설정 시 — 가장 정확, 상품 이미지·가격·몰 링크)
 *     https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 *  2) Gemini + Google Search grounding (GEMINI_API_KEY만 있으면 동작 — 웹에서 실판매 상품 조사)
 *     https://ai.google.dev/gemini-api/docs/google-search
 *  3) 둘 다 없으면 { candidates: [], provider: "none" } → 클라이언트는 카탈로그 검색만 사용
 *
 * 모든 secret은 서버에서만 사용한다. 그라운딩 결과의 상품 URL은 모델 생성 텍스트라
 * 검증 불가 → 정확 상품명 검색 딥링크(항상 유효)로 대체하고 원 출처는 sourceUrl로 보존.
 */

interface WebCandidate {
  id: string;
  brand: string | null;
  productName: string;
  category: string | null;
  color: string | null;
  price: { value: number | null; currency: string | null };
  retailer: string;
  url: string;
  imageUrls: string[];
  source: string;
  pageTrust?: number;
  sourceUrl?: string;
}

const nv = (q: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;

export async function POST(req: NextRequest) {
  let body: { queries?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const queries = (body.queries ?? []).filter((q) => typeof q === "string" && q.trim()).slice(0, 5);
  if (queries.length === 0) {
    return NextResponse.json({ error: "queries required" }, { status: 400 });
  }

  // ── Provider 1: Naver Shopping ──
  const naverId = process.env.NAVER_CLIENT_ID;
  const naverSecret = process.env.NAVER_CLIENT_SECRET;
  if (naverId && naverSecret) {
    const candidates = await searchNaver(queries, naverId, naverSecret);
    if (candidates.length > 0) return NextResponse.json({ candidates, provider: "naver" });
  }

  // ── Provider 2: Gemini + Google Search grounding ──
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const candidates = await searchGeminiGrounded(queries, geminiKey);
    if (candidates.length > 0) return NextResponse.json({ candidates, provider: "gemini-web" });
    return NextResponse.json({ candidates: [], provider: "gemini-web-empty" });
  }

  return NextResponse.json({ candidates: [], provider: "none" });
}

// ────────────────────────────────────────────────────────────

interface NaverItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
}

async function searchNaver(queries: string[], id: string, secret: string): Promise<WebCandidate[]> {
  try {
    const results = await Promise.allSettled(
      queries.slice(0, 3).map(async (q) => {
        const res = await fetch(
          `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(q)}&display=6&sort=sim`,
          {
            headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (!res.ok) throw new Error(`naver ${res.status}`);
        const json = (await res.json()) as { items?: NaverItem[] };
        return json.items ?? [];
      })
    );
    const seen = new Set<string>();
    return results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((it) => it.link && !seen.has(it.link) && (seen.add(it.link), true))
      .slice(0, 12)
      .map((it) => ({
        id: `naver-${it.productId}`,
        brand: it.brand || it.maker || null,
        productName: it.title.replace(/<[^>]+>/g, ""),
        category: it.category2 || it.category1 || null,
        color: null,
        price: { value: parseInt(it.lprice, 10) || null, currency: "KRW" },
        retailer: it.mallName || "네이버쇼핑",
        url: it.link,
        imageUrls: it.image ? [it.image] : [],
        source: "naver",
        pageTrust: it.productType === "1" ? 0.85 : 0.6,
      }));
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────

/**
 * Gemini에 Google Search 도구를 붙여 "실제 판매 중인 상품"을 조사한다.
 * 그라운딩 없이 아는 척하지 않도록 근거(검색) 기반 답변을 요구하고,
 * 결과 JSON은 코드펜스 제거 후 방어적으로 파싱한다.
 */
async function searchGeminiGrounded(queries: string[], key: string): Promise<WebCandidate[]> {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const prompt = `You are a fashion shopping research engine. Using Google Search, find real purchasable products currently sold online that best match this item description (Korean market preferred, global brands OK):

"${queries.join('" / "')}"

Return ONLY a JSON array (no markdown fence) of up to 5 products, each:
{"brand": string, "productName": string (Korean or English, specific model name), "colorName": string|null, "priceKRW": number|null (approximate retail), "retailer": string (official mall or major retailer name)}

Rules: only products you actually found via search. Do not invent model names. If unsure of price, use null.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("");
    if (!text) return [];
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start < 0 || end <= start) return [];
    const raw = JSON.parse(cleaned.slice(start, end + 1)) as {
      brand?: string;
      productName?: string;
      colorName?: string | null;
      priceKRW?: number | null;
      retailer?: string;
    }[];
    // 그라운딩 출처 (있으면 신뢰 근거로 보존)
    const sources: string[] =
      json?.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: { web?: { uri?: string } }) => c.web?.uri)
        .filter(Boolean) ?? [];

    return raw
      .filter((p) => p.productName)
      .slice(0, 5)
      .map((p, i) => ({
        id: `gweb-${i}-${Date.now().toString(36)}`,
        brand: p.brand ?? null,
        productName: p.productName!,
        category: null,
        color: p.colorName ?? null,
        price: { value: typeof p.priceKRW === "number" ? p.priceKRW : null, currency: "KRW" },
        retailer: p.retailer ?? "웹 검색",
        // 모델 생성 URL은 신뢰 불가 → 정확 상품명 검색 딥링크로 연결 (항상 유효)
        url: nv([p.brand, p.productName, p.colorName].filter(Boolean).join(" ")),
        imageUrls: [],
        source: "gemini-web",
        pageTrust: 0.55,
        sourceUrl: sources[i] ?? sources[0],
      }));
  } catch {
    return [];
  }
}
