import type { Creator, Post, SocialDisclosure, SocialMediaAsset, SocialRights, SocialSourceRecord } from "./types";

const DEMO_SOURCE_RECORD = {
  kind: "demo_seed",
  provider: "sts-demo",
  identity: "demo-seed/social-content",
  canonicalUrl: null,
} as const satisfies SocialSourceRecord;

const DEMO_DISCLOSURE = {
  kind: "none",
  label: null,
} as const satisfies SocialDisclosure;

const DEMO_RIGHTS = {
  kind: "demo",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: false,
  canRedistribute: false,
  evidence: "STS local demo seed; not a production commerce or rights claim.",
  expiresAt: null,
} as const satisfies SocialRights;

type DemoPostSeed = {
  readonly id: string;
  readonly creatorId: string;
  readonly image: string;
  readonly ratio: number;
  readonly caption: string;
  readonly category: Post["category"];
  readonly likes: number;
  readonly createdAt: string;
};

function demoPhotoAsset(postId: string, image: string): SocialMediaAsset {
  return {
    id: `asset-${postId}`,
    order: 0,
    kind: "image",
    url: image,
    dimensions: { width: 1080, height: 1080 },
    poster: null,
    durationMs: null,
    manifest: null,
    objectTags: [],
  };
}

function demoPhotoPost(seed: DemoPostSeed): Post {
  return {
    ...seed,
    objects: [],
    contentKind: "photo",
    assets: [demoPhotoAsset(seed.id, seed.image)],
    sourceRecord: { ...DEMO_SOURCE_RECORD, identity: `demo-seed/post/${seed.id}` },
    disclosure: DEMO_DISCLOSURE,
    rights: DEMO_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  };
}

export const DEMO_CREATORS: readonly Creator[] = [
  {
    id: "c-hana",
    handle: "hana.weekday",
    name: "한유나",
    bio: "평일에 더 자주 입는 룩을 기록합니다",
    followers: 48200,
    category: "fashion",
    tone: "#7D756E",
    avatarImage: "/imported/asset_943d1003d847bb01-insta_ootd_1.jpg",
    verified: true,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-yun",
    handle: "yun.closet",
    name: "윤지민",
    bio: "입기 쉬운 옷과 오래 쓰는 물건",
    followers: 37100,
    category: "fashion",
    tone: "#5F6A70",
    avatarImage: "/imported/asset_20e358cab2c3e704-insta_ootd_2.jpg",
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-june",
    handle: "june.selected",
    name: "박준서",
    bio: "한 켤레를 오래 신는 사람의 기록",
    followers: 65300,
    category: "fashion",
    tone: "#56544F",
    avatarImage: "/imported/asset_d99e8deff6d3b3a0-insta_ootd_3.jpg",
    verified: true,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-soo",
    handle: "soo.frame",
    name: "정수아",
    bio: "사진에서 시작하는 주말 스타일",
    followers: 29100,
    category: "lifestyle",
    tone: "#8B7A72",
    avatarImage: "/imported/asset_74a10c566fd66eb7-insta_ootd_4.jpg",
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-dae",
    handle: "dae.archive",
    name: "김대현",
    bio: "보이는 것의 이름을 찾아둡니다",
    followers: 82400,
    category: "fashion",
    tone: "#4F5855",
    avatarImage: "/imported/asset_0858cc05f8f9d94e-real_fashion_01.jpg",
    verified: true,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-nari",
    handle: "nari.object",
    name: "이나리",
    bio: "옷과 소품의 좋은 비율을 찾습니다",
    followers: 41300,
    category: "fashion",
    tone: "#796B64",
    avatarImage: "/imported/asset_d3a85e7aaf658755-real_fashion_02.jpg",
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-jiho",
    handle: "jiho.finds",
    name: "문지호",
    bio: "도시에서 발견한 실용적인 선택",
    followers: 33700,
    category: "lifestyle",
    tone: "#596069",
    avatarImage: "/imported/asset_1be01c06c5ba9c9e-real_fashion_03.jpg",
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "c-ara",
    handle: "ara.tonight",
    name: "오아라",
    bio: "낮과 밤 사이의 옷을 모읍니다",
    followers: 51800,
    category: "fashion",
    tone: "#6F6464",
    avatarImage: "/imported/asset_b9c24706a0511b84-real_fashion_04.jpg",
    verified: true,
    is_demo: true,
    source: "demo-seed",
  },
];

export const DEMO_POSTS: readonly Post[] = [
  demoPhotoPost({ id: "demo-post-hana", creatorId: "c-hana", image: "/imported/asset_943d1003d847bb01-insta_ootd_1.jpg", ratio: 1, caption: "바쁜 날일수록 상의와 하의의 온도를 맞춰 입어요.", category: "fashion", likes: 3841, createdAt: "2026-08-26T13:52:00+09:00" }),
  demoPhotoPost({ id: "demo-post-yun", creatorId: "c-yun", image: "/imported/asset_20e358cab2c3e704-insta_ootd_2.jpg", ratio: 1, caption: "눈에 덜 띄지만 매일 손이 가는 조합.", category: "fashion", likes: 2914, createdAt: "2026-08-26T13:28:00+09:00" }),
  demoPhotoPost({ id: "demo-post-june", creatorId: "c-june", image: "/imported/asset_d99e8deff6d3b3a0-insta_ootd_3.jpg", ratio: 1, caption: "새것보다 지금 가장 편한 신발을 골랐습니다.", category: "fashion", likes: 4726, createdAt: "2026-08-26T12:46:00+09:00" }),
  demoPhotoPost({ id: "demo-post-soo", creatorId: "c-soo", image: "/imported/asset_74a10c566fd66eb7-insta_ootd_4.jpg", ratio: 1, caption: "사진 한 장에 남기고 싶은 주말의 질감.", category: "lifestyle", likes: 2378, createdAt: "2026-08-26T12:19:00+09:00" }),
  demoPhotoPost({ id: "demo-post-dae", creatorId: "c-dae", image: "/imported/asset_0858cc05f8f9d94e-real_fashion_01.jpg", ratio: 1, caption: "오늘 사진에서 궁금했던 물건을 먼저 적어두는 중입니다.", category: "fashion", likes: 5183, createdAt: "2026-08-26T11:43:00+09:00" }),
  demoPhotoPost({ id: "demo-post-nari", creatorId: "c-nari", image: "/imported/asset_d3a85e7aaf658755-real_fashion_02.jpg", ratio: 1, caption: "가방 하나로 룩의 속도를 바꾸는 날.", category: "fashion", likes: 3427, createdAt: "2026-08-26T10:58:00+09:00" }),
  demoPhotoPost({ id: "demo-post-jiho", creatorId: "c-jiho", image: "/imported/asset_1be01c06c5ba9c9e-real_fashion_03.jpg", ratio: 1, caption: "도시를 오래 걷는 날의 실용적인 선택들.", category: "lifestyle", likes: 2696, createdAt: "2026-08-26T10:24:00+09:00" }),
  demoPhotoPost({ id: "demo-post-ara", creatorId: "c-ara", image: "/imported/asset_b9c24706a0511b84-real_fashion_04.jpg", ratio: 1, caption: "색은 줄이고, 남길 디테일은 분명하게.", category: "fashion", likes: 4092, createdAt: "2026-08-26T09:49:00+09:00" }),
];
