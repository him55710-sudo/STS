import { describe, expect, it } from "vitest";
import {
  REELS,
  getExactReelPurchaseTarget,
  type ReelItem,
} from "../../app/reels/reel-data";
import { selectVideoPlaybackSource } from "../../lib/video-playback";
import type { MediaObjectTag, SocialMediaAsset } from "../../lib/types";

describe("repository reels", () => {
  it("shows a commerce CTA only for exact verified purchase targets", () => {
    // Given
    const exactReel = reelFixture(exactTag("plw-polo-oxford"));
    const reviewOnlyReel = reelFixture({ ...exactTag("plw-polo-oxford"), exactness: "review" });
    const unverifiedReel = reelFixture(exactTag("pl-polo-oxford"));

    // When
    const previousFixtureMode = process.env.CATALOG_E2E_FIXTURES;
    process.env.CATALOG_E2E_FIXTURES = "1";
    const exactTarget = getExactReelPurchaseTarget(exactReel);
    const reviewTarget = getExactReelPurchaseTarget(reviewOnlyReel);
    const unverifiedTarget = getExactReelPurchaseTarget(unverifiedReel);
    process.env.CATALOG_E2E_FIXTURES = previousFixtureMode;

    // Then
    expect(exactTarget?.href).toContain("/go/offer/");
    expect(exactTarget?.productName).toBe("클래식 핏 옥스포드 셔츠 스카이 블루");
    expect(reviewTarget).toBeNull();
    expect(unverifiedTarget).toBeNull();
  });

  it("builds repository reels from real local media without synthesized video paths", () => {
    // Given
    const reels = REELS;

    // When
    const mediaUrls = reels.map((reel) => reel.media.url);

    // Then
    expect(reels.length).toBeGreaterThan(0);
    expect(mediaUrls.every((url) => url.startsWith("/looks/"))).toBe(true);
    expect(mediaUrls.every((url) => !url.startsWith("/reels/"))).toBe(true);
    expect(reels.every((reel) => reel.disclosure.length > 0 && reel.attribution.length > 0 && reel.rights.length > 0)).toBe(true);
    expect(reels.every((reel) => reel.objects.length > 0)).toBe(true);
  });

  it("prefers HLS only through the native or injected playback adapter", () => {
    // Given
    const asset = videoAsset("/reels/native.mp4", "/reels/native.m3u8");

    // When
    const nativeSource = selectVideoPlaybackSource({ asset, canPlayNativeHls: true, injectedHlsSupported: false });
    const injectedSource = selectVideoPlaybackSource({ asset, canPlayNativeHls: false, injectedHlsSupported: true });
    const fallbackSource = selectVideoPlaybackSource({ asset, canPlayNativeHls: false, injectedHlsSupported: false });

    // Then
    expect(nativeSource).toEqual({ kind: "native", src: "/reels/native.m3u8" });
    expect(injectedSource).toEqual({ kind: "injected-hls", manifestUrl: "/reels/native.m3u8", fallbackSrc: "/reels/native.mp4" });
    expect(fallbackSource).toEqual({ kind: "native", src: "/reels/native.mp4" });
  });
});

function exactTag(productId: string): MediaObjectTag {
  return {
    id: `tag-${productId}`,
    ownerAssetId: "asset-/reels/native.mp4",
    label: "옥스포드 셔츠",
    x: 0.2,
    y: 0.2,
    w: 0.4,
    h: 0.3,
    productId,
    exactness: "exact",
    confidence: 0.96,
  };
}

function reelFixture(tag: MediaObjectTag): ReelItem {
  return {
    id: `reel-${tag.id}`,
    creatorId: "c-nari",
    caption: "로컬 룩에서 시작한 세로형 쇼핑 릴",
    title: "오늘의 셔츠",
    media: videoAsset("/reels/native.mp4", "/reels/native.m3u8"),
    objects: [tag],
    likes: 1200,
    sourceLabel: "repository",
    disclosure: "Demo fixture",
    attribution: "test · reel",
    rights: "test rights",
  };
}

function videoAsset(url: string, hlsUrl: string): SocialMediaAsset {
  return {
    id: `asset-${url}`,
    order: 0,
    kind: "video",
    url,
    dimensions: { width: 1080, height: 1920 },
    poster: { url: "/looks/look1.jpg", dimensions: { width: 1080, height: 1920 } },
    durationMs: 8_000,
    manifest: { kind: "hls", url: hlsUrl },
    objectTags: [],
  };
}
