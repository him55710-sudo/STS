import { describe, expect, it } from "vitest";
import { createInMemorySocialInteractionRepository, createInMemorySocialRateLimiter, recordSocialInteraction } from "../../lib/social-interactions";
import type { SocialContentRow } from "../../lib/social-repository";

const now = new Date("2026-09-01T12:00:00.000Z");
const publicPost = {
  id: "post-1",
  creatorId: "creator-1",
  visibility: "public",
  publishState: "published",
  displayState: "approved",
  publishedAt: "2026-09-01T10:00:00.000Z",
  expiresAt: null,
  rightsStatus: "approved",
  rightsExpiresAt: null,
  canDisplay: true,
  canUseForCommerceMatching: true,
  takedownAt: null,
  sourceKind: "user_upload",
} satisfies SocialContentRow;

describe("social interactions", () => {
  it("returns the existing interaction when the same authenticated command is replayed", async () => {
    const repository = createInMemorySocialInteractionRepository({ posts: [publicPost], creators: ["creator-1"] });
    const limiter = createInMemorySocialRateLimiter({ maxEvents: 1, windowMs: 60_000 });

    const first = await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "like", targetId: "post-1", idempotencyKey: "like-once", occurredAt: now },
      repository,
      limiter,
      moderation: { reviewComment: () => ({ state: "approved" }) },
    });
    const replay = await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "like", targetId: "post-1", idempotencyKey: "like-once", occurredAt: now },
      repository,
      limiter,
      moderation: { reviewComment: () => ({ state: "approved" }) },
    });

    expect(first.kind).toBe("recorded");
    expect(replay).toMatchObject({ kind: "recorded", idempotent: true, interaction: { operation: "like" } });
    expect(repository.listInteractions()).toHaveLength(1);
  });

  it("applies rate limits only to new operations", async () => {
    const repository = createInMemorySocialInteractionRepository({ posts: [publicPost], creators: ["creator-1"] });
    const limiter = createInMemorySocialRateLimiter({ maxEvents: 1, windowMs: 60_000 });

    await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "save", targetId: "post-1", idempotencyKey: "save-a", occurredAt: now },
      repository,
      limiter,
      moderation: { reviewComment: () => ({ state: "approved" }) },
    });
    const second = await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "share", targetId: "post-1", idempotencyKey: "share-a", occurredAt: now },
      repository,
      limiter,
      moderation: { reviewComment: () => ({ state: "approved" }) },
    });

    expect(second).toMatchObject({ kind: "rate_limited", retryAfterMs: 60_000 });
    expect(repository.listInteractions()).toHaveLength(1);
  });

  it("blocks comments on private or taken-down posts before moderation", async () => {
    const privatePost = { ...publicPost, id: "private-post", visibility: "private" } satisfies SocialContentRow;
    const repository = createInMemorySocialInteractionRepository({ posts: [privatePost], creators: ["creator-1"] });
    const moderation = { reviewComment: () => ({ state: "approved" as const }) };

    const result = await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "comment", targetId: "private-post", idempotencyKey: "comment-a", occurredAt: now, commentText: "Nice find" },
      repository,
      limiter: createInMemorySocialRateLimiter({ maxEvents: 10, windowMs: 60_000 }),
      moderation,
    });

    expect(result).toMatchObject({ kind: "denied", reason: "target_unavailable" });
    expect(repository.listInteractions()).toHaveLength(0);
  });

  it("requires attribution and redistribution rights for reposts", async () => {
    const original = { ...publicPost, id: "original-post", creatorId: "creator-1" } satisfies SocialContentRow;
    const repostDraft = { ...publicPost, id: "draft-repost", creatorId: "viewer-1", visibility: "private", publishState: "draft", publishedAt: null } satisfies SocialContentRow;
    const repository = createInMemorySocialInteractionRepository({
      posts: [original],
      creators: ["creator-1"],
      repostDrafts: [{ originalPostId: "original-post", original, repost: repostDraft, canRedistribute: false }],
    });

    const result = await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "repost", targetId: "original-post", idempotencyKey: "repost-a", occurredAt: now, repostPostId: "draft-repost" },
      repository,
      limiter: createInMemorySocialRateLimiter({ maxEvents: 10, windowMs: 60_000 }),
      moderation: { reviewComment: () => ({ state: "approved" }) },
    });

    expect(result).toMatchObject({ kind: "denied", reason: "redistribution_not_allowed" });
    expect(repository.listInteractions()).toHaveLength(0);
  });

  it("requires attribution for reposts with redistribution rights", async () => {
    const original = { ...publicPost, id: "redistributable-original", creatorId: "creator-1" } satisfies SocialContentRow;
    const repostDraft = { ...publicPost, id: "redistributable-draft", creatorId: "viewer-1", visibility: "private", publishState: "draft", publishedAt: null } satisfies SocialContentRow;
    const repository = createInMemorySocialInteractionRepository({
      posts: [original],
      creators: ["creator-1"],
      repostDrafts: [{ originalPostId: "redistributable-original", original, repost: repostDraft, canRedistribute: true }],
    });

    const result = await recordSocialInteraction({
      command: { actorId: "viewer-1", kind: "repost", targetId: "redistributable-original", idempotencyKey: "repost-without-attribution", occurredAt: now, repostPostId: "redistributable-draft" },
      repository,
      limiter: createInMemorySocialRateLimiter({ maxEvents: 10, windowMs: 60_000 }),
      moderation: { reviewComment: () => ({ state: "approved" }) },
    });

    expect(result).toMatchObject({ kind: "denied", reason: "attribution_required" });
    expect(repository.listInteractions()).toHaveLength(0);
  });
});
