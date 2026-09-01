import { describe, expect, it } from "vitest";
import { resolveCandidateMatch } from "../../lib/commerce/identity-resolver";
import { rankCommerceCandidates } from "../../lib/commerce/ranker";
import { resolvePurchaseCtaDecision } from "../../lib/commerce/cta-policy";
import type { CanonicalProduct, CommerceOffer, IdentityEvidence } from "../../lib/commerce/types";

const polo: CanonicalProduct = {
  id: "canonical:polo:oxford:sky-blue",
  brand: "Polo Ralph Lauren",
  productName: "Classic Fit Oxford Shirt",
  category: "fashion",
  sourceIdentity: null,
  sku: null,
  model: null,
  gtin: null,
  attributes: {
    color: "sky blue",
    size: null,
    volume: null,
  productLine: "Classic Fit Oxford",
  },
  identifiers: [],
  aliases: ["클래식 핏 옥스포드 셔츠 스카이 블루", "classic fit oxford shirt sky blue"],
  referenceImages: ["/looks/plw-polo-oxford.jpg"],
};

const offer = (input: Partial<CommerceOffer>): CommerceOffer => ({
  id: "offer:test",
  canonicalProductId: polo.id,
  provider: "sovrn",
  sourceIdentity: { source: "sovrn", sourceProductId: "source:123" },
  merchant: "Global Merchant",
  title: "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue",
  detailUrl: "https://www.musinsa.com/products/3010383",
  discoveryUrl: null,
  affiliateUrl: "https://sovrn.co?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383",
  imageUrl: "/looks/plw-polo-oxford.jpg",
  price: 198000,
  currency: "KRW",
  shippingPrice: 0,
  availability: "in_stock",
  commissionRate: 0.04,
  matchState: "likely",
  identityScore: 0.88,
  evidence: [{ signal: "model", value: "brand and model title match", score: 0.85 } satisfies IdentityEvidence],
  verificationEvidence: [{ signal: "detail_page", value: "verified detail page", score: 1 }],
  detailPageVerified: true,
  offerLifecycle: "active",
  freshness: { observedAt: "2026-08-27T00:00:00+09:00", staleAfter: null },
  stock: { status: "in_stock", quantity: 1 },
  imageVariants: [],
  ...input,
});

describe("canonical identity resolver and commerce ranker", () => {
  it("does not call a gray blazer with matching keywords the same product", () => {
    const result = resolveCandidateMatch({
      canonical: polo,
      title: "Polo Ralph Lauren 여성 클래식핏 체크 블레이저 그레이",
      brand: "Polo Ralph Lauren",
      category: "fashion",
      color: "gray",
      detailUrl: "https://www.musinsa.com/products/3010384",
      detailPageVerified: true,
      imageSimilarity: 0.35,
      identifiers: [],
    });

    expect(result.matchState).not.toBe("exact");
    expect(result.reasons.some((reason) => reason.includes("category") || reason.includes("color"))).toBe(true);
  });

  it("keeps a verified exact offer ahead of a higher-commission non-exact offer", () => {
    const exact = offer({ id: "offer:exact", matchState: "exact", identityScore: 0.99, commissionRate: 0.02 });
    const wrong = offer({ id: "offer:wrong", matchState: "likely", identityScore: 0.82, commissionRate: 0.25, title: "Polo blue blazer", detailUrl: "https://www.musinsa.com/products/3010384" });

    expect(rankCommerceCandidates([wrong, exact]).map((candidate) => candidate.id)).toEqual(["offer:exact"]);
  });

  it("removes discovery-only candidates from the purchase ranking", () => {
    const exact = offer({ id: "offer:exact", matchState: "exact" });
    const discovery = offer({
      id: "offer:search",
      matchState: "unverified",
      detailUrl: null,
      affiliateUrl: null,
      discoveryUrl: "https://search.shopping.naver.com/search/all?query=shirt",
      detailPageVerified: false,
      commissionRate: 0.99,
    });

    expect(rankCommerceCandidates([discovery, exact]).map((candidate) => candidate.id)).toEqual(["offer:exact"]);
  });

  it("keeps likely, similar, review, unverified, stale, and quarantined offers in review-only state", () => {
    expect(resolvePurchaseCtaDecision(offer({ matchState: "likely" })).kind).toBe("review_only");
    expect(resolvePurchaseCtaDecision(offer({ matchState: "similar" })).kind).toBe("review_only");
    expect(resolvePurchaseCtaDecision(offer({ matchState: "review" })).kind).toBe("review_only");
    expect(resolvePurchaseCtaDecision(offer({ matchState: "unverified" })).kind).toBe("review_only");
    expect(resolvePurchaseCtaDecision(offer({ matchState: "exact", affiliateUrl: null })).kind).toBe("review_only");
    expect(resolvePurchaseCtaDecision(offer({ matchState: "exact", offerLifecycle: "stale" })).kind).toBe("review_only");
    expect(resolvePurchaseCtaDecision(offer({ matchState: "exact", offerLifecycle: "quarantined" })).kind).toBe("review_only");
  });
});
