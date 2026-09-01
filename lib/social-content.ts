import { CONTENT_KINDS, MEDIA_ASSET_KINDS, SOCIAL_DISCLOSURE_KINDS, SOCIAL_RIGHTS_STATUSES, SOCIAL_SOURCE_KINDS } from "./types";
export { DEMO_CREATORS, DEMO_POSTS } from "./social-content-fixtures";

type SocialContentErrorCode =
  | "invalid_content_kind"
  | "invalid_source_kind"
  | "missing_source_provider"
  | "missing_source_identity"
  | "missing_disclosure"
  | "invalid_disclosure_kind"
  | "invalid_disclosure_label"
  | "missing_rights"
  | "invalid_rights_kind"
  | "invalid_rights_status"
  | "missing_rights_permission"
  | "missing_assets"
  | "invalid_asset_id"
  | "duplicate_asset_id"
  | "invalid_asset_order"
  | "invalid_asset_kind"
  | "invalid_asset_url"
  | "invalid_asset_dimensions"
  | "missing_carousel_assets"
  | "missing_video_asset"
  | "mismatched_tag_owner_asset_id"
  | "malformed_normalized_geometry";
export type SocialContentError = { readonly code: SocialContentErrorCode; readonly path?: readonly (string | number)[] };
export type SocialContentResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly errors: readonly SocialContentError[] };
type SocialContentValidationPath = readonly (string | number)[];
type SocialDimensionsInput = { readonly width?: unknown; readonly height?: unknown };
type SocialObjectTagInput = {
  readonly ownerAssetId?: unknown;
  readonly x?: unknown;
  readonly y?: unknown;
  readonly w?: unknown;
  readonly h?: unknown;
};
type SocialMediaAssetInput = {
  readonly id?: unknown;
  readonly order?: unknown;
  readonly kind?: unknown;
  readonly url?: unknown;
  readonly dimensions?: SocialDimensionsInput | null;
  readonly poster?: { readonly url?: unknown; readonly dimensions?: SocialDimensionsInput | null } | null;
  readonly manifest?: { readonly url?: unknown } | null;
  readonly objectTags?: readonly SocialObjectTagInput[];
};
type SocialDisclosureInput = { readonly kind?: unknown; readonly label?: unknown };
type SocialContentInput = {
  readonly contentKind?: unknown;
  readonly sourceRecord?: { readonly kind?: unknown; readonly provider?: unknown; readonly identity?: unknown } | null;
  readonly disclosure?: SocialDisclosureInput | null;
  readonly rights?: {
    readonly kind?: unknown;
    readonly status?: unknown;
    readonly canDisplay?: unknown;
    readonly canUseForCommerceMatching?: unknown;
    readonly canRedistribute?: unknown;
  } | null;
  readonly assets?: readonly SocialMediaAssetInput[] | null;
};

const VALID_CONTENT_KINDS: ReadonlySet<string> = new Set(CONTENT_KINDS);
const VALID_MEDIA_ASSET_KINDS: ReadonlySet<string> = new Set(MEDIA_ASSET_KINDS);
const VALID_SOURCE_KINDS: ReadonlySet<string> = new Set(SOCIAL_SOURCE_KINDS);
const VALID_DISCLOSURE_KINDS: ReadonlySet<string> = new Set(SOCIAL_DISCLOSURE_KINDS);
const VALID_RIGHTS_STATUSES: ReadonlySet<string> = new Set(SOCIAL_RIGHTS_STATUSES);
const SOCIAL_RIGHTS_KINDS = ["user_owned", "licensed", "official_embed", "demo"] as const;
const VALID_RIGHTS_KINDS: ReadonlySet<string> = new Set(SOCIAL_RIGHTS_KINDS);

function addSocialContentError(errors: SocialContentError[], code: SocialContentErrorCode, path?: SocialContentValidationPath): void {
  errors.push(path === undefined ? { code } : { code, path });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAllowedString(value: unknown, values: ReadonlySet<string>): value is string {
  return typeof value === "string" && values.has(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDisclosureLabelValid(value: unknown): boolean {
  return value === null || isNonEmptyString(value);
}

function areDimensionsValid(dimensions: SocialDimensionsInput | null | undefined): boolean {
  return isPositiveFiniteNumber(dimensions?.width) && isPositiveFiniteNumber(dimensions?.height);
}

function isNormalizedCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isNormalizedGeometryValid(tag: SocialObjectTagInput): boolean {
  if (!isNormalizedCoordinate(tag.x) || !isNormalizedCoordinate(tag.y) || !isNormalizedCoordinate(tag.w) || !isNormalizedCoordinate(tag.h)) {
    return false;
  }
  return tag.x + tag.w <= 1 && tag.y + tag.h <= 1;
}

export function normalizeSocialContent<T extends SocialContentInput>(content: T): SocialContentResult<T> {
  const errors: SocialContentError[] = [];
  if (!isAllowedString(content.contentKind, VALID_CONTENT_KINDS)) {
    addSocialContentError(errors, "invalid_content_kind", ["contentKind"]);
  }
  if (!isAllowedString(content.sourceRecord?.kind, VALID_SOURCE_KINDS)) {
    addSocialContentError(errors, "invalid_source_kind", ["sourceRecord", "kind"]);
  }
  if (!isNonEmptyString(content.sourceRecord?.provider)) {
    addSocialContentError(errors, "missing_source_provider", ["sourceRecord", "provider"]);
  }
  if (!isNonEmptyString(content.sourceRecord?.identity)) {
    addSocialContentError(errors, "missing_source_identity", ["sourceRecord", "identity"]);
  }
  if (content.disclosure === null || content.disclosure === undefined) {
    addSocialContentError(errors, "missing_disclosure", ["disclosure"]);
  } else {
    if (!isAllowedString(content.disclosure.kind, VALID_DISCLOSURE_KINDS)) {
      addSocialContentError(errors, "invalid_disclosure_kind", ["disclosure", "kind"]);
    }
    if (!isDisclosureLabelValid(content.disclosure.label)) {
      addSocialContentError(errors, "invalid_disclosure_label", ["disclosure", "label"]);
    }
  }
  if (content.rights === null || content.rights === undefined) {
    addSocialContentError(errors, "missing_rights", ["rights"]);
  } else {
    if (!isAllowedString(content.rights.kind, VALID_RIGHTS_KINDS)) {
      addSocialContentError(errors, "invalid_rights_kind", ["rights", "kind"]);
    }
    if (!isAllowedString(content.rights.status, VALID_RIGHTS_STATUSES)) {
      addSocialContentError(errors, "invalid_rights_status", ["rights", "status"]);
    }
    if (typeof content.rights.canDisplay !== "boolean") {
      addSocialContentError(errors, "missing_rights_permission", ["rights", "canDisplay"]);
    }
    if (typeof content.rights.canUseForCommerceMatching !== "boolean") {
      addSocialContentError(errors, "missing_rights_permission", ["rights", "canUseForCommerceMatching"]);
    }
  }

  const assets = content.assets ?? [];
  if (assets.length === 0) {
    addSocialContentError(errors, "missing_assets", ["assets"]);
  }
  if (content.contentKind === "carousel" && assets.length < 2) {
    addSocialContentError(errors, "missing_carousel_assets", ["assets"]);
  }
  if ((content.contentKind === "reel" || content.contentKind === "video") && !assets.some((asset) => asset.kind === "video")) {
    addSocialContentError(errors, "missing_video_asset", ["assets"]);
  }

  const assetIds = new Set<string>();
  for (const [assetIndex, asset] of assets.entries()) {
    if (!isNonEmptyString(asset.id)) {
      addSocialContentError(errors, "invalid_asset_id", ["assets", assetIndex, "id"]);
      if (typeof asset.id === "string" && assetIds.has(asset.id)) {
        addSocialContentError(errors, "duplicate_asset_id", ["assets", assetIndex, "id"]);
      }
    } else if (assetIds.has(asset.id)) {
      addSocialContentError(errors, "duplicate_asset_id", ["assets", assetIndex, "id"]);
    } else {
      assetIds.add(asset.id);
    }
    if (typeof asset.id === "string") {
      assetIds.add(asset.id);
    }
    if (!Number.isInteger(asset.order) || asset.order !== assetIndex) {
      addSocialContentError(errors, "invalid_asset_order", ["assets", assetIndex, "order"]);
    }
    if (!isAllowedString(asset.kind, VALID_MEDIA_ASSET_KINDS)) {
      addSocialContentError(errors, "invalid_asset_kind", ["assets", assetIndex, "kind"]);
    }
    if (!isNonEmptyString(asset.url)) {
      addSocialContentError(errors, "invalid_asset_url", ["assets", assetIndex, "url"]);
    }
    if (!areDimensionsValid(asset.dimensions)) {
      addSocialContentError(errors, "invalid_asset_dimensions", ["assets", assetIndex, "dimensions"]);
    }
    if (asset.poster !== null && asset.poster !== undefined) {
      if (!isNonEmptyString(asset.poster.url)) {
        addSocialContentError(errors, "invalid_asset_url", ["assets", assetIndex, "poster", "url"]);
      }
      if (!areDimensionsValid(asset.poster.dimensions)) {
        addSocialContentError(errors, "invalid_asset_dimensions", ["assets", assetIndex, "poster", "dimensions"]);
      }
    }
    if (asset.manifest !== null && asset.manifest !== undefined && !isNonEmptyString(asset.manifest.url)) {
      addSocialContentError(errors, "invalid_asset_url", ["assets", assetIndex, "manifest", "url"]);
    }
    for (const [tagIndex, tag] of (asset.objectTags ?? []).entries()) {
      if (tag.ownerAssetId !== asset.id) {
        addSocialContentError(errors, "mismatched_tag_owner_asset_id", ["assets", assetIndex, "objectTags", tagIndex, "ownerAssetId"]);
      }
      if (!isNormalizedGeometryValid(tag)) {
        addSocialContentError(errors, "malformed_normalized_geometry", ["assets", assetIndex, "objectTags", tagIndex]);
      }
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: content };
}
