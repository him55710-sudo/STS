import { canWriteSocialChild, type SocialActor, type SocialContentRow } from "../../lib/social-repository";

type ChildWriteRejectionActors = {
  readonly ownerActor: Extract<SocialActor, { readonly kind: "user" }>;
  readonly wrongOwnerActor: Extract<SocialActor, { readonly kind: "user" }>;
};

export function buildChildWriteRejectionResults(
  actors: ChildWriteRejectionActors,
  publishedRow: SocialContentRow,
  now: Date,
): Record<string, boolean> {
  const takenDownRow: SocialContentRow = {
    ...publishedRow,
    id: "taken-down-parent",
    takedownAt: "2026-08-31T12:00:00.000Z",
  };
  const matchableRow: SocialContentRow = {
    ...publishedRow,
    id: "matchable-parent",
    canUseForCommerceMatching: true,
  };
  const pendingOwnedRow: SocialContentRow = {
    ...publishedRow,
    id: "pending-owned-parent",
    publishState: "draft",
    displayState: "pending",
    publishedAt: null,
    rightsStatus: "pending",
    canDisplay: false,
    canUseForCommerceMatching: false,
  };
  const expiredOwnedRow: SocialContentRow = {
    ...pendingOwnedRow,
    id: "expired-owned-parent",
    expiresAt: "2026-08-31T23:59:59.000Z",
  };
  const rejectedRightsOwnedRow: SocialContentRow = {
    ...pendingOwnedRow,
    id: "rejected-rights-owned-parent",
    rightsStatus: "rejected",
  };

  return {
    commentOnTakedown: canWriteSocialChild(
      actors.ownerActor,
      { kind: "comment", parent: takenDownRow, authorId: actors.ownerActor.userId, moderationState: "pending" },
      now,
    ),
    reactionOnTakedown: canWriteSocialChild(
      actors.ownerActor,
      { kind: "reaction", parent: takenDownRow, actorId: actors.ownerActor.userId },
      now,
    ),
    repostFromTakedown: canWriteSocialChild(
      actors.ownerActor,
      {
        kind: "repost",
        original: takenDownRow,
        repost: pendingOwnedRow,
        creatorId: actors.ownerActor.userId,
        permissionState: "pending",
      },
      now,
    ),
    repostToExpiredDraft: canWriteSocialChild(
      actors.ownerActor,
      {
        kind: "repost",
        original: matchableRow,
        repost: expiredOwnedRow,
        creatorId: actors.ownerActor.userId,
        permissionState: "pending",
      },
      now,
    ),
    repostToRejectedRightsDraft: canWriteSocialChild(
      actors.ownerActor,
      {
        kind: "repost",
        original: matchableRow,
        repost: rejectedRightsOwnedRow,
        creatorId: actors.ownerActor.userId,
        permissionState: "pending",
      },
      now,
    ),
    storyItemFromWrongOwnerMedia: canWriteSocialChild(
      actors.ownerActor,
      {
        kind: "story_item",
        storyGroupCreatorId: actors.ownerActor.userId,
        storyGroupDisplayState: "pending",
        mediaParent: { ...pendingOwnedRow, creatorId: actors.wrongOwnerActor.userId },
        postParent: null,
      },
      now,
    ),
    storyItemFromExpiredMedia: canWriteSocialChild(
      actors.ownerActor,
      {
        kind: "story_item",
        storyGroupCreatorId: actors.ownerActor.userId,
        storyGroupDisplayState: "pending",
        mediaParent: expiredOwnedRow,
        postParent: null,
      },
      now,
    ),
    storyItemFromRejectedRightsMedia: canWriteSocialChild(
      actors.ownerActor,
      {
        kind: "story_item",
        storyGroupCreatorId: actors.ownerActor.userId,
        storyGroupDisplayState: "pending",
        mediaParent: rejectedRightsOwnedRow,
        postParent: null,
      },
      now,
    ),
    officialEmbedObject: canWriteSocialChild(
      actors.ownerActor,
      { kind: "post_object", parent: { ...matchableRow, sourceKind: "official_embed" } },
      now,
    ),
  };
}
