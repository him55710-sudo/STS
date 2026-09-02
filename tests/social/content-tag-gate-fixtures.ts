import { expect } from "vitest";
import { resolveSocialTagGate } from "../../lib/commerce/social-tag-gate";
import type { CommerceOffer, IdentityEvidence } from "../../lib/commerce/types";
import type { MediaObjectTag, SocialMediaAsset, SocialRights, SocialSourceRecord } from "../../lib/types";

export const detailUrl = "https://www.musinsa.com/products/3010383";
export const affiliateUrl = "https://sovrn.co?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383";

export const identityEvidence = {
  signal: "brand",
  value: "Polo Ralph Lauren catalog record",
  score: 1,
} satisfies IdentityEvidence;

export const detailEvidence = {
  signal: "detail_page",
  value: detailUrl,
  score: 1,
} satisfies IdentityEvidence;

export const licensedRights = {
  kind: "licensed",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: true,
  evidence: "license:partner-feed-2026-08",
  expiresAt: null,
} satisfies SocialRights;

export const displayOnlyMatchingBlockedRights = {
  ...licensedRights,
  canUseForCommerceMatching: false,
} satisfies SocialRights;

export const userUploadSource = {
  kind: "user_upload",
  provider: "local-upload",
  identity: "creator-1/post-1",
  canonicalUrl: null,
} satisfies SocialSourceRecord;

export const officialEmbedSource = {
  kind: "official_embed",
  provider: "instagram",
  identity: "instagram:p/official",
  canonicalUrl: "https://www.instagram.com/p/official/",
} satisfies SocialSourceRecord;

export const demoSource = {
  kind: "demo_seed",
  provider: "fixture",
  identity: "demo:post-1",
  canonicalUrl: null,
} satisfies SocialSourceRecord;

export const asset = {
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

export const exactTag = {
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

export function offer(overrides: Partial<CommerceOffer> = {}): CommerceOffer {
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

export function resolveTagGate(overrides: {
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

export function expectReviewOnly(result: ReturnType<typeof resolveTagGate>): void {
  expect(result.purchaseEligible).toBe(false);
  expect(result.destination).toBeNull();
}
