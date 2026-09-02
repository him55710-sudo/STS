import type {
  SocialInteractionCommand,
  SocialInteractionRepository,
  SocialInteractionResult,
  SocialModerationHook,
  SocialRateLimiter,
} from "./types";
import { commentDenial, reactionDenial, repostDenial } from "./policy";

type RecordSocialInteractionRequest = {
  readonly command: SocialInteractionCommand;
  readonly repository: SocialInteractionRepository;
  readonly limiter: SocialRateLimiter;
  readonly moderation: SocialModerationHook;
};

export async function recordSocialInteraction(request: RecordSocialInteractionRequest): Promise<SocialInteractionResult> {
  if (!request.command.actorId.trim()) return { kind: "denied", reason: "authentication_required" };

  const existing = await request.repository.findByIdempotencyKey({
    actorId: request.command.actorId,
    idempotencyKey: request.command.idempotencyKey,
  });
  if (existing) return { kind: "recorded", interaction: existing, idempotent: true };

  const rateLimit = request.limiter.check({
    actorId: request.command.actorId,
    kind: request.command.kind,
    now: request.command.occurredAt,
  });
  if (rateLimit.kind === "limited") return { kind: "rate_limited", retryAfterMs: rateLimit.retryAfterMs };

  switch (request.command.kind) {
    case "follow":
      return recordFollow(request);
    case "comment":
      return recordComment(request);
    case "repost":
      return recordRepost(request);
    case "like":
    case "save":
    case "share":
    case "view":
      return recordPublicPostInteraction(request);
    default:
      return assertNever(request.command.kind);
  }
}

async function recordPublicPostInteraction(request: RecordSocialInteractionRequest): Promise<SocialInteractionResult> {
  const target = await request.repository.findContentTarget(request.command.targetId);
  if (!target) return { kind: "denied", reason: "target_unavailable" };
  const denial = reactionDenial(request.command, target);
  if (denial) return { kind: "denied", reason: denial };
  const interaction = await request.repository.record({ command: request.command, moderationState: "approved" });
  return { kind: "recorded", interaction, idempotent: false };
}

async function recordFollow(request: RecordSocialInteractionRequest): Promise<SocialInteractionResult> {
  if (request.command.actorId === request.command.targetId) return { kind: "denied", reason: "self_follow" };
  const creatorId = await request.repository.findCreatorTarget(request.command.targetId);
  if (!creatorId) return { kind: "denied", reason: "creator_unavailable" };
  const interaction = await request.repository.record({ command: request.command, moderationState: "approved" });
  return { kind: "recorded", interaction, idempotent: false };
}

async function recordComment(request: RecordSocialInteractionRequest): Promise<SocialInteractionResult> {
  const text = request.command.commentText?.trim();
  if (!text) return { kind: "rejected", reason: "invalid_comment" };
  const target = await request.repository.findContentTarget(request.command.targetId);
  if (!target) return { kind: "denied", reason: "target_unavailable" };
  const denial = commentDenial(request.command, target);
  if (denial) return { kind: "denied", reason: denial };
  const reviewed = request.moderation.reviewComment({ actorId: request.command.actorId, postId: target.id, text });
  if (reviewed.state === "blocked") return { kind: "rejected", reason: "moderation_blocked" };
  const interaction = await request.repository.record({ command: { ...request.command, commentText: text }, moderationState: reviewed.state });
  return { kind: "recorded", interaction, idempotent: false };
}

async function recordRepost(request: RecordSocialInteractionRequest): Promise<SocialInteractionResult> {
  const draft = request.command.repostPostId
    ? await request.repository.findRepostDraft({
        actorId: request.command.actorId,
        originalPostId: request.command.targetId,
        repostPostId: request.command.repostPostId,
      })
    : null;
  const denial = repostDenial(request.command, draft);
  if (denial) return { kind: "denied", reason: denial };
  const interaction = await request.repository.record({ command: request.command, moderationState: "pending" });
  return { kind: "recorded", interaction, idempotent: false };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled social interaction kind: ${JSON.stringify(value)}`);
}
