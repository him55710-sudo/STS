import type { SocialContentRow } from "@/lib/social-repository";

export const SOCIAL_INTERACTION_KINDS = ["like", "save", "follow", "comment", "share", "view", "repost"] as const;
export type SocialInteractionKind = (typeof SOCIAL_INTERACTION_KINDS)[number];

export type SocialModerationState = "pending" | "approved" | "blocked";

export type SocialInteractionCommand = {
  readonly actorId: string;
  readonly kind: SocialInteractionKind;
  readonly targetId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: Date;
  readonly commentText?: string;
  readonly shareChannel?: string;
  readonly repostPostId?: string;
  readonly attribution?: string;
};

export type SocialInteractionContentTarget = SocialContentRow & {
  readonly canRedistribute?: boolean;
  readonly attributionRequired?: boolean;
  readonly attributionSource?: string;
};

export type SocialRepostDraft = {
  readonly originalPostId: string;
  readonly original: SocialContentRow;
  readonly repost: SocialContentRow;
  readonly canRedistribute: boolean;
};

export type PersistedSocialInteraction = {
  readonly id: string;
  readonly actorId: string;
  readonly operation: SocialInteractionKind;
  readonly targetId: string;
  readonly idempotencyKey: string;
  readonly moderationState: SocialModerationState;
  readonly createdAt: string;
};

export type SocialInteractionResult =
  | { readonly kind: "recorded"; readonly interaction: PersistedSocialInteraction; readonly idempotent: boolean }
  | { readonly kind: "denied"; readonly reason: SocialInteractionDenialReason }
  | { readonly kind: "rate_limited"; readonly retryAfterMs: number }
  | { readonly kind: "rejected"; readonly reason: "invalid_comment" | "moderation_blocked" };

export type SocialInteractionDenialReason =
  | "authentication_required"
  | "target_unavailable"
  | "creator_unavailable"
  | "self_follow"
  | "repost_draft_unavailable"
  | "redistribution_not_allowed"
  | "attribution_required";

export type ExistingInteractionRequest = {
  readonly actorId: string;
  readonly idempotencyKey: string;
};

export type RepostDraftRequest = {
  readonly actorId: string;
  readonly originalPostId: string;
  readonly repostPostId: string;
};

export type SocialInteractionRecord = {
  readonly command: SocialInteractionCommand;
  readonly moderationState: SocialModerationState;
};

export interface SocialInteractionRepository {
  findByIdempotencyKey(request: ExistingInteractionRequest): Promise<PersistedSocialInteraction | null>;
  findContentTarget(postId: string): Promise<SocialInteractionContentTarget | null>;
  findCreatorTarget(creatorId: string): Promise<string | null>;
  findRepostDraft(request: RepostDraftRequest): Promise<SocialRepostDraft | null>;
  record(record: SocialInteractionRecord): Promise<PersistedSocialInteraction>;
}

export type SocialRateLimitRequest = {
  readonly actorId: string;
  readonly kind: SocialInteractionKind;
  readonly now: Date;
};

export type SocialRateLimitResult =
  | { readonly kind: "allowed" }
  | { readonly kind: "limited"; readonly retryAfterMs: number };

export interface SocialRateLimiter {
  check(request: SocialRateLimitRequest): SocialRateLimitResult;
}

export type SocialCommentModerationRequest = {
  readonly actorId: string;
  readonly postId: string;
  readonly text: string;
};

export type SocialCommentModerationResult = {
  readonly state: SocialModerationState;
};

export interface SocialModerationHook {
  reviewComment(request: SocialCommentModerationRequest): SocialCommentModerationResult;
}
