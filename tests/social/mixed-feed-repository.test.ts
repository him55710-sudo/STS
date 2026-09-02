import { describe, expect, it } from "vitest";
import { repositoryRowsToPosts } from "../../components/MixedMediaRepository";
import { resolveCarouselSlide } from "../../components/MixedMediaFeed";

describe("mixed feed repository conversion", () => {
  it("preserves distinct object ownership when repository rows contain multiple assets", () => {
    // Given
    const repositoryRows = [
      {
        id: "repository-carousel",
        creator_id: "creator-1",
        creator_key: "creator-one",
        caption: "Two-slide repository carousel",
        category: "fashion",
        content_kind: "carousel",
        published_at: "2026-09-01T00:00:00.000Z",
        created_at: "2026-08-31T00:00:00.000Z",
        disclosure: "none",
        is_demo: false,
        content_sources: {
          source_kind: "user_upload",
          provider: "sts",
          canonical_url: null,
          external_id: "post-1",
        },
        content_rights: {
          rights_status: "approved",
          license_scope: "user_owned",
          can_display: true,
          can_use_for_commerce_matching: true,
          can_redistribute: false,
          rights_evidence_url: null,
          expires_at: null,
        },
        media_assets: [
          {
            id: "asset-slide-one",
            asset_order: 0,
            media_kind: "photo",
            public_url: "/social/slide-one.jpg",
            width: 1080,
            height: 1080,
            processing_state: "ready",
          },
          {
            id: "asset-slide-two",
            asset_order: 1,
            media_kind: "photo",
            public_url: "/social/slide-two.jpg",
            width: 1080,
            height: 1080,
            processing_state: "ready",
          },
        ],
        post_objects: [
          {
            id: "object-slide-one",
            media_asset_id: "asset-slide-one",
            product_id: "product-slide-one",
            label: "slide one jacket",
            geometry: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
            exactness: "exact",
            confidence: "0.91",
          },
          {
            id: "object-slide-two",
            media_asset_id: "asset-slide-two",
            product_id: "product-slide-two",
            label: "slide two bag",
            geometry: { x: 0.6, y: 0.2, w: 0.2, h: 0.3 },
            exactness: "exact",
            confidence: "0.94",
          },
        ],
      },
    ];

    // When
    const posts = repositoryRowsToPosts(repositoryRows);
    const post = posts?.[0];
    const firstSlide = post ? resolveCarouselSlide(post, 0) : null;
    const secondSlide = post ? resolveCarouselSlide(post, 1) : null;

    // Then
    expect(posts).toHaveLength(1);
    expect(post?.objects.map((tag) => [tag.id, tag.ownerAssetId])).toEqual([
      ["object-slide-one", "asset-slide-one"],
      ["object-slide-two", "asset-slide-two"],
    ]);
    expect(firstSlide?.tags.map((tag) => [tag.id, tag.ownerAssetId, tag.productId])).toEqual([
      ["object-slide-one", "asset-slide-one", "product-slide-one"],
    ]);
    expect(secondSlide?.tags.map((tag) => [tag.id, tag.ownerAssetId, tag.productId])).toEqual([
      ["object-slide-two", "asset-slide-two", "product-slide-two"],
    ]);
  });
});
