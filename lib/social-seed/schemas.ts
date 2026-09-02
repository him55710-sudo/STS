import { z } from "zod";

export const SOCIAL_SEED_CATEGORIES = ["fashion", "beauty", "interior", "tech", "lifestyle"] as const;
export const SOCIAL_SEED_CONTENT_KINDS = ["photo", "carousel", "story", "lookbook"] as const;
export const SOCIAL_SEED_SOURCE_KINDS = ["demo_seed", "user_upload", "licensed_editorial", "brand_feed", "official_embed"] as const;
export const SOCIAL_SEED_RIGHTS_KINDS = ["user_owned", "licensed", "official_embed", "demo"] as const;

export const socialSeedDimensionsSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const socialSeedSourceSchema = z.strictObject({
  kind: z.enum(SOCIAL_SEED_SOURCE_KINDS),
  provider: z.string().min(1),
  identity: z.string().min(1),
  localPath: z.string().min(1),
  publicUrl: z.string().min(1),
  rightsBasis: z.string().min(1),
  canonicalUrl: z.string().min(1).nullable(),
});

export const socialSeedRightsSchema = z.strictObject({
  kind: z.enum(SOCIAL_SEED_RIGHTS_KINDS),
  status: z.literal("approved"),
  canDisplay: z.literal(true),
  canUseForCommerceMatching: z.literal(false),
  canRedistribute: z.literal(false),
  evidence: z.string().min(1),
  expiresAt: z.null(),
  territory: z.array(z.string().min(1)).readonly(),
});

export const socialSeedCreatorSchema = z.strictObject({
  id: z.string().min(1),
  displayName: z.string().min(1),
  handle: z.string().min(1),
  source: z.literal("deterministic_demo_persona"),
  rightsEvidence: z.string().min(1),
});

export const socialSeedAssetSchema = z.strictObject({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  kind: z.enum(["image", "video", "embed"]),
  url: z.string().min(1),
  localPath: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  dimensions: socialSeedDimensionsSchema,
  durationMs: z.number().int().positive().nullable(),
  poster: z.strictObject({
    url: z.string().min(1),
    dimensions: socialSeedDimensionsSchema,
  }).nullable(),
  tags: z.array(z.string().min(1)).readonly(),
});

export const socialSeedMediaSchema = z.strictObject({
  backing: z.enum(["local_image", "local_video"]),
  assets: z.array(socialSeedAssetSchema).min(1).readonly(),
});

export const socialSeedPurchaseSchema = z.discriminatedUnion("purchaseEligible", [
  z.strictObject({
    purchaseEligible: z.literal(false),
    verifiedCanonicalOffer: z.literal(false),
    canonicalOfferId: z.null(),
    note: z.string().min(1),
  }),
  z.strictObject({
    purchaseEligible: z.literal(true),
    verifiedCanonicalOffer: z.literal(true),
    canonicalOfferId: z.string().min(1),
    note: z.string().min(1),
  }),
]);

export const socialSeedEngagementSchema = z.strictObject({
  kind: z.literal("demo"),
  likes: z.literal(0),
  comments: z.literal(0),
  saves: z.literal(0),
  shares: z.literal(0),
});

export const socialSeedRecordSchema = z.strictObject({
  id: z.string().min(1),
  category: z.enum(SOCIAL_SEED_CATEGORIES),
  contentKind: z.enum(SOCIAL_SEED_CONTENT_KINDS),
  caption: z.string().min(1),
  source: socialSeedSourceSchema,
  rights: socialSeedRightsSchema,
  creator: socialSeedCreatorSchema,
  media: socialSeedMediaSchema,
  tags: z.array(z.string().min(1)).min(1).readonly(),
  purchase: socialSeedPurchaseSchema,
  engagement: socialSeedEngagementSchema,
});

export const socialSeedManifestSchema = z.strictObject({
  version: z.literal(1),
  generatedAt: z.literal("deterministic"),
  policy: z.strictObject({
    scraping: z.literal("none"),
    endorsements: z.literal("none"),
    commerceEligibility: z.literal("verified_canonical_offers_only"),
    engagement: z.literal("demo_zeroed"),
  }),
  constraints: z.strictObject({
    requiredMinimumRecords: z.literal(300),
    actualLocalImageAssetCount: z.number().int().nonnegative(),
    actualLocalVideoAssetCount: z.number().int().nonnegative(),
    videoBackedRecordCount: z.number().int().nonnegative(),
    videoLimitation: z.string().min(1),
  }),
  records: z.array(socialSeedRecordSchema).min(300).readonly(),
});

export type SocialSeedManifest = z.infer<typeof socialSeedManifestSchema>;
export type SocialSeedRecord = z.infer<typeof socialSeedRecordSchema>;
export type SocialSeedAsset = z.infer<typeof socialSeedAssetSchema>;
export type SocialSeedDimensions = z.infer<typeof socialSeedDimensionsSchema>;
