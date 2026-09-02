import type { SocialActor, SocialContentRow, SocialPublicChildTarget, SocialWriteChildTarget } from "./types";

type PublicActiveStoryGroupTarget = {
  readonly visibility: "public" | "private" | "unlisted";
  readonly publishState: "draft" | "published" | "archived";
  readonly displayState: "pending" | "approved" | "blocked";
  readonly startsAt: string;
  readonly expiresAt: string;
};

export type {
  SocialActor,
  SocialContentRow,
  SocialDisplayState,
  SocialModerationState,
  SocialPermissionState,
  SocialProcessingState,
  SocialPublishState,
  SocialPublicChildTarget,
  SocialRightsStatus,
  SocialSourceKind,
  SocialVisibility,
  SocialWriteChildTarget,
} from "./types";

function assertNever(value: never): never {
  throw new Error(`Unhandled social policy actor: ${JSON.stringify(value)}`);
}

function isActiveUntil(timestamp: string | null, now: Date): boolean {
  return timestamp === null || Date.parse(timestamp) > now.getTime();
}

function isStarted(timestamp: string, now: Date): boolean {
  return Date.parse(timestamp) <= now.getTime();
}

export function isPublicDisplayableContent(row: SocialContentRow, now: Date): boolean {
  if (row.visibility !== "public") return false;
  if (row.publishState !== "published") return false;
  if (row.displayState !== "approved") return false;
  if (row.publishedAt === null) return false;
  if (row.rightsStatus !== "approved") return false;
  if (!row.canDisplay) return false;
  if (row.takedownAt !== null) return false;
  if (!isActiveUntil(row.expiresAt, now)) return false;
  if (!isActiveUntil(row.rightsExpiresAt, now)) return false;

  return true;
}

function isPublicActiveStoryGroup(target: PublicActiveStoryGroupTarget, now: Date): boolean {
  return (
    target.visibility === "public" &&
    target.publishState === "published" &&
    target.displayState === "approved" &&
    isStarted(target.startsAt, now) &&
    isActiveUntil(target.expiresAt, now)
  );
}

export function canSelectPublicSocialChild(target: SocialPublicChildTarget, now: Date): boolean {
  switch (target.kind) {
    case "story_group":
      return (
        isPublicActiveStoryGroup(target, now) &&
        target.storyItemParents.some((parent) => isPublicDisplayableContent(parent, now))
      );
    case "comment":
      return (
        target.moderationState === "approved" &&
        target.deletedAt === null &&
        isPublicDisplayableContent(target.parent, now)
      );
    case "post_object":
      return isPublicDisplayableContent(target.parent, now);
    case "repost":
      return (
        target.permissionState === "approved" &&
        isPublicDisplayableContent(target.original, now) &&
        isPublicDisplayableContent(target.repost, now)
      );
    case "media_asset":
      return target.processingState === "ready" && isPublicDisplayableContent(target.parent, now);
    case "media_variant":
      return (
        target.variantProcessingState === "ready" &&
        target.mediaAssetProcessingState === "ready" &&
        isPublicDisplayableContent(target.parent, now)
      );
    default:
      return assertNever(target);
  }
}

export function canReadSocialContent(actor: SocialActor, row: SocialContentRow, now: Date): boolean {
  if (isPublicDisplayableContent(row, now)) return true;

  switch (actor.kind) {
    case "anonymous":
      return false;
    case "user":
      return row.creatorId === actor.userId;
    case "admin":
    case "service_role":
      return true;
    default:
      return assertNever(actor);
  }
}

function authenticatedActorId(actor: SocialActor): string | null {
  switch (actor.kind) {
    case "anonymous":
    case "service_role":
      return null;
    case "user":
    case "admin":
      return actor.userId;
    default:
      return assertNever(actor);
  }
}

function isUsableOwnedDraft(row: SocialContentRow, ownerId: string, now: Date): boolean {
  const hasBlockingRightsStatus =
    row.rightsStatus === "rejected" || row.rightsStatus === "expired" || row.rightsStatus === "takedown";

  return (
    row.creatorId === ownerId &&
    row.takedownAt === null &&
    !hasBlockingRightsStatus &&
    isActiveUntil(row.expiresAt, now) &&
    isActiveUntil(row.rightsExpiresAt, now)
  );
}

export function canWriteSocialChild(actor: SocialActor, target: SocialWriteChildTarget, now: Date): boolean {
  const actorId = authenticatedActorId(actor);
  if (actorId === null) return false;

  switch (target.kind) {
    case "comment":
      return (
        target.authorId === actorId &&
        target.moderationState === "pending" &&
        isPublicDisplayableContent(target.parent, now)
      );
    case "reaction":
      return target.actorId === actorId && isPublicDisplayableContent(target.parent, now);
    case "post_object":
      return (
        target.parent.creatorId === actorId &&
        target.parent.sourceKind !== "official_embed" &&
        isPublicDisplayableContent(target.parent, now) &&
        target.parent.canUseForCommerceMatching
      );
    case "repost":
      return (
        target.creatorId === actorId &&
        target.permissionState === "pending" &&
        isPublicDisplayableContent(target.original, now) &&
        isUsableOwnedDraft(target.repost, actorId, now)
      );
    case "story_item":
      return (
        target.storyGroupCreatorId === actorId &&
        target.storyGroupDisplayState === "pending" &&
        target.mediaParent.creatorId === actorId &&
        isPublicDisplayableContent(target.mediaParent, now) &&
        (target.postParent === null || target.postParent.id === target.mediaParent.id)
      );
    case "story_view":
      return (
        target.viewerId === actorId &&
        isPublicActiveStoryGroup(
          {
            visibility: target.storyGroupVisibility,
            publishState: target.storyGroupPublishState,
            displayState: target.storyGroupDisplayState,
            startsAt: target.storyGroupStartsAt,
            expiresAt: target.storyGroupExpiresAt,
          },
          now,
        ) &&
        target.mediaAssetProcessingState === "ready" &&
        isPublicDisplayableContent(target.mediaParent, now)
      );
    default:
      return assertNever(target);
  }
}

export function canUseSocialContentForCommerceMatching(actor: SocialActor, row: SocialContentRow, now: Date): boolean {
  if (!isPublicDisplayableContent(row, now)) return false;
  if (!row.canUseForCommerceMatching) return false;
  if (row.sourceKind === "official_embed") return false;

  switch (actor.kind) {
    case "anonymous":
    case "user":
      return false;
    case "admin":
    case "service_role":
      return true;
    default:
      return assertNever(actor);
  }
}

export function filterReadableSocialContent(
  actor: SocialActor,
  rows: readonly SocialContentRow[],
  now: Date,
): readonly SocialContentRow[] {
  return rows.filter((row) => canReadSocialContent(actor, row, now));
}

export function buildPublicContentSelect(): string {
  return [
    "id",
    "creator_id",
    "caption",
    "category",
    "visibility",
    "content_kind",
    "publish_state",
    "display_state",
    "published_at",
    "expires_at",
    "disclosure",
    "content_sources(id, source_kind, provider, canonical_url, external_id)",
    "content_rights(rights_status, can_display, can_embed, can_tag, can_use_for_commerce_matching, expires_at, takedown_at)",
    "media_assets(id, asset_order, media_kind, public_url, poster_url, hls_url, duration_ms, width, height, processing_state, media_variants(id, variant_kind, public_url, width, height, processing_state))",
  ].join(", ");
}
