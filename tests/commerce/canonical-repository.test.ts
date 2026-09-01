import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getCanonicalProductForLegacyId,
  getCommerceOffersForLegacyId,
} from "../../lib/commerce/canonical-repository";
import { canonicalOfferSchema } from "../../lib/commerce/types";
import {
  CANONICAL_MATCH_STATES,
  POST_OBJECT_EXACTNESS_SQL_VALUES,
  mapLegacyExactnessToMatchState,
} from "../../lib/types";
import { isPurchaseEligibleOffer } from "../../lib/commerce/url-policy";

const previousFixtureMode = process.env.CATALOG_E2E_FIXTURES;

beforeAll(() => {
  process.env.CATALOG_E2E_FIXTURES = "1";
});

afterAll(() => {
  if (previousFixtureMode === undefined) {
    delete process.env.CATALOG_E2E_FIXTURES;
  } else {
    process.env.CATALOG_E2E_FIXTURES = previousFixtureMode;
  }
});

describe("canonical commerce repository", () => {
  it("unifies the two Polo demo IDs into one canonical product", () => {
    const mens = getCanonicalProductForLegacyId("pl-polo-oxford");
    const womens = getCanonicalProductForLegacyId("plw-polo-oxford");

    expect(mens?.id).toBe("canonical:polo-ralph-lauren:classic-fit-oxford:sky-blue");
    expect(womens?.id).toBe(mens?.id);
  });

  it("keeps the verified Musinsa detail offer purchase eligible", () => {
    const offers = getCommerceOffersForLegacyId("plw-polo-oxford");
    const offer = offers.find((candidate) => candidate.merchant === "무신사");

    expect(offer?.detailUrl).toBe("https://www.musinsa.com/products/3010383");
    expect(offer?.matchState).toBe("exact");
    expect(offer ? isPurchaseEligibleOffer(offer) : false).toBe(true);
  });

  it("recognizes the client-exposed fixture flag for the verified Musinsa offer", () => {
    const previousPrivateFlag = process.env.CATALOG_E2E_FIXTURES;
    const previousPublicFlag = process.env.NEXT_PUBLIC_CATALOG_E2E_FIXTURES;
    delete process.env.CATALOG_E2E_FIXTURES;
    process.env.NEXT_PUBLIC_CATALOG_E2E_FIXTURES = "1";

    try {
      const offer = getCommerceOffersForLegacyId("plw-polo-oxford").find((candidate) => candidate.merchant === "무신사");
      expect(offer?.matchState).toBe("exact");
      expect(offer ? isPurchaseEligibleOffer(offer) : false).toBe(true);
    } finally {
      if (previousPrivateFlag === undefined) delete process.env.CATALOG_E2E_FIXTURES;
      else process.env.CATALOG_E2E_FIXTURES = previousPrivateFlag;
      if (previousPublicFlag === undefined) delete process.env.NEXT_PUBLIC_CATALOG_E2E_FIXTURES;
      else process.env.NEXT_PUBLIC_CATALOG_E2E_FIXTURES = previousPublicFlag;
    }
  });

  it("serializes the current Musinsa offer through the canonical contract", () => {
    const offers = getCommerceOffersForLegacyId("plw-polo-oxford");
    const offer = offers.find((candidate) => candidate.merchant === "무신사");

    const result = canonicalOfferSchema.safeParse(offer);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.sourceIdentity).toEqual({
      source: "direct",
      sourceProductId: "plw-polo-oxford",
    });
    expect(result.data.detailUrl).toBe("https://www.musinsa.com/products/3010383");
    expect(result.data.imageVariants).toContainEqual({
      kind: "primary",
      url: "/looks/plw-polo-oxford.jpg",
    });
    expect(result.data.offerLifecycle).toBe("active");
    expect(result.data.verificationEvidence.some((item) => item.signal === "detail_page")).toBe(true);
  });

  it("does not turn the old Naver URL into a purchase offer", () => {
    const offers = getCommerceOffersForLegacyId("pl-polo-oxford");

    expect(offers.every((offer) => !isPurchaseEligibleOffer(offer))).toBe(true);
    expect(offers.some((offer) => offer.discoveryUrl?.includes("search.shopping.naver.com"))).toBe(true);
  });

  it("retains a detail offer for each K-beauty launch product", () => {
    for (const id of [
      "kb-anua-heartleaf-toner",
      "kb-medicube-booster-pro",
      "kb-cosrx-snail-96",
    ]) {
      const offer = getCommerceOffersForLegacyId(id).find(isPurchaseEligibleOffer);
      expect(offer?.canonicalProductId).toMatch(/^canonical:/);
      expect(offer?.detailUrl).toMatch(/^https:\/\//);
    }
  });

  it("maps legacy exactness deterministically without lifecycle leakage", () => {
    expect(mapLegacyExactnessToMatchState("exact")).toBe("exact");
    expect(mapLegacyExactnessToMatchState("similar")).toBe("similar");
    expect(mapLegacyExactnessToMatchState("unresolved")).toBe("unverified");
  });

  it("keeps every canonical match state representable by persisted post objects", () => {
    expect(POST_OBJECT_EXACTNESS_SQL_VALUES).toEqual(CANONICAL_MATCH_STATES);
  });
});
