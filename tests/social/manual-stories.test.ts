import { describe, expect, it } from "vitest";
import { getActiveStoryRows } from "../../components/StoryRail";
import { getManualStoryIndex, REPOSITORY_STORIES, recordStoryViewOnce, resetStoryViewRecordsForTests } from "../../lib/stories";
import { getStoryPlaybackDurationMs, shouldAutoAdvanceStory } from "../../components/StoryViewer";
import { selectVideoPlaybackSource } from "../../lib/video-playback";
import type { StoryRailStory } from "../../components/StoryRail";
import type { SocialMediaAsset } from "../../lib/types";

describe("manual story navigation", () => {
  it("moves only after an explicit next or previous action", () => {
    // Given
    const storyCount = 5;

    // When
    const nextIndex = getManualStoryIndex({ currentIndex: 1, direction: "next", storyCount });
    const previousIndex = getManualStoryIndex({ currentIndex: 1, direction: "previous", storyCount });

    // Then
    expect(nextIndex).toBe(2);
    expect(previousIndex).toBe(0);
  });

  it("keeps the first and last story in place at the boundaries", () => {
    // Given
    const storyCount = 5;

    // When
    const beforeFirst = getManualStoryIndex({ currentIndex: 0, direction: "previous", storyCount });
    const afterLast = getManualStoryIndex({ currentIndex: 4, direction: "next", storyCount });

    // Then
    expect(beforeFirst).toBe(0);
    expect(afterLast).toBe(4);
  });

  it("returns only active repository stories and annotates seen state", () => {
    // Given
    const now = new Date("2026-09-02T12:00:00.000Z");
    const stories = [
      storyFixture({ id: "active-unseen", expiresAt: "2026-09-02T12:05:00.000Z" }),
      storyFixture({ id: "active-seen", seenAt: "2026-09-02T12:01:00.000Z", expiresAt: "2026-09-02T12:10:00.000Z" }),
      storyFixture({ id: "stored-seen", expiresAt: "2026-09-02T12:15:00.000Z" }),
      storyFixture({ id: "expired", expiresAt: "2026-09-02T11:59:59.000Z" }),
      storyFixture({ id: "scheduled", startsAt: "2026-09-02T12:01:00.000Z", expiresAt: "2026-09-02T12:20:00.000Z" }),
    ];

    // When
    const rows = getActiveStoryRows({ stories, now, seenStoryIds: new Set(["stored-seen"]) });

    // Then
    expect(rows.map((row) => [row.story.id, row.seen])).toEqual([
      ["active-unseen", false],
      ["active-seen", true],
      ["stored-seen", true],
    ]);
  });

  it("loads visible stories from the repository manifest instead of handwritten demo stories", () => {
    // Given
    const repositoryStories = REPOSITORY_STORIES;

    // When
    const storyIds = repositoryStories.map((story) => story.id);

    // Then
    expect(repositoryStories.length).toBeGreaterThan(0);
    expect(storyIds.every((id) => id.startsWith("social-seed-"))).toBe(true);
    expect(repositoryStories.every((story) => story.sourceRecord.provider === "sts-local-social-seed")).toBe(true);
    expect(repositoryStories.every((story) => story.assets[0]?.objectTags.length)).toBe(true);
  });

  it("records one story view per viewer session through the repository contract", () => {
    // Given
    resetStoryViewRecordsForTests();
    const now = new Date("2026-09-02T12:00:00.000Z");
    const first = { storyId: "story-1", viewerSessionId: "session-1", viewedAt: now };
    const second = { storyId: "story-1", viewerSessionId: "session-1", viewedAt: new Date("2026-09-02T12:01:00.000Z") };

    // When
    const firstRecord = recordStoryViewOnce(first);
    const secondRecord = recordStoryViewOnce(second);

    // Then
    expect(firstRecord).toEqual({ storyId: "story-1", viewerSessionId: "session-1", viewedAt: now.toISOString(), idempotent: false });
    expect(secondRecord).toEqual({ storyId: "story-1", viewerSessionId: "session-1", viewedAt: now.toISOString(), idempotent: true });
  });

  it("uses repository media timing and chooses native injected or poster playback paths honestly", () => {
    // Given
    const videoAsset = mediaAsset({
      kind: "video",
      durationMs: 9_000,
      manifest: { kind: "hls", url: "/media/story.m3u8" },
      url: "/media/story.mp4",
    });
    const imageAsset = mediaAsset({ kind: "image", durationMs: null, manifest: null, url: "/media/story.jpg" });

    // When
    const videoDuration = getStoryPlaybackDurationMs(videoAsset);
    const imageDuration = getStoryPlaybackDurationMs(imageAsset);
    const hlsSource = selectVideoPlaybackSource({ asset: videoAsset, canPlayNativeHls: true, injectedHlsSupported: false });
    const injectedSource = selectVideoPlaybackSource({ asset: videoAsset, canPlayNativeHls: false, injectedHlsSupported: true });
    const fallbackSource = selectVideoPlaybackSource({ asset: videoAsset, canPlayNativeHls: false, injectedHlsSupported: false });
    const imageSource = selectVideoPlaybackSource({ asset: imageAsset, canPlayNativeHls: false, injectedHlsSupported: false });

    // Then
    expect(videoDuration).toBe(9_000);
    expect(imageDuration).toBe(5_000);
    expect(hlsSource).toEqual({ kind: "native", src: "/media/story.m3u8" });
    expect(injectedSource).toEqual({ kind: "injected-hls", manifestUrl: "/media/story.m3u8", fallbackSrc: "/media/story.mp4" });
    expect(fallbackSource).toEqual({ kind: "native", src: "/media/story.mp4" });
    expect(imageSource).toEqual({ kind: "poster", posterUrl: "/media/story.jpg", reason: "image_asset" });
  });

  it("does not auto-advance timed stories when reduced motion is requested", () => {
    // Given
    const normalState = { paused: false, mediaErrored: false, reducedMotion: false };
    const reducedMotionState = { paused: false, mediaErrored: false, reducedMotion: true };

    // When
    const normalAutoAdvance = shouldAutoAdvanceStory(normalState);
    const reducedMotionAutoAdvance = shouldAutoAdvanceStory(reducedMotionState);

    // Then
    expect(normalAutoAdvance).toBe(true);
    expect(reducedMotionAutoAdvance).toBe(false);
  });
});

function storyFixture(
  overrides: Pick<StoryRailStory, "id"> & Partial<Pick<StoryRailStory, "startsAt" | "expiresAt" | "seenAt">>,
): StoryRailStory {
  return {
    id: overrides.id,
    storyGroupId: `group-${overrides.id}`,
    creatorId: "c-hana",
    creator: {
      id: "c-hana",
      handle: "hana.weekday",
      name: "한유나",
      bio: "test creator",
      followers: 0,
      category: "fashion",
      tone: "#5B556E",
    },
    image: "/looks/look1.jpg",
    contentKind: "story",
    assets: [mediaAsset({ kind: "image", durationMs: null, manifest: null, url: "/looks/look1.jpg" })],
    sourceRecord: {
      kind: "demo_seed",
      provider: "sts-demo",
      identity: `test/${overrides.id}`,
      canonicalUrl: null,
    },
    disclosure: { kind: "none", label: null },
    rights: {
      kind: "demo",
      status: "approved",
      canDisplay: true,
      canUseForCommerceMatching: false,
      evidence: "test fixture",
      expiresAt: null,
    },
    category: "fashion",
    title: overrides.id,
    subtitle: "test story",
    productCount: 1,
    postedLabel: "now",
    is_demo: true,
    source: "demo-seed",
    startsAt: overrides.startsAt ?? "2026-09-02T11:00:00.000Z",
    expiresAt: overrides.expiresAt ?? "2026-09-02T13:00:00.000Z",
    seenAt: overrides.seenAt ?? null,
  };
}

function mediaAsset(
  overrides: Pick<SocialMediaAsset, "kind" | "durationMs" | "manifest" | "url">,
): SocialMediaAsset {
  return {
    id: `asset-${overrides.kind}-${overrides.url}`,
    order: 0,
    kind: overrides.kind,
    url: overrides.url,
    dimensions: { width: 1080, height: 1920 },
    poster: { url: "/looks/look1.jpg", dimensions: { width: 1080, height: 1920 } },
    durationMs: overrides.durationMs,
    manifest: overrides.manifest,
    objectTags: [],
  };
}
