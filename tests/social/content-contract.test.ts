import { describe, expect, it } from "vitest";
import { CONTENT_KINDS, type ContentKind } from "../../lib/types";
import { DEMO_CREATORS, DEMO_POSTS, normalizeSocialContent } from "../../lib/social-content";
import { REPOSITORY_STORIES } from "../../lib/stories";
import { approvedRights, contentKindFixtures, disclosure, imageAsset, sourceRecord, validReel } from "./content-contract.fixtures";
import type { Post } from "../../lib/types";

function assertNever(value: never): never {
  throw new Error(`Unhandled content kind: ${value}`);
}

function assetCountFor(post: Post): number {
  switch (post.contentKind) {
    case undefined:
      return 0;
    case "photo":
    case "carousel":
    case "reel":
    case "video":
    case "story":
    case "lookbook":
      return post.assets.length;
    default:
      return assertNever(post);
  }
}

describe("social content contract baseline", () => {
  it("accepts compile-time-friendly fixtures for every content kind", () => {
    // Given
    const coveredKinds = contentKindFixtures.map((post) => post.contentKind);

    // When
    const normalized = contentKindFixtures.map((post) => normalizeSocialContent(post));
    const assetCounts = contentKindFixtures.map(assetCountFor);
    const assetTagsOwnTheirAsset = contentKindFixtures.every((post) =>
      post.assets.every((asset) => asset.objectTags.every((tag) => tag.ownerAssetId === asset.id))
    );

    // Then
    expect(CONTENT_KINDS.every((kind: ContentKind) => coveredKinds.includes(kind))).toBe(true);
    expect(normalized.every((result) => result.ok)).toBe(true);
    expect(assetCounts).toEqual([1, 2, 1, 1, 1, 1]);
    expect(assetTagsOwnTheirAsset).toBe(true);
  });

  it("characterizes the current demo fixture provenance before migration", () => {
    // Given
    const posts = DEMO_POSTS;
    const creators = DEMO_CREATORS;
    const stories = REPOSITORY_STORIES;

    // When
    const demoPostMetadata = posts.map((post) => ({ is_demo: post.is_demo, source: post.source }));
    const demoCreatorMetadata = creators.map((creator) => ({ is_demo: creator.is_demo, source: creator.source }));
    const demoStoryMetadata = stories.map((story) => ({ is_demo: story.is_demo, source: story.source }));
    const creatorIdSet = new Set(creators.map((creator) => creator.id));

    // Then
    expect(demoPostMetadata.every((metadata) => metadata.is_demo === true && metadata.source === "demo-seed")).toBe(true);
    expect(demoCreatorMetadata.every((metadata) => metadata.is_demo === true && metadata.source === "demo-seed")).toBe(true);
    expect(demoStoryMetadata.every((metadata) => metadata.is_demo === true && metadata.source === "demo-seed")).toBe(true);
    expect(stories.every((story) => creatorIdSet.has(story.creatorId) || story.sourceRecord.provider === "sts-local-social-seed")).toBe(true);
    expect(posts.every((post) => post.image.length > 0)).toBe(true);
  });

  it("characterizes legacy Post image reads during migration", () => {
    // Given
    const legacyPost: Post = {
      id: "legacy-post",
      creatorId: "legacy-creator",
      image: "/legacy/post-image.jpg",
      ratio: 0.75,
      caption: "legacy content",
      category: "fashion",
      likes: 0,
      objects: [],
      createdAt: "2026-08-28T00:00:00+09:00",
    };

    // When
    const imageRead = legacyPost.image;

    // Then
    expect(imageRead).toBe("/legacy/post-image.jpg");
    expect(assetCountFor(legacyPost)).toBe(0);
  });

  it("rejects an invalid content kind", () => {
    // Given
    const invalidContent = {
      ...validReel,
      contentKind: "livestream",
    };

    // When
    const result = normalizeSocialContent(invalidContent);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "invalid_content_kind", path: ["contentKind"] })
    );
  });

  it("rejects a reel when source identity and rights are missing", () => {
    // Given
    const { sourceRecord: _sourceRecord, rights: _rights, ...reelWithoutProvenance } = validReel;

    // When
    const result = normalizeSocialContent(reelWithoutProvenance);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["missing_source_identity", "missing_rights"])
    );
  });

  it("rejects a reel when disclosure is missing", () => {
    // Given
    const { disclosure: _disclosure, ...reelWithoutDisclosure } = validReel;

    // When
    const result = normalizeSocialContent(reelWithoutDisclosure);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "missing_disclosure", path: ["disclosure"] })
    );
  });

  it("rejects a reel when disclosure kind is invalid", () => {
    // Given
    const reelWithInvalidDisclosure = {
      ...validReel,
      disclosure: {
        ...disclosure,
        kind: "gifted",
      },
    };

    // When
    const result = normalizeSocialContent(reelWithInvalidDisclosure);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "invalid_disclosure_kind", path: ["disclosure", "kind"] })
    );
  });

  it("rejects malformed normalized media geometry", () => {
    // Given
    const firstAsset = validReel.assets[0];
    const malformedReel = {
      ...validReel,
      assets: [
        {
          ...firstAsset,
          objectTags: [{ ...firstAsset.objectTags[0], x: 0.9, w: 0.2 }],
        },
      ],
    };

    // When
    const result = normalizeSocialContent(malformedReel);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "malformed_normalized_geometry" })
    );
  });

  it("rejects malformed source and rights records with structured error codes", () => {
    // Given
    const malformedReel = {
      ...validReel,
      sourceRecord: {
        ...sourceRecord,
        kind: "scraped_copy",
        provider: " ",
        identity: "",
      },
      rights: {
        ...approvedRights,
        kind: "unknown_license",
        status: "unknown",
        canDisplay: "yes",
      },
    };

    // When
    const result = normalizeSocialContent(malformedReel);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "invalid_source_kind",
        "missing_source_provider",
        "missing_source_identity",
        "invalid_rights_kind",
        "invalid_rights_status",
        "missing_rights_permission",
      ])
    );
  });

  it("rejects malformed assets with stable paths", () => {
    // Given
    const malformedReel = {
      ...validReel,
      assets: [
        {
          ...validReel.assets[0],
          id: "",
          order: 1,
          kind: "audio",
          url: "",
          dimensions: { width: Number.POSITIVE_INFINITY, height: 0 },
        },
        {
          ...validReel.assets[0],
          id: "",
          order: 1.5,
          kind: "video",
        },
      ],
    };

    // When
    const result = normalizeSocialContent(malformedReel);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_asset_id", path: ["assets", 0, "id"] }),
        expect.objectContaining({ code: "invalid_asset_order", path: ["assets", 0, "order"] }),
        expect.objectContaining({ code: "invalid_asset_kind", path: ["assets", 0, "kind"] }),
        expect.objectContaining({ code: "invalid_asset_url", path: ["assets", 0, "url"] }),
        expect.objectContaining({ code: "invalid_asset_dimensions", path: ["assets", 0, "dimensions"] }),
        expect.objectContaining({ code: "duplicate_asset_id", path: ["assets", 1, "id"] }),
        expect.objectContaining({ code: "invalid_asset_order", path: ["assets", 1, "order"] }),
      ])
    );
  });

  it("rejects content-kind asset invariants", () => {
    // Given
    const carouselWithOneAsset = {
      ...contentKindFixtures[1],
      assets: [contentKindFixtures[1].assets[0]],
    };
    const reelWithoutVideo = {
      ...validReel,
      assets: [imageAsset("asset-reel-image", 0, "/social/reel-image.jpg")],
    };

    // When
    const carouselResult = normalizeSocialContent(carouselWithOneAsset);
    const reelResult = normalizeSocialContent(reelWithoutVideo);

    // Then
    expect(carouselResult.ok).toBe(false);
    if (!carouselResult.ok) {
      expect(carouselResult.errors).toContainEqual(
        expect.objectContaining({ code: "missing_carousel_assets", path: ["assets"] })
      );
    }
    expect(reelResult.ok).toBe(false);
    if (!reelResult.ok) {
      expect(reelResult.errors).toContainEqual(
        expect.objectContaining({ code: "missing_video_asset", path: ["assets"] })
      );
    }
  });

  it("rejects object tags not owned by their asset", () => {
    // Given
    const firstAsset = validReel.assets[0];
    const malformedReel = {
      ...validReel,
      assets: [
        {
          ...firstAsset,
          objectTags: [{ ...firstAsset.objectTags[0], ownerAssetId: "asset-other" }],
        },
      ],
    };

    // When
    const result = normalizeSocialContent(malformedReel);

    // Then
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "mismatched_tag_owner_asset_id",
        path: ["assets", 0, "objectTags", 0, "ownerAssetId"],
      })
    );
  });
});
