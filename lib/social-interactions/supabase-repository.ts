import { z } from "zod";
import type {
  ExistingInteractionRequest,
  PersistedSocialInteraction,
  RepostDraftRequest,
  SocialInteractionRecord,
  SocialInteractionRepository,
  SocialRepostDraft,
} from "./types";

type SelectSingleRequest = {
  readonly table: string;
  readonly columns: string;
  readonly column: string;
  readonly value: string;
};
type RpcClient = {
  readonly rpc: (name: string, args: Record<string, string>) => unknown;
};
export type SupabaseSocialClient = RpcClient & {
  readonly maybeSingle: (request: SelectSingleRequest) => unknown;
};

const contentRightsSchema = z.strictObject({
  rights_status: z.enum(["pending", "approved", "rejected", "expired", "takedown"]),
  expires_at: z.string().nullable(),
  takedown_at: z.string().nullable(),
  can_display: z.boolean(),
  can_use_for_commerce_matching: z.boolean(),
  can_redistribute: z.boolean().optional(),
});

const contentSourceSchema = z.strictObject({
  source_kind: z.enum(["user_upload", "licensed_editorial", "brand_feed", "official_embed", "demo_seed"]).optional(),
});

const postRowSchema = z.strictObject({
  id: z.string(),
  creator_id: z.string(),
  visibility: z.enum(["public", "private", "unlisted"]),
  publish_state: z.enum(["draft", "scheduled", "published", "archived"]),
  display_state: z.enum(["pending", "approved", "blocked"]),
  published_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  content_rights: z.union([contentRightsSchema, z.array(contentRightsSchema)]).nullable(),
  content_sources: z.union([contentSourceSchema, z.array(contentSourceSchema)]).nullable().optional(),
});

const interactionRowSchema = z.strictObject({
  id: z.string(),
  actor_id: z.string(),
  operation: z.enum(["like", "save", "follow", "comment", "share", "view", "repost"]),
  target_id: z.string(),
  idempotency_key: z.string(),
  moderation_state: z.enum(["pending", "approved", "blocked"]),
  created_at: z.string(),
});

type PersistedRpcRequest = {
  readonly row: z.infer<typeof interactionRowSchema>;
};

const queryResultSchema = z.strictObject({
  data: z.unknown(),
  error: z.union([z.object({ message: z.string().optional() }).passthrough(), z.null()]),
});

export function createSupabaseSocialInteractionRepository(client: SupabaseSocialClient): SocialInteractionRepository {
  return {
    async findByIdempotencyKey(request: ExistingInteractionRequest) {
      const result = queryResultSchema.parse(await client.rpc("get_social_interaction_by_idempotency_key", {
        p_actor_id: request.actorId,
        p_idempotency_key: request.idempotencyKey,
      }));
      if (result.error) throw new SocialInteractionPersistenceError("get_social_interaction_by_idempotency_key", result.error.message);
      if (result.data === null) return null;
      const parsed = interactionRowSchema.safeParse(result.data);
      if (!parsed.success) {
        throw new SocialInteractionPersistenceError("get_social_interaction_by_idempotency_key", "returned an invalid row");
      }
      return persistedFromRpc({ row: parsed.data });
    },
    async findContentTarget(postId: string) {
      const result = queryResultSchema.parse(await client.maybeSingle({
        table: "posts",
        columns: "id, creator_id, visibility, publish_state, display_state, published_at, expires_at, content_sources(source_kind), content_rights(rights_status, expires_at, takedown_at, can_display, can_use_for_commerce_matching, can_redistribute)",
        column: "id",
        value: postId,
      }));
      if (result.error || result.data === null) return null;
      const parsed = postRowSchema.safeParse(result.data);
      if (!parsed.success) return null;
      const rights = first(parsed.data.content_rights);
      if (!rights) return null;
      const source = first(parsed.data.content_sources ?? null);
      return {
        id: parsed.data.id,
        creatorId: parsed.data.creator_id,
        visibility: parsed.data.visibility,
        publishState: parsed.data.publish_state,
        displayState: parsed.data.display_state,
        publishedAt: parsed.data.published_at,
        expiresAt: parsed.data.expires_at,
        rightsStatus: rights.rights_status,
        rightsExpiresAt: rights.expires_at,
        canDisplay: rights.can_display,
        canUseForCommerceMatching: rights.can_use_for_commerce_matching,
        takedownAt: rights.takedown_at,
        sourceKind: source?.source_kind,
        canRedistribute: rights.can_redistribute,
      };
    },
    async findCreatorTarget(creatorId: string) {
      const result = queryResultSchema.parse(await client.maybeSingle({
        table: "profiles",
        columns: "id",
        column: "id",
        value: creatorId,
      }));
      return result.error || result.data === null ? null : creatorId;
    },
    async findRepostDraft(request: RepostDraftRequest): Promise<SocialRepostDraft | null> {
      const original = await this.findContentTarget(request.originalPostId);
      const repost = await this.findContentTarget(request.repostPostId);
      if (!original || !repost) return null;
      return { originalPostId: request.originalPostId, original, repost, canRedistribute: original.canRedistribute === true };
    },
    async record(record: SocialInteractionRecord) {
      const result = queryResultSchema.parse(await client.rpc("record_social_interaction", {
        p_actor_id: record.command.actorId,
        p_operation: record.command.kind,
        p_target_id: record.command.targetId,
        p_idempotency_key: record.command.idempotencyKey,
        p_moderation_state: record.moderationState,
      }));
      const parsed = interactionRowSchema.safeParse(result.data);
      if (result.error || !parsed.success) {
        throw new SocialInteractionPersistenceError(
          "record_social_interaction",
          result.error?.message ?? "returned an invalid row",
        );
      }
      return persistedFromRpc({ row: parsed.data });
    },
  };
}

function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function persistedFromRpc(request: PersistedRpcRequest): PersistedSocialInteraction {
  return {
    id: request.row.id,
    actorId: request.row.actor_id,
    operation: request.row.operation,
    targetId: request.row.target_id,
    idempotencyKey: request.row.idempotency_key,
    moderationState: request.row.moderation_state,
    createdAt: request.row.created_at,
  };
}

class SocialInteractionPersistenceError extends Error {
  readonly name = "SocialInteractionPersistenceError";

  constructor(
    readonly operationName: string,
    readonly detail: string = "unknown persistence error",
  ) {
    super(`${operationName} failed: ${detail}`);
  }
}
