import { describe, expect, it } from "vitest";
import {
  displayableAssetsForPost,
  resolveCarouselSlide,
  tagsForAsset,
} from "../../components/MixedMediaFeed";
import { contentKindFixtures, imageAsset } from "./content-contract.fixtures";

describe("mixed feed carousel tags", () => {
  it("uses only the active slide tags for object overlays", () => {
    // Given
    const carousel = {
      ...contentKindFixtures[1],
      assets: [
        { ...imageAsset("slide-one", 0, "/social/carousel-1.jpg"), objectTags: [] },
        imageAsset("slide-two", 1, "/social/carousel-2.jpg"),
      ],
    };

    // When
    const firstSlide = resolveCarouselSlide(carousel, 0);
    const secondSlide = resolveCarouselSlide(carousel, 1);

    // Then
    expect(firstSlide?.tags).toEqual([]);
    expect(secondSlide?.tags.map((tag) => [tag.id, tag.ownerAssetId])).toEqual([
      ["tag-slide-two", "slide-two"],
    ]);
  });

  it("skips blocked carousel media before slide and tag selection", () => {
    // Given
    const carousel = {
      ...contentKindFixtures[1],
      assets: [
        imageAsset("ready-slide", 0, "/social/carousel-1.jpg"),
        { ...imageAsset("blocked-slide", 1, "/social/carousel-2.jpg"), processingState: "blocked" as const },
      ],
    };

    // When
    const assets = displayableAssetsForPost(carousel);
    const firstSlide = resolveCarouselSlide(carousel, 0);
    const blockedTags = tagsForAsset(carousel, "blocked-slide");

    // Then
    expect(assets.map((asset) => asset.id)).toEqual(["ready-slide"]);
    expect(firstSlide?.asset.id).toBe("ready-slide");
    expect(blockedTags).toEqual([]);
  });
});
