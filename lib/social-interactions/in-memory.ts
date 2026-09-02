import type {
  ExistingInteractionRequest,
  PersistedSocialInteraction,
  RepostDraftRequest,
  SocialInteractionRecord,
  SocialInteractionRepository,
  SocialRateLimitRequest,
  SocialRateLimiter,
  SocialRepostDraft,
  SocialInteractionContentTarget,
} from "./types";

type InMemoryRepositorySeed = {
  readonly posts: readonly SocialInteractionContentTarget[];
  readonly creators: readonly string[];
  readonly repostDrafts?: readonly SocialRepostDraft[];
};

type RateLimiterConfig = {
  readonly maxEvents: number;
  readonly windowMs: number;
};

export function createInMemorySocialInteractionRepository(seed: InMemoryRepositorySeed): SocialInteractionRepository & {
  readonly listInteractions: () => readonly PersistedSocialInteraction[];
} {
  const posts = new Map(seed.posts.map((post) => [post.id, post]));
  const creators = new Set(seed.creators);
  const repostDrafts = new Map((seed.repostDrafts ?? []).map((draft) => [repostDraftKey({
    actorId: draft.repost.creatorId,
    originalPostId: draft.originalPostId,
    repostPostId: draft.repost.id,
  }), draft]));
  const interactions: PersistedSocialInteraction[] = [];

  return {
    async findByIdempotencyKey(request: ExistingInteractionRequest) {
      return interactions.find((interaction) => interaction.actorId === request.actorId && interaction.idempotencyKey === request.idempotencyKey) ?? null;
    },
    async findContentTarget(postId: string) {
      return posts.get(postId) ?? null;
    },
    async findCreatorTarget(creatorId: string) {
      return creators.has(creatorId) ? creatorId : null;
    },
    async findRepostDraft(request: RepostDraftRequest) {
      return repostDrafts.get(repostDraftKey(request)) ?? null;
    },
    async record(record: SocialInteractionRecord) {
      const interaction = {
        id: `interaction-${interactions.length + 1}`,
        actorId: record.command.actorId,
        operation: record.command.kind,
        targetId: record.command.targetId,
        idempotencyKey: record.command.idempotencyKey,
        moderationState: record.moderationState,
        createdAt: record.command.occurredAt.toISOString(),
      } satisfies PersistedSocialInteraction;
      interactions.push(interaction);
      return interaction;
    },
    listInteractions() {
      return interactions;
    },
  };
}

export function createInMemorySocialRateLimiter(config: RateLimiterConfig): SocialRateLimiter {
  const buckets = new Map<string, number[]>();
  return {
    check(request: SocialRateLimitRequest) {
      const key = request.actorId;
      const nowMs = request.now.getTime();
      const cutoff = nowMs - config.windowMs;
      const recentEvents = (buckets.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
      if (recentEvents.length >= config.maxEvents) {
        return { kind: "limited", retryAfterMs: recentEvents[0] + config.windowMs - nowMs };
      }
      buckets.set(key, [...recentEvents, nowMs]);
      return { kind: "allowed" };
    },
  };
}

function repostDraftKey(request: RepostDraftRequest): string {
  return `${request.actorId}:${request.originalPostId}:${request.repostPostId}`;
}
