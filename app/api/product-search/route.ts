import { NextRequest, NextResponse } from "next/server";
import { extractJson, providerChain, textJson } from "@/lib/llm";
import { isNaverConfigured } from "@/lib/naver/api-hub";
import { searchNaverProducts } from "@/lib/naver/product-provider";
import { colorSimilarity, productImageColor } from "@/lib/naver/visual-score";

export const maxDuration = 30;

/**
 * 웹 상품 검색 — provider adapter 체인.
 *
 * ⚠️ 네이버 쇼핑 검색 API(/v1/search/shop.json)는 **2026-07-31 종료**되었다.
 *    근거: 네이버 개발자센터 이용약관 부칙 제2조 ③ —
 *    "'Search API' 중 '쇼핑', '책', '학술정보' 데이터 제공 서비스는 2026년 7월 31일 24:00부로 종료"
 *    NAVER API HUB(이관처)에도 쇼핑 항목이 없다. 되살릴 경로가 없으므로 호출하지 않는다.
 *
 *  1) **네이버 webkr 웹문서 검색** — 스마트스토어·무신사·29CM 등 실제 쇼핑몰
 *     상품 페이지 URL을 직접 얻는다. LLM이 전혀 없어도 동작한다 (주 provider).
 *     webkr 미등록/무결과 시 이미지 검색 제목 기반 폴백.
 *  2) LLM 웹 조사 (Gemini 그라운딩) — 브랜드·모델명 추정 보강 (보조, 병렬 실행)
 *  3) 네이버 **이미지 검색**으로 상위 후보의 실제 이미지 색을 얻어 visual 점수를 채운다
 *     (이미지는 제3자 저작물이라 노출하지 않고 점수 계산에만 사용)
 *  4) 모두 없으면 { candidates: [], provider: "none" } → 클라이언트는 카탈로그 검색만 사용
 *
 * 모든 secret은 서버에서만 사용한다. 모델이 만든 상품 URL은 검증 불가하므로
 * 정확 상품명 검색 딥링크(항상 유효)로 대체한다.
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
  /** 네이버 이미지 검색 기반 색상 유사도 (0~1) */
  visualScore?: number;
  visualSource?: string;
}

const nv = (q: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;

export async function POST(req: NextRequest) {
  let body: { queries?: string[]; tone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const queries = (body.queries ?? []).filter((q) => typeof q === "string" && q.trim()).slice(0, 5);
  if (queries.length === 0) {
    return NextResponse.json({ error: "queries required" }, { status: 400 });
  }

  // ── 네이버 실상품 검색(주) + LLM 웹 조사(보조)를 병렬 실행 ──
  // 네이버 provider는 LLM 없이 동작하므로, LLM 쿼터가 죽어도 실상품 후보가 나온다.
  const [naver, llm] = await Promise.all([
    isNaverConfigured() ? searchNaverProducts(queries).catch(() => []) : Promise.resolve([]),
    providerChain().length > 0 ? searchViaLlm(queries) : Promise.resolve([]),
  ]);

  // 네이버(실 URL) 우선, LLM 후보는 상품명 중복 제거 후 뒤에 붙인다
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const seenNames = new Set(naver.map((c) => norm(c.productName)));
  const candidates: WebCandidate[] = [
    ...naver,
    ...llm.filter((c) => !seenNames.has(norm(c.productName))),
  ].slice(0, 10);

  if (candidates.length === 0) {
    return NextResponse.json({
      candidates: [],
      provider: isNaverConfigured() ? "empty" : "none",
    });
  }

  // ── 시각 검증: 네이버 이미지 검색으로 후보 상품의 실제 색을 얻어 visual 점수 산출 ──
  // (이미지 자체는 노출하지 않는다 — 제3자 저작물이며 출처 URL 필드가 없다)
  const tone = typeof body.tone === "string" ? body.tone : undefined;
  let visualScored = 0;
  if (tone && isNaverConfigured()) {
    const top = candidates.slice(0, 4);
    await Promise.all(
      top.map(async (c) => {
        // 몰 페이지 제목은 길다 — 이미지 검색 쿼리는 앞 7토큰으로 자른다
        const q = [c.brand, c.productName, c.color]
          .filter(Boolean)
          .join(" ")
          .split(/\s+/)
          .slice(0, 7)
          .join(" ");
        const color = await productImageColor(q);
        const sim = colorSimilarity(tone, color);
        if (sim != null) {
          c.visualScore = Math.round(sim * 100) / 100;
          c.visualSource = "naver-image";
          visualScored++;
        }
      })
    );
  }

  return NextResponse.json({
    candidates,
    provider: naver.length > 0 ? candidates[0].source : (llm[0]?.source ?? "none"),
    naverCount: naver.length,
    llmCount: llm.length,
    visualScored,
  });
}

// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────

/**
 * LLM으로 "실제 판매 중인 상품"을 조사한다 (Letsur → Gemini 그라운딩 체인).
 * 지어내지 않도록 근거 기반 답변을 요구하고, 결과 JSON은 방어적으로 파싱한다.
 * 모델이 만든 URL은 신뢰하지 않고 정확 상품명 검색 딥링크로 대체한다.
 */
async function searchViaLlm(queries: string[]): Promise<WebCandidate[]> {
  const prompt = `You are a fashion shopping research engine. Find real purchasable products currently sold online that best match this item description (Korean market preferred, global brands OK):

"${queries.join('" / "')}"

Return ONLY JSON (no markdown fence): {"products":[{"brand": string, "productName": string (specific model name), "colorName": string|null, "priceKRW": number|null, "retailer": string}]}

Rules: real products only, up to 5. Do NOT invent model names — if you are not confident a specific model exists, omit it. If unsure of price, use null.`;

  const r = await textJson({ prompt, useWebSearch: true, timeoutMs: 20000 });
  if (!r.data) return [];
  const parsed = extractJson<unknown>(r.data);
  const raw = (Array.isArray(parsed)
    ? parsed
    : ((parsed as { products?: unknown[] } | null)?.products ?? [])) as {
    brand?: string;
    productName?: string;
    colorName?: string | null;
    priceKRW?: number | null;
    retailer?: string;
  }[];

  return raw
    .filter((p) => p.productName)
    .slice(0, 5)
    .map((p, i) => ({
      id: `web-${r.provider}-${i}`,
      brand: p.brand ?? null,
      productName: p.productName!,
      category: null,
      color: p.colorName ?? null,
      price: { value: typeof p.priceKRW === "number" ? p.priceKRW : null, currency: "KRW" },
      retailer: p.retailer ?? "웹 검색",
      // 모델 생성 URL은 신뢰 불가 → 정확 상품명 검색 딥링크로 연결 (항상 유효)
      url: nv([p.brand, p.productName, p.colorName].filter(Boolean).join(" ")),
      imageUrls: [],
      source: `${r.provider}-web`,
      pageTrust: 0.55,
    }));
}
