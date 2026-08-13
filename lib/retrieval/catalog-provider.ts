import { PRODUCTS } from "../catalog";
import { KEYWORDS } from "../match";
import { colorDistance, PRODUCT_TONES } from "../product-colors";
import { MATCH_TIERS, RANK_WEIGHTS } from "../vision-config";
import { colorName } from "./queries";
import type { CandidateScores, MatchTier, ProductCandidate, RetrievalQuery } from "./types";

/**
 * Catalog Provider — 로컬 실상품 카탈로그를 검색 소스로 사용한다.
 * 외부 쇼핑 API 키가 없어도 항상 동작하는 기본 provider이며,
 * score breakdown·tier·근거를 완전한 형태로 반환한다.
 */

export function searchCatalog(q: RetrievalQuery, limit = 6): ProductCandidate[] {
  const needle = `${q.label} ${q.labelKo} ${q.queries.join(" ")}`.toLowerCase();
  const brandCands = q.attributes?.brandCandidates ?? [];
  const logo = q.attributes?.logo;

  const scored = PRODUCTS.map((p) => {
    const reason: string[] = [];

    // text — 키워드/쿼리 일치
    let hits = 0;
    for (const kw of KEYWORDS[p.id] ?? []) {
      if (needle.includes(kw.toLowerCase())) hits += 1;
    }
    const text = Math.min(1, hits / 3);
    if (hits > 0) reason.push(`카테고리·키워드 일치 (${hits})`);

    // brand — 탐지된 브랜드 후보와 카탈로그 브랜드 비교
    let brand = 0;
    const pBrand = p.brand.toLowerCase();
    for (const bc of brandCands) {
      const b = bc.brand.toLowerCase();
      if (pBrand.includes(b) || b.includes(pBrand)) {
        brand = Math.max(brand, Math.min(1, bc.confidence + 0.25));
        reason.push(`브랜드 후보 일치: ${bc.brand}${bc.evidence?.[0] ? ` (${bc.evidence[0]})` : ""}`);
      }
    }

    // logo — 로고 텍스트/설명이 브랜드·상품명과 겹치는지
    let logoScore = 0;
    if (logo?.detected) {
      const hay = `${p.brand} ${p.name}`.toLowerCase();
      const sig = `${logo.text ?? ""} ${logo.description ?? ""}`.toLowerCase();
      const words = sig.split(/[^a-z가-힣0-9]+/).filter((w) => w.length >= 2);
      const matched = words.filter((w) => hay.includes(w));
      if (matched.length > 0) {
        logoScore = Math.min(1, matched.length / 2);
        reason.push(`로고 근거 일치: ${matched.slice(0, 2).join(", ")}`);
      }
    }

    // visual/color — 마스크 픽셀 색 vs 상품 정색
    let color = 0;
    const tone = PRODUCT_TONES[p.id];
    if (q.tone && tone) {
      const d = colorDistance(q.tone, tone);
      color = Math.max(0, 1 - d / 180);
      if (d < 70) reason.push(`색상 일치 (${colorName(q.tone)?.ko ?? q.tone})`);
    }

    // attributes — 특징 단어가 상품명에 등장하는지
    let attributes = 0;
    const feats = q.attributes?.distinctiveFeatures ?? [];
    if (feats.length > 0) {
      const hay = `${p.brand} ${p.name}`.toLowerCase();
      const matched = feats.filter((f) =>
        f.toLowerCase().split(/\s+/).some((w) => w.length >= 2 && hay.includes(w))
      );
      attributes = Math.min(1, matched.length / Math.max(2, feats.length));
      if (matched.length > 0) reason.push(`디테일 일치: ${matched[0]}`);
    }

    // pageTrust — 카탈로그 링크는 정확 상품명 검색 딥링크 (검수됨)
    const pageTrust = 0.7;

    const final =
      RANK_WEIGHTS.visual * color +
      RANK_WEIGHTS.brand * brand +
      RANK_WEIGHTS.logo * logoScore +
      RANK_WEIGHTS.attributes * attributes +
      RANK_WEIGHTS.color * color +
      RANK_WEIGHTS.text * text +
      RANK_WEIGHTS.pageTrust * pageTrust +
      (p.affiliate ? 0.03 : 0); // 제휴는 동점일 때만 앞서는 수준의 미세 가중

    const scores: CandidateScores = {
      visual: r2(color),
      brand: r2(brand),
      logo: r2(logoScore),
      color: r2(color),
      attributes: r2(attributes),
      text: r2(text),
      pageTrust,
      final: r2(final),
    };

    return { p, scores, reason, hits };
  })
    .filter((x) => x.hits > 0 || x.scores.brand > 0)
    .sort((a, b) => b.scores.final - a.scores.final)
    .slice(0, limit);

  return scored.map(({ p, scores, reason }) => ({
    id: `cat-${p.id}`,
    brand: p.brand,
    productName: p.name,
    category: p.category,
    color: PRODUCT_TONES[p.id] ?? null,
    price: { value: p.price, currency: p.currency },
    retailer: p.retailer,
    url: p.url,
    imageUrls: [p.image],
    source: "catalog",
    catalogProductId: p.id,
    affiliate: p.affiliate,
    commissionRate: p.commissionRate,
    scores,
    tier: decideTier(scores),
    matchReason: reason.slice(0, 4),
  }));
}

/**
 * Exact / Likely / Similar 판정.
 * 근거 없이 "동일 상품"이라고 단정하지 않는다 — 브랜드 근거 없으면 최대 similar.
 */
export function decideTier(s: CandidateScores): MatchTier {
  if (s.final >= MATCH_TIERS.exactMin && s.brand >= 0.6 && (s.logo >= 0.5 || s.text >= 0.6) && s.color >= 0.4)
    return "exact";
  if (s.final >= MATCH_TIERS.likelyMin && s.brand >= 0.4) return "likely";
  return "similar";
}

const r2 = (n: number) => Math.round(n * 100) / 100;
