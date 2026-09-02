import { describe, expect, it } from "vitest";
import type { MatchState } from "../../lib/commerce/types";
import type { MediaObjectTag, SocialRights } from "../../lib/types";
import {
  demoSource,
  detailEvidence,
  displayOnlyMatchingBlockedRights,
  exactTag,
  expectReviewOnly,
  identityEvidence,
  licensedRights,
  offer,
  officialEmbedSource,
  resolveTagGate,
} from "./content-tag-gate-fixtures";

describe("social content tag commerce gate", () => {
  it("returns a /go offer destination when a licensed media tag resolves to a verified exact Oxford offer", () => {
    // Given
    const exactOffer = offer();

    // When
    const result = resolveTagGate({ offer: exactOffer });

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
    const result = resolveTagGate({ offer: greyOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("review");
  });

  it("keeps marketplace search URLs non-purchasable even with an affiliate URL", () => {
    // Given
    const searchUrl = "https://search.shopping.naver.com/search/all?query=oxford";

    // When
    const result = resolveTagGate({
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
    const result = resolveTagGate({
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
    const result = resolveTagGate({ rights: displayOnlyMatchingBlockedRights });

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
    const result = resolveTagGate({ rights: embedRights, sourceRecord: officialEmbedSource });

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
    const result = resolveTagGate({ rights: demoRights, sourceRecord: demoSource });

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
      const result = resolveTagGate({ tag });

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
    const result = resolveTagGate({ offer: staleOffer });

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
    const result = resolveTagGate({
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
    const result = resolveTagGate({ offer: affiliateOnlyOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
  });

  it("exposes an unverified state when the tag has no resolved offer", () => {
    // Given
    const unresolvedOffer = null;

    // When
    const result = resolveTagGate({ offer: unresolvedOffer });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("unverified" satisfies MatchState);
    expect(result.evidence).toEqual([]);
  });
});
