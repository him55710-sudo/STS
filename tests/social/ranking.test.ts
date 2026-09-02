import { describe, expect, it } from "vitest";
import { rankSocialFeed } from "../../lib/social-ranking";
import type { SocialRankPost } from "../../lib/social-ranking";

const now = new Date("2026-09-01T12:00:00.000Z");
const basePost = {
  creatorId: "creator-a",
  visibility: "public",
  publishState: "published",
  displayState: "approved",
  publishedAt: "2026-09-01T11:00:00.000Z",
  expiresAt: null,
  rightsStatus: "approved",
  rightsExpiresAt: null,
  canDisplay: true,
  canUseForCommerceMatching: true,
  takedownAt: null,
  category: "fashion",
  sourceKind: "user_upload",
  sourceQuality: { trustScore: 0.8, attributionComplete: true },
} satisfies Omit<SocialRankPost, "id">;

describe("social ranking", () => {
  it("ranks from real event inputs instead of static engagement counters", () => {
    const ranked = rankSocialFeed({
      viewerId: "viewer-1",
      mode: "for_you",
      now,
      follows: [],
      events: [
        { kind: "view", actorId: "viewer-1", postId: "post-low", occurredAt: "2026-09-01T11:59:00.000Z", value: 1 },
        { kind: "save", actorId: "viewer-1", postId: "post-high", occurredAt: "2026-09-01T11:59:00.000Z", value: 1 },
        { kind: "comment", actorId: "viewer-1", postId: "post-high", occurredAt: "2026-09-01T11:58:00.000Z", value: 1 },
      ],
      posts: [
        { ...basePost, id: "post-low" },
        { ...basePost, id: "post-high", creatorId: "creator-b" },
      ],
    });

    expect(ranked.map((item) => item.post.id)).toEqual(["post-high", "post-low"]);
  });

  it("filters private, takedown, expired-rights, and unattributed licensed posts", () => {
    const ranked = rankSocialFeed({
      viewerId: "viewer-1",
      mode: "for_you",
      now,
      follows: [],
      events: [],
      posts: [
        { ...basePost, id: "visible" },
        { ...basePost, id: "private", visibility: "private" },
        { ...basePost, id: "takedown", takedownAt: "2026-09-01T09:00:00.000Z" },
        { ...basePost, id: "expired-rights", rightsExpiresAt: "2026-08-31T09:00:00.000Z" },
        { ...basePost, id: "unattributed", sourceKind: "licensed_editorial", sourceQuality: { trustScore: 0.9, attributionComplete: false } },
      ],
    });

    expect(ranked.map((item) => item.post.id)).toEqual(["visible"]);
  });

  it("uses Following mode and diversity to avoid one creator filling the feed", () => {
    const ranked = rankSocialFeed({
      viewerId: "viewer-1",
      mode: "following",
      now,
      follows: [{ followerId: "viewer-1", creatorId: "creator-a" }, { followerId: "viewer-1", creatorId: "creator-b" }],
      events: [
        { kind: "like", actorId: "viewer-1", postId: "a-1", occurredAt: "2026-09-01T11:59:00.000Z", value: 10 },
        { kind: "like", actorId: "viewer-1", postId: "a-2", occurredAt: "2026-09-01T11:58:00.000Z", value: 10 },
        { kind: "like", actorId: "viewer-1", postId: "b-1", occurredAt: "2026-09-01T11:57:00.000Z", value: 4 },
      ],
      posts: [
        { ...basePost, id: "a-1", creatorId: "creator-a" },
        { ...basePost, id: "a-2", creatorId: "creator-a" },
        { ...basePost, id: "b-1", creatorId: "creator-b" },
        { ...basePost, id: "outside-following", creatorId: "creator-c" },
      ],
    });

    expect(ranked.map((item) => item.post.id)).toEqual(["a-1", "b-1", "a-2"]);
  });
});
