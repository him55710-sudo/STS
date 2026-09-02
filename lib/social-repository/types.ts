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

type SocialActiveStoryGroupState = {
  readonly storyGroupVisibility: SocialVisibility;
  readonly storyGroupPublishState: "draft" | "published" | "archived";
  readonly storyGroupDisplayState: SocialDisplayState;
  readonly storyGroupStartsAt: string;
  readonly storyGroupExpiresAt: string;
};

export type SocialWriteChildTarget =
  | {
      readonly kind: "comment";
      readonly parent: SocialContentRow;
      readonly authorId: string;
      readonly moderationState: SocialModerationState;
    }
  | { readonly kind: "reaction"; readonly parent: SocialContentRow; readonly actorId: string }
  | { readonly kind: "post_object"; readonly parent: SocialContentRow }
  | {
      readonly kind: "repost";
      readonly original: SocialContentRow;
      readonly repost: SocialContentRow;
      readonly creatorId: string;
      readonly permissionState: SocialPermissionState;
    }
  | {
      readonly kind: "story_item";
      readonly storyGroupCreatorId: string;
      readonly storyGroupDisplayState: SocialDisplayState;
      readonly mediaParent: SocialContentRow;
      readonly postParent: SocialContentRow | null;
    }
  | (SocialActiveStoryGroupState & {
      readonly kind: "story_view";
      readonly viewerId: string;
      readonly mediaAssetProcessingState: SocialProcessingState;
      readonly mediaParent: SocialContentRow;
    });
