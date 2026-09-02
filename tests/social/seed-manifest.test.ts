import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSocialSeedManifest } from "../../lib/social-seed/generator";
import { socialSeedManifestSchema, socialSeedPurchaseSchema } from "../../lib/social-seed/schemas";

const manifestPath = join(process.cwd(), "data", "social", "seed-manifest.json");
const requiredManifestCategories = ["fashion", "beauty", "interior", "tech", "lifestyle"] as const;

describe("deterministic rights-aware social seed manifest", () => {
  it("builds a deterministic 300+ record manifest with rights and creator metadata", () => {
    // Given
    const firstManifest = buildSocialSeedManifest(process.cwd());

    // When
    const secondManifest = buildSocialSeedManifest(process.cwd());
    const recordIds = firstManifest.records.map((record) => record.id);
    const contentKinds = new Set(firstManifest.records.map((record) => record.contentKind));
    const creatorIds = new Set(firstManifest.records.map((record) => record.creator.id));
    const everyRecordHasMetadata = firstManifest.records.every((record) =>
      record.source.provider.length > 0
        && record.source.identity.length > 0
        && record.rights.evidence.length > 0
        && record.creator.displayName.length > 0
        && record.media.assets.length > 0
        && record.tags.length > 0
    );

    // Then
    expect(secondManifest).toEqual(firstManifest);
    expect(firstManifest.records.length).toBeGreaterThanOrEqual(300);
    expect(new Set(recordIds).size).toBe(recordIds.length);
    expect(contentKinds.size).toBeGreaterThanOrEqual(4);
    expect(creatorIds.size).toBeGreaterThanOrEqual(30);
    expect(everyRecordHasMetadata).toBe(true);
  });

  it("covers every required category in the manifest data", () => {
    // Given
    const manifest = buildSocialSeedManifest(process.cwd());

    // When
    const categories = manifest.records.map((record) => record.category);
    const categoryCounts = new Map(requiredManifestCategories.map((category) => [category, 0]));
    for (const category of categories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    // Then
    expect([...new Set(categories)].sort()).toEqual([...requiredManifestCategories].sort());
    expect([...categoryCounts.values()].every((count) => count > 0)).toBe(true);
  });

  it("keeps video-backed counts honest when no local video assets exist", () => {
    // Given
    const manifest = buildSocialSeedManifest(process.cwd());

    // When
    const videoBackedRecords = manifest.records.filter((record) =>
      record.media.assets.some((asset) => asset.kind === "video")
    );

    // Then
    expect(manifest.constraints.actualLocalVideoAssetCount).toBe(0);
    expect(videoBackedRecords).toHaveLength(0);
    expect(manifest.constraints.videoLimitation).toContain("Actual local video assets discovered: 0");
  });

  it("prevents fabricated commerce and engagement claims", () => {
    // Given
    const manifest = buildSocialSeedManifest(process.cwd());

    // When
    const purchaseEligibleRecords = manifest.records.filter((record) => record.purchase.purchaseEligible);
    const allEngagementIsDemo = manifest.records.every((record) =>
      record.engagement.kind === "demo"
        && record.engagement.likes === 0
        && record.engagement.comments === 0
        && record.engagement.saves === 0
        && record.engagement.shares === 0
    );

    // Then
    expect(purchaseEligibleRecords.every((record) => record.purchase.verifiedCanonicalOffer === true)).toBe(true);
    expect(purchaseEligibleRecords).toHaveLength(0);
    expect(allEngagementIsDemo).toBe(true);
  });

  it("rejects purchase eligibility without verified canonical offer fields", () => {
    // Given
    const manifest = buildSocialSeedManifest(process.cwd());

    // When
    const purchaseResult = socialSeedPurchaseSchema.safeParse({
      purchaseEligible: true,
      verifiedCanonicalOffer: false,
      canonicalOfferId: null,
      note: "invalid purchase claim",
    });
    const manifestResult = socialSeedManifestSchema.safeParse({
      ...manifest,
      records: manifest.records.map((record, index) =>
        index === 0
          ? {
              ...record,
              purchase: {
                purchaseEligible: true,
                verifiedCanonicalOffer: false,
                canonicalOfferId: null,
                note: "invalid purchase claim",
              },
            }
          : record
      ),
    });

    // Then
    expect(purchaseResult.success).toBe(false);
    expect(manifestResult.success).toBe(false);
  });

  it("accepts purchase eligibility with verified canonical offer fields", () => {
    // Given
    const verifiedPurchase = {
      purchaseEligible: true,
      verifiedCanonicalOffer: true,
      canonicalOfferId: "canonical-offer-001",
      note: "Purchase eligible because a verified canonical offer id is attached.",
    };

    // When
    const result = socialSeedPurchaseSchema.safeParse(verifiedPurchase);

    // Then
    expect(result.success).toBe(true);
  });

  it("writes the same schema-valid manifest the generator builds", () => {
    // Given
    const manifest = buildSocialSeedManifest(process.cwd());

    // When
    const fileManifest = existsSync(manifestPath)
      ? socialSeedManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")))
      : null;

    // Then
    expect(fileManifest).not.toBeNull();
    expect(fileManifest).toEqual(manifest);
  });
});
