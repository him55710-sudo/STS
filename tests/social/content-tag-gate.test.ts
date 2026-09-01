import { describe, expect, it } from "vitest";
import { resolveSocialTagGate } from "../../lib/commerce/social-tag-gate";
import type { CommerceOffer, IdentityEvidence, MatchState } from "../../lib/commerce/types";
import type { MediaObjectTag, SocialMediaAsset, SocialRights, SocialSourceRecord } from "../../lib/types";

const detailUrl = "https://www.musinsa.com/products/3010383";
const affiliateUrl = "https://sovrn.co?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383";

const identityEvidence = {
  signal: "brand",
  value: "Polo Ralph Lauren catalog record",
  score: 1,
} satisfies IdentityEvidence;

const detailEvidence = {
  signal: "detail_page",
  value: detailUrl,
  score: 1,
} satisfies IdentityEvidence;

const licensedRights = {
  kind: "licensed",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: true,
  evidence: "license:partner-feed-2026-08",
  expiresAt: null,
} satisfies SocialRights;

const displayOnlyMatchingBlockedRights = {
  ...licensedRights,
  canUseForCommerceMatching: false,
} satisfies SocialRights;

const userUploadSource = {
  kind: "user_upload",
  provider: "local-upload",
  identity: "creator-1/post-1",
  canonicalUrl: null,
} satisfies SocialSourceRecord;

const officialEmbedSource = {
  kind: "official_embed",
  provider: "instagram",
  identity: "instagram:p/official",
  canonicalUrl: "https://www.instagram.com/p/official/",
} satisfies SocialSourceRecord;

const demoSource = {
  kind: "demo_seed",
  provider: "fixture",
  identity: "demo:post-1",
  canonicalUrl: null,
} satisfies SocialSourceRecord;

const asset = {
  id: "asset-blue-oxford-1",
  order: 0,
  kind: "image",
  url: "/social/blue-oxford.jpg",
  dimensions: { width: 1080, height: 1080 },
  poster: null,
  durationMs: null,
  manifest: null,
  objectTags: [],
} satisfies SocialMediaAsset;

const exactTag = {
  id: "tag-blue-oxford",
  ownerAssetId: "asset-blue-oxford-1",
  label: "blue oxford shirt",
  x: 0.1,
  y: 0.1,
  w: 0.4,
  h: 0.5,
  productId: "plw-polo-oxford",
  exactness: "exact",
  confidence: 0.96,
} satisfies MediaObjectTag;

function offer(overrides: Partial<CommerceOffer> = {}): CommerceOffer {
  return {
    id: "offer:catalog:plw-polo-oxford",
    canonicalProductId: "canonical:polo-ralph-lauren:classic-fit-oxford:sky-blue",
    provider: "direct",
    providerProductId: "plw-polo-oxford",
    sourceIdentity: { source: "direct", sourceProductId: "plw-polo-oxford" },
    merchant: "무신사",
    title: "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue",
    detailUrl,
    discoveryUrl: null,
    affiliateUrl,
    imageUrl: "/looks/plw-polo-oxford.jpg",
    imageVariants: [{ kind: "primary", url: "/looks/plw-polo-oxford.jpg" }],
    price: 199000,
    currency: "KRW",
    shippingPrice: null,
    availability: "in_stock",
    stock: { status: "in_stock", quantity: null },
    commissionRate: 0.07,
    matchState: "exact",
    offerLifecycle: "active",
    freshness: {
      observedAt: "2026-08-27T00:00:00.000Z",
      staleAfter: null,
    },
    identityScore: 1,
    evidence: [identityEvidence, detailEvidence],
    verificationEvidence: [detailEvidence],
    detailPageVerified: true,
    ...overrides,
  };
}

function resolve(overrides: {
  readonly rights?: SocialRights;
  readonly sourceRecord?: SocialSourceRecord;
  readonly tag?: MediaObjectTag;
  readonly offer?: CommerceOffer | null;
} = {}) {
  return resolveSocialTagGate({
    asset,
    tag: overrides.tag ?? exactTag,
    rights: overrides.rights ?? licensedRights,
    sourceRecord: overrides.sourceRecord ?? userUploadSource,
    offer: overrides.offer === undefined ? offer() : overrides.offer,
    context: { postId: "post-1", creatorId: "creator-1", objectId: "tag-blue-oxford" },
  });
}

function expectReviewOnly(result: ReturnType<typeof resolve>): void {
  expect(result.purchaseEligible).toBe(false);
  expect(result.destination).toBeNull();
}

describe("social content tag commerce gate", () => {
  it("returns a /go offer destination when a licensed media tag resolves to a verified exact Oxford offer", () => {
    // Given
    const exactOffer = offer();

    // When
    const result = resolve({ offer: exactOffer });

    // Then
    expect(result.purchaseEligible).toBe(true);
    expect(result.destination?.startsWith("/go/offer/offer%3Acatalog%3Aplw-polo-oxford?")).toBe(true);
    expect(result.destination).toContain("postId=post-1");
    expect(result.destination).toContain("objectId=tag-blue-oxford");
    expect(result.destination).toContain("creatorId=creator-1");
    expect(result.matchState).toBe("exact");
    expect(result.confidence).toBe(0.96);
    expect(result.evidence.map((item) => item.signal)).toContain("brand");
  });

  it("keeps a wrong color and brand candidate review-only without a /go destination", () => {
    // Given
    const greyOffer = offer({
      id: "offer:catalog:grey-blazer",
      title: "Different Brand Grey Blazer",
      matchState: "review",
      identityScore: 0.2,
      evidence: [{ signal: "conflict", value: "color conflict", score: 1 }],
    });

    // When
    const result = resolve({ offer: greyOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("review");
  });

  it("keeps marketplace search URLs non-purchasable even with an affiliate URL", () => {
    // Given
    const searchUrl = "https://search.shopping.naver.com/search/all?query=oxford";

    // When
    const result = resolve({
      offer: offer({
        detailUrl: searchUrl,
        discoveryUrl: searchUrl,
        affiliateUrl: `https://sovrn.co?u=${encodeURIComponent(searchUrl)}`,
      }),
    });

    // Then
    expectReviewOnly(result);
    expect(result.cta.kind).toBe("review_only");
  });

  it("keeps malformed direct detail URLs non-purchasable even with an affiliate URL", () => {
    // Given
    const malformedUrl = "not-a-direct-product-url";

    // When
    const result = resolve({
      offer: offer({
        detailUrl: malformedUrl,
        affiliateUrl: `https://sovrn.co?u=${encodeURIComponent(malformedUrl)}`,
      }),
    });

    // Then
    expectReviewOnly(result);
    expect(result.cta.kind).toBe("review_only");
  });

  it("requires rights.canUseForCommerceMatching while keeping match evidence and confidence visible", () => {
    // When
    const result = resolve({ rights: displayOnlyMatchingBlockedRights });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
    expect(result.evidence).toEqual([identityEvidence, detailEvidence]);
    expect(result.confidence).toBe(0.96);
  });

  it("keeps official display-only embeds non-purchasable", () => {
    // Given
    const embedRights = {
      kind: "official_embed",
      status: "approved",
      canDisplay: true,
      canUseForCommerceMatching: true,
      evidence: "instagram:oembed",
      expiresAt: null,
    } satisfies SocialRights;

    // When
    const result = resolve({ rights: embedRights, sourceRecord: officialEmbedSource });

    // Then
    expectReviewOnly(result);
    expect(result.reason).toContain("display-only");
  });

  it("keeps demo seeded media non-purchasable even with an exact verified offer", () => {
    // Given
    const demoRights = {
      kind: "demo",
      status: "approved",
      canDisplay: true,
      canUseForCommerceMatching: true,
      evidence: "fixture:demo-social-content",
      expiresAt: null,
    } satisfies SocialRights;

    // When
    const result = resolve({ rights: demoRights, sourceRecord: demoSource });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
    expect(result.reason).toContain("display-only");
  });

  it.each([
    { name: "owned by a different media asset", tag: { ...exactTag, ownerAssetId: "asset-other" }, reason: "not owned" },
    { name: "outside the media asset", tag: { ...exactTag, x: 0.72, w: 0.4 }, reason: "geometry" },
  ] satisfies readonly { readonly name: string; readonly tag: MediaObjectTag; readonly reason: string }[])(
    "blocks purchase eligibility when a tag is $name",
    ({ tag, reason }) => {
      const result = resolve({ tag });

      // Then
      expectReviewOnly(result);
      expect(result.matchState).toBe("exact");
      expect(result.reason).toContain(reason);
    },
  );

  it("keeps stale exact offers non-purchasable while preserving exact match evidence", () => {
    // Given
    const staleOffer = offer({ offerLifecycle: "stale" });

    // When
    const result = resolve({ offer: staleOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
    expect(result.evidence).toHaveLength(2);
  });

  it("does not promote visual similarity or creator-claimed exactness into a purchase CTA", () => {
    // Given
    const creatorClaimedExactTag = {
      ...exactTag,
      exactness: "exact",
      confidence: 0.99,
    } satisfies MediaObjectTag;

    // When
    const result = resolve({
      tag: creatorClaimedExactTag,
      offer: offer({
        matchState: "similar",
        identityScore: 0.74,
        evidence: [{ signal: "image", value: "visual similarity only", score: 0.92 }],
        verificationEvidence: [detailEvidence],
      }),
    });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("similar");
    expect(result.confidence).toBe(0.99);
  });

  it("keeps affiliate-only offers non-purchasable", () => {
    // Given
    const affiliateOnlyOffer = offer({
      sourceIdentity: null,
      detailPageVerified: false,
      detailUrl: null,
      verificationEvidence: [],
    });

    // When
    const result = resolve({ offer: affiliateOnlyOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
  });

  it("exposes an unverified state when the tag has no resolved offer", () => {
    // Given
    const unresolvedOffer = null;

    // When
    const result = resolve({ offer: unresolvedOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("unverified" satisfies MatchState);
    expect(result.evidence).toEqual([]);
  });
});
