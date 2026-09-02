import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { discoverLocalSeedAssets, type LocalSeedAsset } from "./assets";
import {
  SOCIAL_SEED_CATEGORIES,
  SOCIAL_SEED_CONTENT_KINDS,
  socialSeedManifestSchema,
  type SocialSeedAsset,
  type SocialSeedManifest,
  type SocialSeedRecord,
} from "./schemas";

export { SOCIAL_SEED_CATEGORIES, socialSeedManifestSchema };

const RECORD_COUNT = 320;
const CREATOR_COUNT = 40;
const RIGHTS_EVIDENCE = "Existing local repository seed asset; demo-only use with no scraping, endorsement, or production commerce claim.";
const CREATOR_RIGHTS_EVIDENCE = "Deterministic fictional demo persona generated locally; not a real creator endorsement.";
const PURCHASE_NOTE = "Not purchase-eligible because this seed task does not introduce verified canonical catalog offers.";

const AESTHETICS = [
  "minimal",
  "daily-fit",
  "soft-contrast",
  "studio",
  "editorial-demo",
  "quiet-luxury",
  "utility",
  "warm-neutral",
] as const;

type AssetContext = {
  readonly recordId: string;
  readonly contentKind: (typeof SOCIAL_SEED_CONTENT_KINDS)[number];
  readonly images: readonly LocalSeedAsset[];
  readonly index: number;
};

export class SeedManifestGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedManifestGenerationError";
  }
}

export function buildSocialSeedManifest(projectRoot: string): SocialSeedManifest {
  const localAssets = discoverLocalSeedAssets(projectRoot);
  if (localAssets.images.length === 0) {
    throw new SeedManifestGenerationError("No local public/looks image assets were available for the social seed manifest.");
  }
  const records = Array.from({ length: RECORD_COUNT }, (_value, index) => recordFor(localAssets.images, index));
  return socialSeedManifestSchema.parse({
    version: 1,
    generatedAt: "deterministic",
    policy: {
      scraping: "none",
      endorsements: "none",
      commerceEligibility: "verified_canonical_offers_only",
      engagement: "demo_zeroed",
    },
    constraints: {
      requiredMinimumRecords: 300,
      actualLocalImageAssetCount: localAssets.images.length,
      actualLocalVideoAssetCount: localAssets.videos.length,
      videoBackedRecordCount: 0,
      videoLimitation: videoLimitation(localAssets.videos.length),
    },
    records,
  });
}

export function writeSocialSeedManifest(projectRoot: string, outputPath = join(projectRoot, "data", "social", "seed-manifest.json")): SocialSeedManifest {
  const manifest = buildSocialSeedManifest(projectRoot);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function recordFor(images: readonly LocalSeedAsset[], index: number): SocialSeedRecord {
  const category = pick(SOCIAL_SEED_CATEGORIES, index);
  const contentKind = pick(SOCIAL_SEED_CONTENT_KINDS, index);
  const creatorIndex = index % CREATOR_COUNT;
  const recordId = `social-seed-${category}-${padded(index + 1, 3)}`;
  const assets = assetsFor({ recordId, contentKind, images, index });
  return {
    id: recordId,
    category,
    contentKind,
    caption: captionFor(category, contentKind, index),
    source: {
      kind: "demo_seed",
      provider: "sts-local-social-seed",
      identity: `demo_seed:sts-local-social-seed:${recordId}`,
      localPath: assets[0].localPath,
      publicUrl: assets[0].url,
      rightsBasis: RIGHTS_EVIDENCE,
      canonicalUrl: null,
    },
    rights: {
      kind: "demo",
      status: "approved",
      canDisplay: true,
      canUseForCommerceMatching: false,
      canRedistribute: false,
      evidence: RIGHTS_EVIDENCE,
      expiresAt: null,
      territory: ["KR", "US"],
    },
    creator: creatorFor(creatorIndex),
    media: { backing: "local_image", assets },
    tags: tagsFor(category, contentKind, index),
    purchase: {
      purchaseEligible: false,
      verifiedCanonicalOffer: false,
      canonicalOfferId: null,
      note: PURCHASE_NOTE,
    },
    engagement: {
      kind: "demo",
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
    },
  };
}

function assetsFor(context: AssetContext): readonly SocialSeedAsset[] {
  const first = imageAsset(context.recordId, pick(context.images, context.index), 0);
  if (context.contentKind !== "carousel") return [first];
  return [first, imageAsset(context.recordId, pick(context.images, context.index + 17), 1)];
}

function imageAsset(recordId: string, image: LocalSeedAsset, order: number): SocialSeedAsset {
  return {
    id: `${recordId}-asset-${padded(order + 1, 2)}`,
    order,
    kind: "image",
    url: image.publicUrl,
    localPath: image.localPath,
    sha256: image.sha256,
    dimensions: image.dimensions,
    durationMs: null,
    poster: null,
    tags: ["local-asset", "demo", `asset-order-${order}`],
  };
}

function creatorFor(index: number): SocialSeedRecord["creator"] {
  const ordinal = padded(index + 1, 2);
  return {
    id: `social-seed-creator-${ordinal}`,
    displayName: `STS Seed Creator ${ordinal}`,
    handle: `@sts_seed_${ordinal}`,
    source: "deterministic_demo_persona",
    rightsEvidence: CREATOR_RIGHTS_EVIDENCE,
  };
}

function captionFor(category: string, contentKind: string, index: number): string {
  return `Demo ${category} ${contentKind} seed ${padded(index + 1, 3)} built from local project assets.`;
}

function tagsFor(category: string, contentKind: string, index: number): readonly string[] {
  return [category, contentKind, pick(AESTHETICS, index), "rights-aware", "demo-engagement"];
}

function videoLimitation(videoCount: number): string {
  if (videoCount >= 40) return `Actual local video assets discovered: ${videoCount}; reel-backed records can be expanded from verified local video inputs.`;
  return `Actual local video assets discovered: ${videoCount}; fewer than 40 were available, so this deterministic seed keeps remaining records non-video.`;
}

function pick<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length];
  if (value === undefined) throw new SeedManifestGenerationError("Cannot pick from an empty deterministic seed list.");
  return value;
}

function padded(value: number, width: number): string {
  return String(value).padStart(width, "0");
}
