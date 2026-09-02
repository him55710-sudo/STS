import type {
  Category,
  ContentSourceLabel,
  MediaAssetKind,
  MediaObjectTag,
  Post,
  SocialDisclosure,
  SocialDisclosureKind,
  SocialRights,
  SocialRightsStatus,
} from "@/lib/types";
import type { FeedMediaAsset, MediaProcessingState } from "./MixedMediaFeed";
import {
  geometrySchema,
  REPOSITORY_FEED_SELECT,
  repositoryRowsSchema,
  type RepositoryAssetRow,
  type RepositoryFeedRow,
  type RepositoryObjectRow,
  type RepositoryRightsRow,
  type RepositorySourceRow,
} from "./MixedMediaRepositorySchemas";

export { REPOSITORY_FEED_SELECT };

export function repositoryRowsToPosts(data: unknown): readonly Post[] | null {
  const parsed = repositoryRowsSchema.safeParse(data);
  if (!parsed.success) return null;
  return parsed.data.map(repositoryRowToPost).filter((post) => post !== null);
}

export function repositoryEmptyMessage(state: "loading" | "ready" | "unavailable" | "error"): string {
  switch (state) {
    case "loading":
      return "승인된 public feed를 불러오는 중이에요.";
    case "ready":
      return "아직 표시 가능한 repository 콘텐츠가 없어요. 테스트 콘텐츠는 /feed?fixture=1에서 볼 수 있어요.";
    case "unavailable":
      return "Supabase 공개 feed 설정이 없어 repository 콘텐츠를 표시하지 않아요. Fixture 모드는 /feed?fixture=1입니다.";
    case "error":
      return "Repository feed 응답이 표시 가능한 콘텐츠 계약과 맞지 않아요.";
    default:
      return assertNever(state);
  }
}

function repositoryRowToPost(row: RepositoryFeedRow): Post | null {
  const assets = assetsFromRepositoryRow(row);
  const firstAsset = assets[0];
  const source = firstRelated(row.content_sources);
  const rights = firstRelated(row.content_rights);
  if (!firstAsset || !source || !rights) return null;

  const assetIds = new Set(assets.map((asset) => asset.id));
  const objectTags: MediaObjectTag[] = [];
  for (const object of row.post_objects ?? []) {
    const tag = tagFromRepositoryObject(object);
    if (tag !== null && assetIds.has(tag.ownerAssetId)) {
      objectTags.push(tag);
    }
  }
  const mediaAssets = assets.map((asset) => ({
    ...asset,
    objectTags: objectTags.filter((tag) => tag.ownerAssetId === asset.id),
  }));
  const base = {
    id: row.id,
    creatorId: row.creator_key ?? row.creator_id ?? `source-${source.provider}`,
    image: firstAsset.poster?.url ?? firstAsset.url,
    ratio: firstAsset.dimensions.width / firstAsset.dimensions.height,
    caption: row.caption,
    category: row.category satisfies Category,
    likes: 0,
    objects: [...objectTags],
    createdAt: row.published_at ?? row.created_at,
    is_demo: row.is_demo ? true as const : undefined,
    source: contentSourceFromRepository(source.source_kind),
    assets: mediaAssets,
    sourceRecord: {
      kind: source.source_kind,
      provider: source.provider,
      identity: source.external_id ?? source.canonical_url ?? source.provider,
      canonicalUrl: source.canonical_url ?? null,
      externalId: source.external_id ?? undefined,
    },
    disclosure: disclosureFromRepository(row.disclosure),
    rights: rightsFromRepository(rights),
  };

  switch (row.content_kind) {
    case "photo":
      return { ...base, contentKind: "photo" };
    case "carousel":
      return { ...base, contentKind: "carousel" };
    case "reel":
      return { ...base, contentKind: "reel" };
    case "video":
      return { ...base, contentKind: "video" };
    case "story":
      return { ...base, contentKind: "story" };
    case "lookbook":
      return { ...base, contentKind: "lookbook" };
    default:
      return assertNever(row.content_kind);
  }
}

function assetsFromRepositoryRow(row: RepositoryFeedRow): readonly FeedMediaAsset[] {
  return (row.media_assets ?? [])
    .map((asset) => assetFromRepositoryAsset(asset))
    .toSorted((left, right) => left.order - right.order);
}

function assetFromRepositoryAsset(asset: RepositoryAssetRow): FeedMediaAsset {
  const width = asset.width ?? 1080;
  const height = asset.height ?? 1080;
  return {
    id: asset.id,
    order: asset.asset_order,
    kind: mediaKindFromRepository(asset.media_kind),
    url: asset.public_url,
    dimensions: { width, height },
    poster: asset.poster_url ? { url: asset.poster_url, dimensions: { width, height } } : null,
    durationMs: asset.duration_ms ?? null,
    manifest: asset.hls_url ? { kind: "hls" as const, url: asset.hls_url } : null,
    objectTags: [],
    processingState: asset.processing_state satisfies MediaProcessingState | undefined,
  };
}

function tagFromRepositoryObject(row: RepositoryObjectRow): MediaObjectTag | null {
  const geometry = geometrySchema.safeParse(row.geometry);
  const confidence = numberFromRepository(row.confidence);
  if (!geometry.success || !row.media_asset_id) return null;
  return {
    id: row.id,
    ownerAssetId: row.media_asset_id,
    label: row.label,
    x: geometry.data.x,
    y: geometry.data.y,
    w: geometry.data.w,
    h: geometry.data.h,
    productId: row.product_id,
    exactness: row.exactness,
    confidence: confidence ?? 0,
  };
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mediaKindFromRepository(kind: RepositoryAssetRow["media_kind"]): MediaAssetKind {
  switch (kind) {
    case "photo":
    case "image":
    case "poster":
    case "thumbnail":
      return "image";
    case "video":
      return "video";
    case "embed":
      return "embed";
    default:
      return assertNever(kind);
  }
}

function contentSourceFromRepository(kind: RepositorySourceRow["source_kind"]): ContentSourceLabel {
  switch (kind) {
    case "demo_seed":
      return "demo-seed";
    case "user_upload":
      return "user-upload";
    case "licensed_editorial":
      return "licensed-editorial";
    case "brand_feed":
      return "brand-feed";
    case "official_embed":
      return "official-embed";
    default:
      return assertNever(kind);
  }
}

function disclosureFromRepository(kind: RepositoryFeedRow["disclosure"]): SocialDisclosure {
  const mappedKind: SocialDisclosureKind = kind === "demo" ? "none" : kind;
  return { kind: mappedKind, label: mappedKind === "none" ? null : mappedKind };
}

function rightsFromRepository(row: RepositoryRightsRow): SocialRights {
  return {
    kind: rightsKindFromRepository(row.license_scope),
    status: rightsStatusFromRepository(row.rights_status),
    canDisplay: row.can_display,
    canUseForCommerceMatching: row.can_use_for_commerce_matching,
    canRedistribute: row.can_redistribute ?? false,
    evidence: row.rights_evidence_url ?? null,
    expiresAt: row.expires_at,
  };
}

function rightsKindFromRepository(scope: RepositoryRightsRow["license_scope"]): SocialRights["kind"] {
  switch (scope) {
    case "user_owned":
      return "user_owned";
    case "licensed":
    case "display_only":
      return "licensed";
    case "public_embed":
      return "official_embed";
    case "demo_seed":
      return "demo";
    default:
      return assertNever(scope);
  }
}

function rightsStatusFromRepository(status: RepositoryRightsRow["rights_status"]): SocialRightsStatus {
  switch (status) {
    case "approved":
    case "pending":
    case "expired":
    case "takedown":
      return status;
    case "rejected":
      return "blocked";
    default:
      return assertNever(status);
  }
}

function numberFromRepository(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled repository feed variant: ${JSON.stringify(value)}`);
}
