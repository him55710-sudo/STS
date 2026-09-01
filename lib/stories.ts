import type { Category, SocialDisclosure, SocialMediaAsset, SocialRights, SocialSourceRecord } from "./types";

export type StoryDirection = "previous" | "next";

export type ManualStoryNavigation = {
  readonly currentIndex: number;
  readonly direction: StoryDirection;
  readonly storyCount: number;
};

export type Story = {
  readonly id: string;
  readonly creatorId: string;
  readonly image: string;
  readonly contentKind: "story";
  readonly assets: readonly SocialMediaAsset[];
  readonly sourceRecord: SocialSourceRecord;
  readonly disclosure: SocialDisclosure;
  readonly rights: SocialRights;
  readonly category: Category;
  readonly title: string;
  readonly subtitle: string;
  readonly productCount: number;
  readonly postedLabel: string;
  readonly is_demo: true;
  readonly source: "demo-seed";
};

type DemoStorySeed = {
  readonly id: string;
  readonly creatorId: string;
  readonly image: string;
  readonly category: Category;
  readonly title: string;
  readonly subtitle: string;
  readonly productCount: number;
  readonly postedLabel: string;
};

const DEMO_STORY_DISCLOSURE = {
  kind: "none",
  label: null,
} as const satisfies SocialDisclosure;

const DEMO_STORY_RIGHTS = {
  kind: "demo",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: false,
  canRedistribute: false,
  evidence: "STS local demo story seed; not a production commerce or rights claim.",
  expiresAt: null,
} as const satisfies SocialRights;

function demoStoryAsset(storyId: string, image: string): SocialMediaAsset {
  return {
    id: `asset-${storyId}`,
    order: 0,
    kind: "image",
    url: image,
    dimensions: { width: 1080, height: 1920 },
    poster: null,
    durationMs: null,
    manifest: null,
    objectTags: [],
  };
}

function demoStory(seed: DemoStorySeed): Story {
  return {
    ...seed,
    contentKind: "story",
    assets: [demoStoryAsset(seed.id, seed.image)],
    sourceRecord: {
      kind: "demo_seed",
      provider: "sts-demo",
      identity: `demo-seed/story/${seed.id}`,
      canonicalUrl: null,
    },
    disclosure: DEMO_STORY_DISCLOSURE,
    rights: DEMO_STORY_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  };
}

export function getManualStoryIndex({
  currentIndex,
  direction,
  storyCount,
}: ManualStoryNavigation): number {
  if (storyCount <= 0) return 0;

  switch (direction) {
    case "previous":
      return Math.max(0, currentIndex - 1);
    case "next":
      return Math.min(storyCount - 1, currentIndex + 1);
    default:
      return assertNever(direction);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected story direction: ${value}`);
}

export const STORIES: readonly Story[] = [
  demoStory({
    id: "story-minu-morning",
    creatorId: "c-nari",
    image: "/looks/look1.jpg",
    category: "fashion",
    title: "오늘의 옥스포드",
    subtitle: "같은 셔츠, 다른 실루엣",
    productCount: 4,
    postedLabel: "방금 전",
  }),
  demoStory({
    id: "story-hana-palette",
    creatorId: "c-hana",
    image: "/imported/asset_943d1003d847bb01-insta_ootd_1.jpg",
    category: "fashion",
    title: "late summer palette",
    subtitle: "sky blue and washed denim",
    productCount: 3,
    postedLabel: "4분 전",
  }),
  demoStory({
    id: "story-yun-closet",
    creatorId: "c-yun",
    image: "/imported/asset_20e358cab2c3e704-insta_ootd_2.jpg",
    category: "fashion",
    title: "출근 전 옷장",
    subtitle: "오늘 저장한 세 가지",
    productCount: 3,
    postedLabel: "7분 전",
  }),
  demoStory({
    id: "story-eun-detail",
    creatorId: "c-ara",
    image: "/looks/look8.jpg",
    category: "fashion",
    title: "소재를 남기는 룩",
    subtitle: "그레이지와 블랙의 비율",
    productCount: 5,
    postedLabel: "11분 전",
  }),
  demoStory({
    id: "story-june-shoe",
    creatorId: "c-june",
    image: "/imported/asset_d99e8deff6d3b3a0-insta_ootd_3.jpg",
    category: "fashion",
    title: "오늘의 신발",
    subtitle: "매일 신어도 질리지 않는 한 켤레",
    productCount: 1,
    postedLabel: "15분 전",
  }),
  demoStory({
    id: "story-rin-outdoor",
    creatorId: "c-jiho",
    image: "/looks/look9.jpg",
    category: "fashion",
    title: "city trail notes",
    subtitle: "도시와 야외 사이의 레이어",
    productCount: 6,
    postedLabel: "22분 전",
  }),
  demoStory({
    id: "story-soo-archive",
    creatorId: "c-soo",
    image: "/imported/asset_74a10c566fd66eb7-insta_ootd_4.jpg",
    category: "fashion",
    title: "weekend archive",
    subtitle: "사진 속 물건을 다시 고르는 시간",
    productCount: 4,
    postedLabel: "30분 전",
  }),
  demoStory({
    id: "story-dae-look",
    creatorId: "c-dae",
    image: "/imported/asset_0858cc05f8f9d94e-real_fashion_01.jpg",
    category: "fashion",
    title: "one photo, five tags",
    subtitle: "먼저 찾고 싶은 물건부터 탭하세요",
    productCount: 5,
    postedLabel: "43분 전",
  }),
];
