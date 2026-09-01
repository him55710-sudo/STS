import type { MediaManifest, MediaObjectTag, Post, SocialDisclosure, SocialMediaAsset, SocialRights, SocialSourceRecord } from "../../lib/types";

export const sourceRecord = {
  kind: "user_upload",
  provider: "local-upload",
  identity: "creator-1/social-contract",
  canonicalUrl: null,
} as const satisfies SocialSourceRecord;

export const disclosure = {
  kind: "none",
  label: null,
} as const satisfies SocialDisclosure;

export const approvedRights = {
  kind: "user_owned",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: false,
  evidence: null,
  expiresAt: null,
} as const satisfies SocialRights;

const sharedFixtureFields = {
  creatorId: "creator-1",
  ratio: 1,
  category: "fashion" as const,
  likes: 12,
  objects: [],
  createdAt: "2026-08-28T00:00:00+09:00",
  source: "user-upload" as const,
};

function tagFor(ownerAssetId: string, label: string): MediaObjectTag {
  return {
    id: `tag-${ownerAssetId}`,
    ownerAssetId,
    label,
    x: 0.1,
    y: 0.1,
    w: 0.4,
    h: 0.4,
    productId: null,
    exactness: "review",
    confidence: 0.72,
  };
}

export function imageAsset(id: string, order: number, url: string): SocialMediaAsset {
  return {
    id,
    order,
    kind: "image",
    url,
    dimensions: { width: 1080, height: 1080 },
    poster: null,
    durationMs: null,
    manifest: null,
    objectTags: [tagFor(id, "jacket")],
  };
}

function videoAsset(id: string, order: number, url: string): SocialMediaAsset {
  const manifest = {
    kind: "hls",
    url: `/social/${id}.m3u8`,
  } as const satisfies MediaManifest;

  return {
    id,
    order,
    kind: "video",
    url,
    dimensions: { width: 1080, height: 1920 },
    poster: { url: `/social/${id}-poster.jpg`, dimensions: { width: 1080, height: 1920 } },
    durationMs: 15000,
    manifest,
    objectTags: [tagFor(id, "jacket")],
  };
}

export const contentKindFixtures = [
  {
    ...sharedFixtureFields,
    id: "fixture-photo",
    image: "/social/photo.jpg",
    caption: "A typed photo",
    contentKind: "photo",
    assets: [imageAsset("asset-photo-1", 0, "/social/photo.jpg")],
    sourceRecord,
    disclosure,
    rights: approvedRights,
  },
  {
    ...sharedFixtureFields,
    id: "fixture-carousel",
    image: "/social/carousel-1.jpg",
    caption: "A typed carousel",
    contentKind: "carousel",
    assets: [
      imageAsset("asset-carousel-1", 0, "/social/carousel-1.jpg"),
      imageAsset("asset-carousel-2", 1, "/social/carousel-2.jpg"),
    ],
    sourceRecord,
    disclosure,
    rights: approvedRights,
  },
  {
    ...sharedFixtureFields,
    id: "fixture-reel",
    image: "/social/reel-1-poster.jpg",
    ratio: 9 / 16,
    caption: "A typed reel",
    contentKind: "reel",
    assets: [videoAsset("asset-reel-1", 0, "/social/reel-1.mp4")],
    sourceRecord,
    disclosure,
    rights: approvedRights,
  },
  {
    ...sharedFixtureFields,
    id: "fixture-video",
    image: "/social/video-1-poster.jpg",
    ratio: 16 / 9,
    caption: "A typed video",
    contentKind: "video",
    assets: [videoAsset("asset-video-1", 0, "/social/video-1.mp4")],
    sourceRecord,
    disclosure,
    rights: approvedRights,
  },
  {
    ...sharedFixtureFields,
    id: "fixture-story",
    image: "/social/story-1.jpg",
    ratio: 9 / 16,
    caption: "A typed story",
    contentKind: "story",
    assets: [imageAsset("asset-story-1", 0, "/social/story-1.jpg")],
    sourceRecord,
    disclosure,
    rights: approvedRights,
  },
  {
    ...sharedFixtureFields,
    id: "fixture-lookbook",
    image: "/social/lookbook-1.jpg",
    caption: "A typed lookbook",
    contentKind: "lookbook",
    assets: [imageAsset("asset-lookbook-1", 0, "/social/lookbook-1.jpg")],
    sourceRecord,
    disclosure,
    rights: approvedRights,
  },
] as const satisfies readonly Post[];

export const validReel = contentKindFixtures[2];
