import { describe, expect, it } from "vitest";
import { createSupabaseSocialInteractionRepository } from "../../lib/social-interactions";
import type { SocialInteractionRecord, SupabaseSocialClient } from "../../lib/social-interactions";

const now = new Date("2026-09-01T12:00:00.000Z");

const likeRecord = {
  command: {
    actorId: "00000000-0000-4000-8000-000000000001",
    kind: "like",
    targetId: "post-1",
    idempotencyKey: "like-once",
    occurredAt: now,
  },
  moderationState: "approved",
} satisfies SocialInteractionRecord;

describe("Supabase social interaction repository", () => {
  it("returns the persisted interaction shape when an idempotency key already exists", async () => {
    const repository = createSupabaseSocialInteractionRepository(clientWithRpcResult({
      data: persistedLikeRow(),
      error: null,
    }));

    const interaction = await repository.findByIdempotencyKey({
      actorId: likeRecord.command.actorId,
      idempotencyKey: likeRecord.command.idempotencyKey,
    });

    expect(interaction).toEqual({
      id: "10000000-0000-4000-8000-000000000001",
      actorId: likeRecord.command.actorId,
      operation: "like",
      targetId: "post-1",
      idempotencyKey: "like-once",
      moderationState: "approved",
      createdAt: "2026-09-01T12:00:00.000Z",
    });
  });

  it("rejects idempotency lookup RPC failures instead of allowing a duplicate write", async () => {
    const repository = createSupabaseSocialInteractionRepository(clientWithRpcResult({
      data: null,
      error: { message: "function public.get_social_interaction_by_idempotency_key does not exist" },
    }));

    await expect(repository.findByIdempotencyKey({
      actorId: likeRecord.command.actorId,
      idempotencyKey: likeRecord.command.idempotencyKey,
    })).rejects.toThrow("get_social_interaction_by_idempotency_key failed");
  });

  it("rejects record RPC failures instead of fabricating a recorded interaction", async () => {
    const repository = createSupabaseSocialInteractionRepository(clientWithRpcResult({
      data: null,
      error: { message: "function public.record_social_interaction does not exist" },
    }));

    await expect(repository.record(likeRecord)).rejects.toThrow("record_social_interaction failed");
  });

  it("rejects malformed record RPC rows instead of fabricating a recorded interaction", async () => {
    const repository = createSupabaseSocialInteractionRepository(clientWithRpcResult({
      data: { id: "10000000-0000-4000-8000-000000000001" },
      error: null,
    }));

    await expect(repository.record(likeRecord)).rejects.toThrow("returned an invalid row");
  });
});

function clientWithRpcResult(result: unknown): SupabaseSocialClient {
  return {
    rpc: () => result,
    maybeSingle: () => ({ data: null, error: null }),
  };
}

function persistedLikeRow(): unknown {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    actor_id: likeRecord.command.actorId,
    operation: "like",
    target_id: likeRecord.command.targetId,
    idempotency_key: likeRecord.command.idempotencyKey,
    moderation_state: likeRecord.moderationState,
    created_at: "2026-09-01T12:00:00.000Z",
  };
}
