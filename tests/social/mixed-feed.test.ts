import { describe, expect, it } from "vitest";
import {
  displayableAssetsForPost,
  getFeedModeFromSearchParams,
  resolveMediaFrame,
  selectFeedPosts,
  type FeedContentSource,
} from "../../components/MixedMediaFeed";
import type { Post, SocialMediaAsset } from "../../lib/types";
import { contentKindFixtures } from "./content-contract.fixtures";

const mixedPosts = contentKindFixtures.filter((post) => post.contentKind !== "story");

function source(overrides: Partial<FeedContentSource>): FeedContentSource {
  return {
    mode: "repository",
    repositoryPosts: [],
    fixturePosts: [],
    localPosts: [],
    hydrated: true,
    now: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("mixed social feed selection", () => {
  it("uses repository-backed content in normal mode without falling back to fixtures", () => {
    // Given
    const fixtureOnly = contentKindFixtures[0];
    const repositoryVideo = contentKindFixtures[3];

    // When
    const selected = selectFeedPosts(
      source({
        mode: "repository",
        repositoryPosts: [repositoryVideo],
        fixturePosts: [fixtureOnly],
      }),
      "foryou",
      [],
    );

    // Then
    expect(selected.map((post) => post.id)).toEqual([repositoryVideo.id]);
  });

  it("renders deterministic fixture-mode coverage for photo carousel reel video and lookbook", () => {
    // Given
    const fixtureSource = source({
      mode: "fixture",
      fixturePosts: mixedPosts,
    });

    // When
    const selected = selectFeedPosts(fixtureSource, "foryou", []);
    const contentKinds = selected.map((post) => post.contentKind);
    const frameKinds = selected.map((post) => resolveMediaFrame(displayableAssetsForPost(post)[0], post).kind);

    // Then
    expect(contentKinds).toEqual(["photo", "carousel", "reel", "video", "lookbook"]);
    expect(frameKinds).toEqual(["image", "image", "video", "video", "image"]);
  });

  it("keeps following selection on existing interactions without inventing engagement", () => {
    // Given
    const localPost = {
      ...contentKindFixtures[0],
      id: "owned-post",
      creatorId: "creator-me",
      likes: 12,
      createdAt: "2026-08-27T00:00:00+09:00",
      isUserPost: true as const,
    };
    const repositoryPost = {
      ...contentKindFixtures[1],
      creatorId: "creator-followed",
      likes: 34,
      createdAt: "2026-08-28T00:00:00+09:00",
    };
    const hiddenPost = { ...contentKindFixtures[4], creatorId: "creator-other", likes: 56 };

    // When
    const selected = selectFeedPosts(
      source({
        mode: "repository",
        repositoryPosts: [hiddenPost, repositoryPost],
        localPosts: [localPost],
      }),
      "following",
      ["creator-followed"],
    );

    // Then
    expect(selected.map((post) => [post.id, post.likes])).toEqual([
      [repositoryPost.id, 34],
      [localPost.id, 12],
    ]);
  });

  it("maps URL fixture mode explicitly and defaults to repository mode", () => {
    // Given
    const fixtureParams = new URLSearchParams("fixture=1");
    const productionParams = new URLSearchParams("");

    // When
    const fixtureMode = getFeedModeFromSearchParams(fixtureParams);
    const productionMode = getFeedModeFromSearchParams(productionParams);

    // Then
    expect(fixtureMode).toBe("fixture");
    expect(productionMode).toBe("repository");
  });

  it("resolves failed media to an intentional fallback frame", () => {
    // Given
    const failedAsset: SocialMediaAsset & { readonly processingState: "failed" } = {
      ...contentKindFixtures[2].assets[0],
      processingState: "failed",
    };
    const post: Post = {
      ...contentKindFixtures[2],
      assets: [failedAsset],
    };

    // When
    const frame = resolveMediaFrame(failedAsset, post);
    const displayableAssets = displayableAssetsForPost(post);

    // Then
    expect(frame).toMatchObject({ kind: "fallback", label: "미디어를 표시할 수 없어요" });
    expect(displayableAssets).toEqual([]);
  });
});
