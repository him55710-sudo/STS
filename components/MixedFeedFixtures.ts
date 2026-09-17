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

const tag = (
  assetId: string,
  label: string,
  productId: string | null,
  x: number,
  y: number,
  w: number = 0.16,
  h: number = 0.12,
  polygon?: [number, number][]
): MediaObjectTag => ({
  id: `tag-${assetId}-${label}`,
  ownerAssetId: assetId,
  label,
  x,
  y,
  w,
  h,
  polygon,
  productId,
  exactness: productId ? "exact" : "review",
  confidence: productId ? 0.99 : 0.85,
});

// 재사용 가능한 입술/볼/이마 정밀 폴리곤 좌표 (0~1 normalized)
const POLYGON_LIPS: [number, number][] = [
  [0.44, 0.615],
  [0.47, 0.595],
  [0.50, 0.605],
  [0.53, 0.595],
  [0.56, 0.615],
  [0.58, 0.635],
  [0.55, 0.665],
  [0.50, 0.682],
  [0.45, 0.665],
  [0.42, 0.635],
];

const POLYGON_CHEEK_LEFT: [number, number][] = [
  [0.26, 0.47],
  [0.35, 0.44],
  [0.42, 0.48],
  [0.43, 0.56],
  [0.38, 0.62],
  [0.29, 0.60],
  [0.24, 0.53],
];

const POLYGON_TZONE: [number, number][] = [
  [0.40, 0.28],
  [0.50, 0.25],
  [0.60, 0.28],
  [0.58, 0.35],
  [0.53, 0.38],
  [0.52, 0.47],
  [0.48, 0.47],
  [0.47, 0.38],
  [0.42, 0.35],
];

const POLYGON_CONTOUR: [number, number][] = [
  [0.32, 0.66],
  [0.40, 0.73],
  [0.50, 0.76],
  [0.60, 0.73],
  [0.68, 0.66],
  [0.62, 0.71],
  [0.50, 0.745],
  [0.38, 0.71],
];

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
    id: "fixture-feed-yoon",
    creatorId: "c-yoon",
    image: "/kbeauty-models/model-glass-skin.jpg",
    ratio: 1,
    caption: "전 세계를 뒤흔든 K-뷰티 글래스 스킨 루틴 ✨ 백탁 없이 수분 로션처럼 스며드는 조선미녀 쌀선크림 + 달바 오일 세럼 듀오!",
    category: "beauty",
    likes: 24800,
    objects: [],
    createdAt: "2026-09-17T12:00:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-yoon-1", 0, "/kbeauty-models/model-glass-skin.jpg", [
        tag("asset-kb-yoon-1", "조선미녀 선크림", "kb-boj-sun", 0.40, 0.25, 0.20, 0.22, POLYGON_TZONE),
        tag("asset-kb-yoon-1", "달바 스프레이 세럼", "kb-dalba-serum", 0.24, 0.44, 0.19, 0.18, POLYGON_CHEEK_LEFT),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/yoon-glass-skin" },
    disclosure: { kind: "sponsored", label: "공식 앰버서더 협업" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-minji",
    creatorId: "c-minji",
    image: "/kbeauty-models/model-glow-lip.jpg",
    ratio: 1,
    caption: "쿨톤 탕후루 광택 립의 정석 🍇 롬앤 베어그레이프 바르고 클리오 쿠션으로 얇게 결 정리 끝!",
    category: "beauty",
    likes: 31200,
    objects: [],
    createdAt: "2026-09-17T11:30:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-minji-1", 0, "/kbeauty-models/model-glow-lip.jpg", [
        tag("asset-kb-minji-1", "롬앤 쥬시래스팅 틴트", "kb-romand-tint", 0.42, 0.59, 0.16, 0.10, POLYGON_LIPS),
        tag("asset-kb-minji-1", "클리오 킬커버 쿠션", "kb-clio-cushion", 0.24, 0.43, 0.20, 0.20, POLYGON_CHEEK_LEFT),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/minji-tint" },
    disclosure: { kind: "affiliate", label: "단독 마켓 특가" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-soyeon",
    creatorId: "c-soyeon",
    image: "/kbeauty-models/model-soothing-routine.jpg",
    ratio: 1,
    caption: "속당김 3초 만에 잡는 파란 세럼 💧 아누아 77 토너로 결 닦고 토리든 저분자 세럼 3겹 흡수시키기.",
    category: "beauty",
    likes: 18900,
    objects: [],
    createdAt: "2026-09-17T11:00:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-soyeon-1", 0, "/kbeauty-models/model-soothing-routine.jpg", [
        tag("asset-kb-soyeon-1", "아누아 어성초 77 토너", "kb-anua-toner", 0.40, 0.25, 0.20, 0.22, POLYGON_TZONE),
        tag("asset-kb-soyeon-1", "토리든 다이브인 세럼", "kb-torriden-serum", 0.24, 0.44, 0.19, 0.18, POLYGON_CHEEK_LEFT),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/soyeon-moisture" },
    disclosure: { kind: "partner", label: "브랜드 무료 협찬" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-chaewon",
    creatorId: "c-chaewon",
    image: "/kbeauty-models/model-cushion-base.jpg",
    ratio: 1,
    caption: "72시간 무너짐 없는 초밀착 도자기 베이스 🖤 올리브영 1위 클리오 쿠션 기획세트.",
    category: "beauty",
    likes: 27400,
    objects: [],
    createdAt: "2026-09-17T10:30:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-chaewon-1", 0, "/kbeauty-models/model-cushion-base.jpg", [
        tag("asset-kb-chaewon-1", "클리오 킬커버 쿠션", "kb-clio-cushion", 0.24, 0.43, 0.20, 0.20, POLYGON_CHEEK_LEFT),
        tag("asset-kb-chaewon-1", "롬앤 쥬시래스팅 틴트", "kb-romand-tint", 0.42, 0.59, 0.16, 0.10, POLYGON_LIPS),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/chaewon-base" },
    disclosure: { kind: "sponsored", label: "광고 제휴" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-haein",
    creatorId: "c-haein",
    image: "/kbeauty-models/model-device-care.jpg",
    ratio: 1,
    caption: "손으로 바르는 건 이제 그만! 메디큐브 에이지알 부스터프로로 화장품 유효성분 785% 깊숙이 흡수 ✨",
    category: "beauty",
    likes: 42100,
    objects: [],
    createdAt: "2026-09-17T10:00:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-haein-1", 0, "/kbeauty-models/model-device-care.jpg", [
        tag("asset-kb-haein-1", "메디큐브 에이지알 부스터프로", "kb-medicube-pro", 0.32, 0.66, 0.36, 0.15, POLYGON_CONTOUR),
        tag("asset-kb-haein-1", "달바 스프레이 세럼", "kb-dalba-serum", 0.24, 0.44, 0.19, 0.18, POLYGON_CHEEK_LEFT),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/haein-device" },
    disclosure: { kind: "affiliate", label: "단독 특가 마켓" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-eunji",
    creatorId: "c-eunji",
    image: "/kbeauty-models/model-barrier-night.jpg",
    ratio: 1,
    caption: "피부과 처방 1위 에스트라 아토베리어365 크림 + 라운드랩 수분크림 조합! 120시간 장벽 보습 유지.",
    category: "beauty",
    likes: 19500,
    objects: [],
    createdAt: "2026-09-17T09:30:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-eunji-1", 0, "/kbeauty-models/model-barrier-night.jpg", [
        tag("asset-kb-eunji-1", "에스트라 아토베리어 크림", "kb-aestura-cream", 0.24, 0.44, 0.19, 0.18, POLYGON_CHEEK_LEFT),
        tag("asset-kb-eunji-1", "라운드랩 자작나무 크림", "kb-roundlab-cream", 0.40, 0.25, 0.20, 0.22, POLYGON_TZONE),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/eunji-barrier" },
    disclosure: { kind: "partner", label: "제품 협찬" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-jiwoo",
    creatorId: "c-jiwoo",
    image: "/kbeauty-models/model-cleansing-pure.jpg",
    ratio: 1,
    caption: "블랙헤드 99.7% 녹이는 모공 딥클렌징 🫧 물에 닿자마자 하얗게 유화되는 마녀공장 퓨어 클렌징 오일!",
    category: "beauty",
    likes: 38400,
    objects: [],
    createdAt: "2026-09-17T09:00:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-jiwoo-1", 0, "/kbeauty-models/model-cleansing-pure.jpg", [
        tag("asset-kb-jiwoo-1", "마녀공장 퓨어 클렌징오일", "kb-manyo-oil", 0.40, 0.25, 0.20, 0.22, POLYGON_TZONE),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/jiwoo-cleansing" },
    disclosure: { kind: "affiliate", label: "공구 최저가" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  },
  {
    id: "fixture-feed-sarah",
    creatorId: "c-sarah",
    image: "/kbeauty-models/model-sun-daily.jpg",
    ratio: 1,
    caption: "매일 아침 바르는 데일리 수분 선케어 🌞 쌀추출물 30% 함유로 눈시림 제로, 촉촉한 물광 피부 완성!",
    category: "beauty",
    likes: 51200,
    objects: [],
    createdAt: "2026-09-17T08:30:00+09:00",
    contentKind: "photo",
    assets: [
      imageAsset("asset-kb-sarah-1", 0, "/kbeauty-models/model-sun-daily.jpg", [
        tag("asset-kb-sarah-1", "조선미녀 맑은쌀선크림", "kb-boj-sun", 0.40, 0.25, 0.20, 0.22, POLYGON_TZONE),
        tag("asset-kb-sarah-1", "롬앤 쥬시래스팅 틴트", "kb-romand-tint", 0.42, 0.59, 0.16, 0.10, POLYGON_LIPS),
      ]),
    ],
    sourceRecord: { ...FIXTURE_SOURCE, identity: "kbeauty/sarah-sun" },
    disclosure: { kind: "affiliate", label: "올리브영 공식 제휴" },
    rights: FIXTURE_RIGHTS,
    is_demo: true,
    source: "demo-seed",
  }
] as const;

