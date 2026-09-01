export type SocialVisibility = "public" | "private" | "unlisted";
export type SocialPublishState = "draft" | "scheduled" | "published" | "archived";
export type SocialDisplayState = "pending" | "approved" | "blocked";
export type SocialRightsStatus = "pending" | "approved" | "rejected" | "expired" | "takedown";
export type SocialSourceKind = "user_upload" | "licensed_editorial" | "brand_feed" | "official_embed" | "demo_seed";
export type SocialProcessingState = "uploaded" | "processing" | "ready" | "blocked" | "failed";
export type SocialModerationState = "pending" | "approved" | "blocked";
export type SocialPermissionState = "pending" | "approved" | "rejected";
export type SocialActor =
  | { readonly kind: "anonymous" }
  | { readonly kind: "user"; readonly userId: string }
  | { readonly kind: "admin"; readonly userId: string }
  | { readonly kind: "service_role" };

export type SocialContentRow = {
  readonly id: string;
  readonly creatorId: string;
  readonly visibility: SocialVisibility;
  readonly publishState: SocialPublishState;
  readonly displayState: SocialDisplayState;
  readonly publishedAt: string | null;
  readonly expiresAt: string | null;
  readonly rightsStatus: SocialRightsStatus;
  readonly rightsExpiresAt: string | null;
  readonly canDisplay: boolean;
  readonly canUseForCommerceMatching: boolean;
  readonly takedownAt: string | null;
  readonly sourceKind?: SocialSourceKind;
};

export type SocialPublicChildTarget =
  | {
      readonly kind: "story_group";
      readonly visibility: SocialVisibility;
      readonly publishState: "draft" | "published" | "archived";
      readonly displayState: SocialDisplayState;
      readonly startsAt: string;
      readonly expiresAt: string;
      readonly storyItemParents: readonly SocialContentRow[];
    }
  | {
      readonly kind: "comment";
      readonly parent: SocialContentRow;
      readonly moderationState: SocialModerationState;
      readonly deletedAt: string | null;
    }
  | { readonly kind: "post_object"; readonly parent: SocialContentRow }
  | {
      readonly kind: "repost";
      readonly original: SocialContentRow;
      readonly repost: SocialContentRow;
      readonly permissionState: SocialPermissionState;
    }
  | {
      readonly kind: "media_asset";
      readonly parent: SocialContentRow;
      readonly processingState: SocialProcessingState;
    }
  | {
      readonly kind: "media_variant";
      readonly parent: SocialContentRow;
      readonly mediaAssetProcessingState: SocialProcessingState;
      readonly variantProcessingState: SocialProcessingState;
    };

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

export function canSelectPublicSocialChild(target: SocialPublicChildTarget, now: Date): boolean {
  switch (target.kind) {
    case "story_group":
      return (
        target.visibility === "public" &&
        target.publishState === "published" &&
        target.displayState === "approved" &&
        isStarted(target.startsAt, now) &&
        isActiveUntil(target.expiresAt, now) &&
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
