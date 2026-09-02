"use client";

import type {
  ContentKind,
  MediaObjectTag,
  Post,
  SocialMediaAsset,
  SocialPost,
} from "@/lib/types";

export type FeedTab = "foryou" | "following";
export type FeedMode = "repository" | "fixture";
export type MediaProcessingState = "uploaded" | "processing" | "ready" | "blocked" | "failed";
export type FeedMediaAsset = SocialMediaAsset & { readonly processingState?: MediaProcessingState };

export type FeedContentSource = {
  readonly mode: FeedMode;
  readonly repositoryPosts: readonly Post[];
  readonly fixturePosts: readonly Post[];
  readonly localPosts: readonly Post[];
  readonly hydrated: boolean;
  readonly now: Date;
};

export type MediaFrame =
  | {
      readonly kind: "image";
      readonly src: string;
      readonly aspectRatio: string;
      readonly label: string;
    }
  | {
      readonly kind: "video";
      readonly src: string;
      readonly poster: string;
      readonly aspectRatio: string;
      readonly label: string;
    }
  | {
      readonly kind: "embed";
      readonly src: string;
      readonly aspectRatio: string;
      readonly label: string;
    }
  | {
      readonly kind: "fallback";
      readonly aspectRatio: string;
      readonly label: string;
    };

export type CarouselSlide = {
  readonly asset: FeedMediaAsset;
  readonly frame: MediaFrame;
  readonly tags: readonly MediaObjectTag[];
};

const CONTENT_LABELS = {
  photo: "Photo",
  carousel: "Carousel",
  reel: "Reel",
  video: "Video",
  story: "Story",
  lookbook: "Lookbook",
} as const satisfies Record<ContentKind, string>;

function assertNever(value: never): never {
  throw new Error(`Unhandled mixed feed variant: ${JSON.stringify(value)}`);
}

function isSocialPost(post: Post): post is SocialPost {
  return post.contentKind !== undefined;
}

function newestFirst(left: Post, right: Post): number {
  return +new Date(right.createdAt) - +new Date(left.createdAt);
}

function isActiveSocialPost(post: SocialPost, now: Date): boolean {
  if (post.rights.status !== "approved") return false;
  if (!post.rights.canDisplay) return false;
  if (post.rights.expiresAt !== null && Date.parse(post.rights.expiresAt) <= now.getTime()) return false;
  return displayableAssetsForPost(post).length > 0;
}

function isSelectablePost(post: Post, now: Date): boolean {
  if (!isSocialPost(post)) return displayableAssetsForPost(post).length > 0;
  return isActiveSocialPost(post, now);
}

function legacyAsset(post: Post): FeedMediaAsset {
  const id = `legacy-${post.id}`;
  return {
    id,
    order: 0,
    kind: "image",
    url: post.image,
    dimensions: { width: Math.max(1, Math.round(post.ratio * 1000)), height: 1000 },
    poster: null,
    durationMs: null,
    manifest: null,
    objectTags: post.objects.map((object) => ({ ...object, ownerAssetId: id })),
  };
}

export function getFeedModeFromSearchParams(params: Pick<URLSearchParams, "get">): FeedMode {
  return params.get("fixture") === "1" ? "fixture" : "repository";
}

export function selectFeedPosts(
  source: FeedContentSource,
  tab: FeedTab,
  following: readonly string[],
): readonly Post[] {
  const persistedPosts = source.mode === "fixture" ? source.fixturePosts : source.repositoryPosts;
  const localPosts = source.hydrated ? source.localPosts : [];
  const localPostIds = new Set(localPosts.map((post) => post.id));
  const candidates = [...localPosts, ...persistedPosts].filter((post) => isSelectablePost(post, source.now));
  const tabbed =
    tab === "following"
      ? candidates.filter((post) => localPostIds.has(post.id) || following.includes(post.creatorId) || post.isUserPost)
      : candidates;
  return tabbed.toSorted(newestFirst);
}

export function displayableAssetsForPost(post: Post): readonly FeedMediaAsset[] {
  if (!isSocialPost(post)) return [legacyAsset(post)];
  return post.assets.filter((asset) => isDisplayableAsset(asset)).toSorted((left, right) => left.order - right.order);
}

export function resolveMediaFrame(asset: FeedMediaAsset | undefined, post: Post): MediaFrame {
  const aspectRatio = asset ? assetAspectRatio(asset) : `${post.ratio} / 1`;
  if (!asset || !isDisplayableAsset(asset)) {
    return { kind: "fallback", aspectRatio, label: "미디어를 표시할 수 없어요" };
  }

  switch (asset.kind) {
    case "image":
      return { kind: "image", src: asset.url, aspectRatio, label: contentLabel(post) };
    case "video":
      return {
        kind: "video",
        src: asset.manifest?.url ?? asset.url,
        poster: asset.poster?.url ?? post.image,
        aspectRatio,
        label: contentLabel(post),
      };
    case "embed":
      return { kind: "embed", src: asset.url, aspectRatio, label: contentLabel(post) };
    default:
      return assertNever(asset.kind);
  }
}

export function tagsForAsset(post: Post, assetId: string): readonly MediaObjectTag[] {
  if (!isSocialPost(post)) return legacyAsset(post).objectTags;
  const asset = displayableAssetsForPost(post).find((candidate) => candidate.id === assetId);
  return asset?.objectTags.filter((tag) => tag.ownerAssetId === asset.id) ?? [];
}

export function tagsForPost(post: Post): readonly MediaObjectTag[] {
  return displayableAssetsForPost(post).flatMap((asset) => tagsForAsset(post, asset.id));
}

export function resolveCarouselSlide(post: Post, index: number): CarouselSlide | null {
  const assets = displayableAssetsForPost(post);
  const asset = assets[index];
  if (!asset) return null;
  return {
    asset,
    frame: resolveMediaFrame(asset, post),
    tags: tagsForAsset(post, asset.id),
  };
}

export function disclosureLabel(post: Post): string {
  if (!isSocialPost(post)) return post.is_demo ? "Demo fixture" : "Local upload";
  if (post.disclosure.kind !== "none") {
    return post.disclosure.label ?? post.disclosure.kind;
  }
  switch (post.sourceRecord.kind) {
    case "demo_seed":
      return "Demo fixture";
    case "user_upload":
      return "Creator uploaded";
    case "licensed_editorial":
      return "Licensed editorial";
    case "brand_feed":
      return "Partner feed";
    case "official_embed":
      return "Official embed";
    default:
      return assertNever(post.sourceRecord.kind);
  }
}

export function attributionLabel(post: Post): string {
  if (!isSocialPost(post)) return post.source ?? "repository";
  return `${post.sourceRecord.provider} · ${post.sourceRecord.identity}`;
}

export function contentSourceLabel(post: Post): string {
  return attributionLabel(post);
}

function isDisplayableAsset(asset: FeedMediaAsset): boolean {
  if (asset.processingState !== undefined && asset.processingState !== "ready") return false;
  return asset.url.trim().length > 0;
}

function assetAspectRatio(asset: SocialMediaAsset): string {
  return `${asset.dimensions.width} / ${asset.dimensions.height}`;
}

function contentLabel(post: Post): string {
  if (!isSocialPost(post)) return "Photo";
  return CONTENT_LABELS[post.contentKind];
}
