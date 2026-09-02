"use client";

import type {
  MediaManifest,
  MediaObjectTag,
  Post,
  SocialDisclosure,
  SocialMediaAsset,
  SocialRights,
  SocialSourceRecord,
} from "@/lib/types";

const FIXTURE_SOURCE = {
  kind: "demo_seed",
  provider: "sts-fixture",
  identity: "task-6-mixed-feed",
  canonicalUrl: null,
} as const satisfies SocialSourceRecord;

const FIXTURE_DISCLOSURE = {
  kind: "none",
  label: null,
} as const satisfies SocialDisclosure;

const FIXTURE_RIGHTS = {
  kind: "demo",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: false,
  canRedistribute: false,
  evidence: "STS Task 6 fixture mode uses local repository images and is not a production rights claim.",
  expiresAt: null,
} as const satisfies SocialRights;

const videoManifest = (id: string): MediaManifest => ({
  kind: "hls",
  url: `/fixtures/${id}.m3u8`,
});

const tag = (assetId: string, label: string, productId: string | null, x: number, y: number): MediaObjectTag => ({
  id: `tag-${assetId}-${label}`,
  ownerAssetId: assetId,
  label,
  x,
  y,
  w: 0.2,
  h: 0.18,
  productId,
  exactness: productId ? "review" : "unverified",
  confidence: productId ? 0.72 : 0.48,
});

const imageAsset = (
  id: string,
  order: number,
  url: string,
  tags: readonly MediaObjectTag[],
): SocialMediaAsset => ({
  id,
  order,
  kind: "image",
  url,
  dimensions: { width: 1080, height: 1080 },
  poster: null,
  durationMs: null,
  manifest: null,
  objectTags: tags,
});

const videoAsset = (id: string, order: number, poster: string, ratio: "reel" | "wide"): SocialMediaAsset => ({
  id,
  order,
  kind: "video",
  url: `/fixtures/${id}.mp4`,
  dimensions: ratio === "reel" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
  poster: {
    url: poster,
    dimensions: ratio === "reel" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 },
  },
  durationMs: ratio === "reel" ? 12000 : 28000,
  manifest: videoManifest(id),
  objectTags: [tag(id, "outer", "pl-barbour-bedale", 0.34, 0.18)],
});

export const MIXED_FEED_FIXTURE_POSTS: readonly Post[] = [
  {
    id: "fixture-feed-photo",
    creatorId: "c-hana",
    image: "/looks/look6.jpg",
    ratio: 1,
    caption: "사진 한 장에서 바로 태그를 확인하는 fixture photo.",
    category: "fashion",
    likes: 0,
    objects: [],
    createdAt: "2026-09-01T10:00:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("fixture-photo-asset", 0, "/looks/look6.jpg", [
        tag("fixture-photo-asset", "shirt", "plw-polo-oxford", 0.36, 0.2),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "task-6-mixed-feed/photo" },
    disclosure: FIXTURE_DISCLOSURE,
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-carousel",
    creatorId: "c-yun",
    image: "/looks/look7.jpg",
    ratio: 1,
    caption: "슬라이드마다 다른 태그를 갖는 fixture carousel.",
    category: "fashion",
    likes: 0,
    objects: [],
    createdAt: "2026-09-01T09:00:00+09:00",
    contentKind: "carousel",
    assets: [
      imageAsset("fixture-carousel-one", 0, "/looks/look7.jpg", [
        tag("fixture-carousel-one", "jacket", "plw-barbour-beadnell", 0.35, 0.18),
      ]),
      imageAsset("fixture-carousel-two", 1, "/looks/look8.jpg", [
        tag("fixture-carousel-two", "bag", "plw-celine-bag", 0.54, 0.3),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "task-6-mixed-feed/carousel" },
    disclosure: FIXTURE_DISCLOSURE,
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-reel",
    creatorId: "c-june",
    image: "/looks/look9.jpg",
    ratio: 9 / 16,
    caption: "포스터와 재생 실패 fallback을 가진 fixture reel.",
    category: "fashion",
    likes: 0,
    objects: [],
    createdAt: "2026-09-01T08:00:00+09:00",
    contentKind: "reel",
    assets: [videoAsset("fixture-reel", 0, "/looks/look9.jpg", "reel")],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "task-6-mixed-feed/reel" },
    disclosure: FIXTURE_DISCLOSURE,
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-video",
    creatorId: "c-dae",
    image: "/looks/look1.jpg",
    ratio: 16 / 9,
    caption: "가로형 포스터 fallback을 가진 fixture video.",
    category: "fashion",
    likes: 0,
    objects: [],
    createdAt: "2026-09-01T07:00:00+09:00",
    contentKind: "video",
    assets: [videoAsset("fixture-video", 0, "/looks/look1.jpg", "wide")],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "task-6-mixed-feed/video" },
    disclosure: FIXTURE_DISCLOSURE,
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-lookbook",
    creatorId: "c-ara",
    image: "/looks/look10.jpg",
    ratio: 1,
    caption: "lookbook fixture는 편집 출처와 상품 태그를 함께 보여줍니다.",
    category: "fashion",
    likes: 0,
    objects: [],
    createdAt: "2026-09-01T06:00:00+09:00",
    contentKind: "lookbook",
    assets: [
      imageAsset("fixture-lookbook", 0, "/looks/look10.jpg", [
        tag("fixture-lookbook", "knit", "pl-ami-knit", 0.35, 0.25),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "task-6-mixed-feed/lookbook" },
    disclosure: { kind: "editorial", label: "Fixture editorial" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
] as const;
