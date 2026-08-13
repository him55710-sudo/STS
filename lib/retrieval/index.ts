import type { DetectedObject } from "../types";
import { MATCH_TIERS, RANK_WEIGHTS, RETRIEVAL_CONCURRENCY } from "../vision-config";
import { searchCatalog, decideTier } from "./catalog-provider";
import { buildRetrievalQuery, colorName } from "./queries";
import type { CandidateScores, ProductCandidate, RetrievalQuery } from "./types";

/**
 * Multi-stage Product Retrieval —
 *   attributes → query generation → providers(catalog + web) → normalize →
 *   rerank(composite score) → tier calibration.
 *
 * 웹 provider(naver)는 서버 route를 통해서만 호출된다 (secret 보호).
 * 같은 세션에서 동일 객체 재검색 시 캐시를 사용한다.
 */

const cache = new Map<string, ProductCandidate[]>();

export async function retrieveCandidates(obj: DetectedObject): Promise<{
  query: RetrievalQuery;
  candidates: ProductCandidate[];
}> {
  const query = buildRetrievalQuery(obj);
  const key = JSON.stringify([query.queries, query.tone, query.canonicalClass]);
  const cached = cache.get(key);
  if (cached) return { query, candidates: cached };

  // 1) 카탈로그 provider (항상 동작)
  const catalog = searchCatalog(query, 6);

  // 2) 웹 provider (키 있으면) — 서버 route 경유
  let web: ProductCandidate[] = [];
  try {
    const res = await fetch("/api/product-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: query.queries, tone: query.tone }),
      signal: AbortSignal.timeout(9000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        candidates: (Omit<ProductCandidate, "scores" | "tier" | "matchReason"> & { pageTrust?: number })[];
      };
      web = (json.candidates ?? []).map((c) => scoreWebCandidate(c, query));
    }
  } catch {
    // 웹 검색 실패는 전체 흐름을 막지 않는다
  }

  // 3) merge + rerank — 첫 번째 결과를 그대로 쓰지 않고 composite score로 재정렬
  const merged = [...catalog, ...web]
    .sort((a, b) => b.scores.final - a.scores.final)
    .slice(0, 8);

  cache.set(key, merged);
  return { query, candidates: merged };
}

/**
 * 웹 후보 재랭킹 — 텍스트·브랜드·색상명 근거로 채점.
 * (후보 이미지 시각 비교는 임베딩 provider 도입 전까지 not measured — visual=0)
 */
function scoreWebCandidate(
  c: Omit<ProductCandidate, "scores" | "tier" | "matchReason"> & { pageTrust?: number },
  q: RetrievalQuery
): ProductCandidate {
  const reason: string[] = [];
  const hay = `${c.brand ?? ""} ${c.productName}`.toLowerCase();

  // brand
  let brand = 0;
  for (const bc of q.attributes?.brandCandidates ?? []) {
    const b = bc.brand.toLowerCase();
    if (hay.includes(b)) {
      brand = Math.max(brand, Math.min(1, bc.confidence + 0.25));
      reason.push(`브랜드 일치: ${bc.brand}`);
    }
  }

  // text — 쿼리 토큰이 상품명에 얼마나 나타나는지
  const tokens = q.queries.join(" ").toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const uniq = [...new Set(tokens)];
  const matched = uniq.filter((t) => hay.includes(t));
  const text = uniq.length ? Math.min(1, matched.length / Math.min(uniq.length, 6)) : 0;
  if (matched.length >= 2) reason.push(`상품명 근거: ${matched.slice(0, 3).join(", ")}`);

  // color — 후보의 색상 필드 또는 상품명에 색상명이 포함되는지
  let color = 0;
  const cn = colorName(q.tone);
  if (cn) {
    const candColor = (c.color ?? "").toLowerCase();
    if (candColor && (candColor.includes(cn.ko.toLowerCase()) || candColor.includes(cn.en))) {
      color = 0.9;
      reason.push(`색상 일치: ${cn.ko}`);
    } else if (hay.includes(cn.ko.toLowerCase()) || hay.includes(cn.en)) {
      color = 0.8;
      reason.push(`색상명 일치: ${cn.ko}`);
    }
  }

  // logo — 로고 텍스트가 상품명에 등장
  let logo = 0;
  const logoSig = q.attributes?.logo;
  if (logoSig?.detected && logoSig.text && hay.includes(logoSig.text.toLowerCase())) {
    logo = 0.9;
    reason.push(`로고 텍스트 일치: ${logoSig.text}`);
  }

  const pageTrust = c.pageTrust ?? 0.6;
  // 서버가 네이버 이미지 검색으로 산출한 색상 유사도 (없으면 0)
  const visual = typeof c.visualScore === "number" ? c.visualScore : 0;
  if (visual >= 0.6) reason.push(`이미지 색상 유사 (${Math.round(visual * 100)}%)`);
  const final =
    RANK_WEIGHTS.visual * visual +
    RANK_WEIGHTS.brand * brand +
    RANK_WEIGHTS.logo * logo +
    RANK_WEIGHTS.attributes * text * 0.5 +
    RANK_WEIGHTS.color * color +
    RANK_WEIGHTS.text * text +
    RANK_WEIGHTS.pageTrust * pageTrust;

  const scores: CandidateScores = {
    visual: r2(visual),
    brand: r2(brand),
    logo: r2(logo),
    color: r2(color),
    attributes: r2(text * 0.5),
    text: r2(text),
    pageTrust,
    final: r2(final),
  };

  return {
    ...c,
    scores,
    // 웹 후보는 이미지 시각 비교 전이므로 exact 부여 금지 — 최대 likely
    tier: decideTier(scores) === "exact" ? "likely" : decideTier(scores),
    matchReason: reason.slice(0, 4),
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** 객체 배열에 대해 동시 실행 상한을 지키며 retrieval 실행 */
export async function retrieveAll(
  objects: DetectedObject[]
): Promise<Map<number, Awaited<ReturnType<typeof retrieveCandidates>>>> {
  const out = new Map<number, Awaited<ReturnType<typeof retrieveCandidates>>>();
  let idx = 0;
  const workers = Array.from({ length: Math.min(RETRIEVAL_CONCURRENCY, objects.length) }, async () => {
    while (idx < objects.length) {
      const i = idx++;
      try {
        out.set(i, await retrieveCandidates(objects[i]));
      } catch {
        // 개별 실패 무시
      }
    }
  });
  await Promise.all(workers);
  return out;
}

export { MATCH_TIERS };
export type { ProductCandidate, RetrievalQuery };
