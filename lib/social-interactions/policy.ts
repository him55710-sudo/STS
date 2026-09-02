import { canWriteSocialChild, type SocialActor } from "@/lib/social-repository";
import type { SocialInteractionCommand, SocialInteractionContentTarget, SocialInteractionDenialReason, SocialRepostDraft } from "./types";

export function interactionActor(actorId: string): SocialActor {
  return { kind: "user", userId: actorId };
}

export function commentDenial(command: SocialInteractionCommand, target: SocialInteractionContentTarget): SocialInteractionDenialReason | null {
  if (!canWriteSocialChild(interactionActor(command.actorId), { kind: "comment", parent: target, authorId: command.actorId, moderationState: "pending" }, command.occurredAt)) {
    return "target_unavailable";
  }
  return null;
}

export function reactionDenial(command: SocialInteractionCommand, target: SocialInteractionContentTarget): SocialInteractionDenialReason | null {
  if (!canWriteSocialChild(interactionActor(command.actorId), { kind: "reaction", parent: target, actorId: command.actorId }, command.occurredAt)) {
    return "target_unavailable";
  }
  return null;
}

export function repostDenial(command: SocialInteractionCommand, draft: SocialRepostDraft | null): SocialInteractionDenialReason | null {
  if (!command.repostPostId) return "repost_draft_unavailable";
  if (!draft) return "repost_draft_unavailable";
  if (!draft.canRedistribute) return "redistribution_not_allowed";
  if (!command.attribution?.trim()) return "attribution_required";
  const allowed = canWriteSocialChild(
    interactionActor(command.actorId),
    {
      kind: "repost",
      original: draft.original,
      repost: draft.repost,
      creatorId: command.actorId,
      permissionState: "pending",
    },
    command.occurredAt,
  );
  return allowed ? null : "target_unavailable";
}
