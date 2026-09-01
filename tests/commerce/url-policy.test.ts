import { describe, expect, it } from "vitest";
import {
  classifyCommerceUrl,
  isPurchaseEligibleOffer,
} from "../../lib/commerce/url-policy";
import { canonicalOfferSchema } from "../../lib/commerce/types";
import type { CommerceOffer, MatchState } from "../../lib/commerce/types";

function offerFixture(matchState: MatchState): CommerceOffer {
  return {
    id: "offer:direct:fixture",
    canonicalProductId: "canonical:fixture",
    provider: "direct",
    providerProductId: "fixture-source-id",
    sourceIdentity: {
      source: "direct",
      sourceProductId: "fixture-source-id",
    },
    merchant: "Fixture Merchant",
    title: "Fixture Product",
    detailUrl: "https://www.musinsa.com/products/3010383",
    discoveryUrl: null,
    affiliateUrl: null,
    imageUrl: "/looks/plw-polo-oxford.jpg",
    imageVariants: [{ kind: "primary", url: "/looks/plw-polo-oxford.jpg" }],
    price: 259000,
    currency: "KRW",
    shippingPrice: null,
    availability: "in_stock",
    stock: { status: "in_stock", quantity: null },
    commissionRate: null,
    matchState,
    offerLifecycle: "active",
    freshness: {
      observedAt: "2026-08-27T00:00:00.000Z",
      staleAfter: "2026-09-03T00:00:00.000Z",
    },
    identityScore: 1,
    evidence: [
      { signal: "model", value: "Fixture Product", score: 1 },
      { signal: "detail_page", value: "https://www.musinsa.com/products/3010383", score: 1 },
    ],
    verificationEvidence: [{ signal: "detail_page", value: "https://www.musinsa.com/products/3010383", score: 1 }],
    detailPageVerified: true,
  };
}

describe("commerce URL policy", () => {
  it("classifies marketplace search pages as discovery-only", () => {
    const result = classifyCommerceUrl(
      "https://search.shopping.naver.com/search/all?query=%EC%85%94%EC%B8%A0"
    );

    expect(result).toEqual({
      kind: "discovery",
      url: "https://search.shopping.naver.com/search/all?query=%EC%85%94%EC%B8%A0",
    });
  });

  it("classifies a Musinsa product page as a possible detail URL", () => {
    expect(classifyCommerceUrl("https://www.musinsa.com/products/3010383")).toEqual({
      kind: "detail",
      url: "https://www.musinsa.com/products/3010383",
    });
  });

  it("does not make a search-only offer purchase eligible", () => {
    const offer: CommerceOffer = {
      id: "offer:naver:search-only",
      canonicalProductId: null,
      provider: "direct",
      sourceIdentity: null,
      merchant: "네이버쇼핑",
      title: "옥스포드 셔츠",
      detailUrl: null,
      discoveryUrl: "https://search.shopping.naver.com/search/all?query=%EC%85%94%EC%B8%A0",
      affiliateUrl: null,
      imageUrl: null,
      imageVariants: [],
      price: null,
      currency: null,
      shippingPrice: null,
      availability: "unknown",
      stock: { status: "unknown", quantity: null },
      commissionRate: null,
      matchState: "unverified",
      offerLifecycle: "active",
      freshness: {
        observedAt: "2026-08-27T00:00:00.000Z",
        staleAfter: null,
      },
      identityScore: 0.8,
      evidence: [],
      verificationEvidence: [],
      detailPageVerified: false,
    };

    expect(isPurchaseEligibleOffer(offer)).toBe(false);
  });

  it("rejects exact canonical offers without source identity, detail URL, and evidence", () => {
    const completeOffer = offerFixture("exact");
    const { sourceIdentity: _sourceIdentity, ...withoutSourceIdentity } = completeOffer;
    const withoutDetailUrl = { ...completeOffer, detailUrl: null };
    const withoutEvidence = { ...completeOffer, evidence: [], verificationEvidence: [] };

    expect(canonicalOfferSchema.safeParse(withoutSourceIdentity).success).toBe(false);
    expect(canonicalOfferSchema.safeParse(withoutDetailUrl).success).toBe(false);
    expect(canonicalOfferSchema.safeParse(withoutEvidence).success).toBe(false);
  });

  it("requires exact identity and an approved affiliate path for purchase eligibility", () => {
    const affiliateUrl = "https://sovrn.co?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383";
    const exact = { ...offerFixture("exact"), affiliateUrl };
    const likely = { ...exact, matchState: "likely" as const };

    expect(isPurchaseEligibleOffer(offerFixture("exact"))).toBe(false);
    expect(isPurchaseEligibleOffer(exact)).toBe(true);
    expect(isPurchaseEligibleOffer(likely)).toBe(false);
    expect(isPurchaseEligibleOffer({
      ...exact,
      affiliateUrl: "https://evil.example/redirect?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383",
    })).toBe(false);
  });

  it.each([
    ["ADPICK", "https://track.adpick.co.kr/click?url=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383"],
    ["LinkPrice", "https://click.linkprice.com/click?url=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383"],
  ])("accepts an exactly bound %s affiliate URL", (_network, affiliateUrl) => {
    expect(isPurchaseEligibleOffer({ ...offerFixture("exact"), affiliateUrl })).toBe(true);
  });

  it.each([
    ["ADPICK", "https://track.adpick.co.kr/click?url=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F9999999"],
    ["LinkPrice", "https://click.linkprice.com/click?url=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F9999999"],
  ])("rejects a %s affiliate URL bound to a different detail URL", (_network, affiliateUrl) => {
    expect(isPurchaseEligibleOffer({ ...offerFixture("exact"), affiliateUrl })).toBe(false);
  });

  it("rejects marketplace search URLs as canonical detail URLs", () => {
    const offer = {
      ...offerFixture("exact"),
      detailUrl: "https://search.shopping.naver.com/search/all?query=oxford",
    };

    expect(canonicalOfferSchema.safeParse(offer).success).toBe(false);
  });

  it("allows nullable affiliate URLs for non-purchasable canonical states", () => {
    for (const matchState of ["similar", "review", "unverified"] satisfies readonly MatchState[]) {
      const offer = {
        ...offerFixture(matchState),
        canonicalProductId: null,
        detailUrl: null,
        affiliateUrl: null,
        evidence: [],
        verificationEvidence: [],
        detailPageVerified: false,
      };

      expect(canonicalOfferSchema.safeParse(offer).success).toBe(true);
      expect(isPurchaseEligibleOffer(offer)).toBe(false);
    }
  });
});
