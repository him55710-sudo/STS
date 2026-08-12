import type { Creator, Post, Product } from "./types";

/**
 * 데모 시드 카탈로그.
 * 브랜드·상품·가격은 모두 데모용 가상 데이터이며, 이미지는 AI로 생성한 샘플이다.
 * 판매처 링크는 시연용으로 각 커머스 홈으로 연결된다 (MVP는 link-out only).
 */

export const PRODUCTS: Product[] = [
  // ── Lifestyle / 오브세라 ─────────────────────────────
  { id: "p-mug", brand: "오브세라", name: "매트 세라믹 머그", price: 32000, currency: "KRW", retailer: "29CM", url: "https://www.29cm.co.kr", image: "/seed/prod-mug.svg", category: "lifestyle", affiliate: true, similarIds: ["p-mug-2", "p-mug-3"] },
  { id: "p-mug-2", brand: "오브세라", name: "스페클 스톤웨어 머그", price: 28000, currency: "KRW", retailer: "오늘의집", url: "https://ohou.se", image: "/seed/prod-mug-2.svg", category: "lifestyle", affiliate: true, similarIds: ["p-mug", "p-mug-3"] },
  { id: "p-mug-3", brand: "오브세라", name: "아이보리 라떼 컵 & 소서", price: 39000, currency: "KRW", retailer: "29CM", url: "https://www.29cm.co.kr", image: "/seed/prod-mug-3.svg", category: "lifestyle", affiliate: false, similarIds: ["p-mug", "p-mug-2"] },

  // ── Fashion / 스틸하우스 · 코먼서울 · 아뜰리에모르 ──
  { id: "p-coat", brand: "스틸하우스", name: "오버사이즈 울 코트", price: 289000, currency: "KRW", retailer: "W컨셉", url: "https://www.wconcept.co.kr", image: "/seed/prod-coat.svg", category: "fashion", affiliate: true, similarIds: ["p-coat-2"] },
  { id: "p-coat-2", brand: "스틸하우스", name: "카멜 싱글 코트", price: 259000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-coat-2.svg", category: "fashion", affiliate: true, similarIds: ["p-coat"] },
  { id: "p-shirt", brand: "스틸하우스", name: "오버사이즈 코튼 셔츠", price: 89000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-shirt.svg", category: "fashion", affiliate: true, similarIds: ["p-coat"] },
  { id: "p-jeans", brand: "코먼서울", name: "스트레이트 데님 팬츠", price: 79000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-jeans.svg", category: "fashion", affiliate: true, similarIds: ["p-shirt"] },
  { id: "p-loafers", brand: "아뜰리에 모르", name: "페니 레더 로퍼", price: 189000, currency: "KRW", retailer: "29CM", url: "https://www.29cm.co.kr", image: "/seed/prod-loafers.svg", category: "fashion", affiliate: true, similarIds: ["p-loafers-2", "p-sneakers"] },
  { id: "p-loafers-2", brand: "아뜰리에 모르", name: "청키솔 레더 로퍼", price: 210000, currency: "KRW", retailer: "W컨셉", url: "https://www.wconcept.co.kr", image: "/seed/prod-loafers-2.svg", category: "fashion", affiliate: false, similarIds: ["p-loafers"] },
  { id: "p-bag", brand: "아뜰리에 모르", name: "레더 숄더백", price: 168000, currency: "KRW", retailer: "W컨셉", url: "https://www.wconcept.co.kr", image: "/seed/prod-bag.svg", category: "fashion", affiliate: true, similarIds: ["p-bag-2"] },
  { id: "p-bag-2", brand: "아뜰리에 모르", name: "퀼팅 체인 미니백", price: 148000, currency: "KRW", retailer: "에이블리", url: "https://m.a-bly.com", image: "/seed/prod-bag-2.svg", category: "fashion", affiliate: true, similarIds: ["p-bag"] },
  { id: "p-hoodie", brand: "코먼서울", name: "오버핏 코튼 후디", price: 69000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-hoodie.svg", category: "fashion", affiliate: true, similarIds: ["p-shirt"] },
  { id: "p-cap", brand: "코먼서울", name: "코튼 볼캡", price: 35000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-cap.svg", category: "fashion", affiliate: false, similarIds: ["p-hoodie"] },
  { id: "p-sneakers", brand: "노드바이", name: "청키 레더 스니커즈", price: 129000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-sneakers.svg", category: "fashion", affiliate: true, similarIds: ["p-sneakers-2", "p-loafers"] },
  { id: "p-sneakers-2", brand: "노드바이", name: "캔버스 로우탑", price: 59000, currency: "KRW", retailer: "에이블리", url: "https://m.a-bly.com", image: "/seed/prod-sneakers-2.svg", category: "fashion", affiliate: true, similarIds: ["p-sneakers"] },
  { id: "p-crossbody", brand: "노드바이", name: "나일론 크로스백", price: 49000, currency: "KRW", retailer: "무신사", url: "https://www.musinsa.com", image: "/seed/prod-crossbody.svg", category: "fashion", affiliate: true, similarIds: ["p-bag"] },

  // ── Tech / 그리드랩 · 룩스온 · 톤오디오 ─────────────
  { id: "p-monitor", brand: "그리드랩", name: "슬림 베젤 27형 모니터", price: 429000, currency: "KRW", retailer: "쿠팡", url: "https://www.coupang.com", image: "/seed/prod-monitor.svg", category: "tech", affiliate: true, similarIds: ["p-keyboard"] },
  { id: "p-keyboard", brand: "그리드랩", name: "로우프로파일 기계식 키보드", price: 159000, currency: "KRW", retailer: "쿠팡", url: "https://www.coupang.com", image: "/seed/prod-keyboard.svg", category: "tech", affiliate: true, similarIds: ["p-keyboard-2"] },
  { id: "p-keyboard-2", brand: "그리드랩", name: "컴팩트 베이지 키보드", price: 139000, currency: "KRW", retailer: "29CM", url: "https://www.29cm.co.kr", image: "/seed/prod-keyboard-2.svg", category: "tech", affiliate: false, similarIds: ["p-keyboard"] },
  { id: "p-lamp", brand: "룩스온", name: "아티큘레이트 데스크 램프", price: 98000, currency: "KRW", retailer: "오늘의집", url: "https://ohou.se", image: "/seed/prod-lamp.svg", category: "tech", affiliate: true, similarIds: ["p-floorlamp"] },
  { id: "p-headphones", brand: "톤오디오", name: "크림 오버이어 헤드폰", price: 329000, currency: "KRW", retailer: "쿠팡", url: "https://www.coupang.com", image: "/seed/prod-headphones.svg", category: "tech", affiliate: true, similarIds: ["p-keyboard"] },

  // ── Interior / 하우스오브톤 ─────────────────────────
  { id: "p-sofa", brand: "하우스오브톤", name: "그레이지 패브릭 3인 소파", price: 1290000, currency: "KRW", retailer: "오늘의집", url: "https://ohou.se", image: "/seed/prod-sofa.svg", category: "interior", affiliate: true, similarIds: ["p-sofa-2"] },
  { id: "p-sofa-2", brand: "하우스오브톤", name: "부클레 2인 소파", price: 890000, currency: "KRW", retailer: "오늘의집", url: "https://ohou.se", image: "/seed/prod-sofa-2.svg", category: "interior", affiliate: true, similarIds: ["p-sofa"] },
  { id: "p-floorlamp", brand: "하우스오브톤", name: "블랙 스틸 플로어 램프", price: 189000, currency: "KRW", retailer: "오늘의집", url: "https://ohou.se", image: "/seed/prod-floorlamp.svg", category: "interior", affiliate: true, similarIds: ["p-lamp"] },
  { id: "p-sidetable", brand: "하우스오브톤", name: "라운드 오크 사이드 테이블", price: 219000, currency: "KRW", retailer: "29CM", url: "https://www.29cm.co.kr", image: "/seed/prod-sidetable.svg", category: "interior", affiliate: false, similarIds: ["p-sofa"] },

  // ── Beauty / 글로우랩 ────────────────────────────────
  { id: "p-serum", brand: "글로우랩", name: "리페어 앰플 세럼 30ml", price: 42000, currency: "KRW", retailer: "올리브영", url: "https://www.oliveyoung.co.kr", image: "/seed/prod-serum.svg", category: "beauty", affiliate: true, similarIds: ["p-serum-2"] },
  { id: "p-serum-2", brand: "글로우랩", name: "비타 브라이트닝 세럼", price: 38000, currency: "KRW", retailer: "올리브영", url: "https://www.oliveyoung.co.kr", image: "/seed/prod-serum-2.svg", category: "beauty", affiliate: true, similarIds: ["p-serum"] },
  { id: "p-cream", brand: "글로우랩", name: "배리어 크림 50ml", price: 36000, currency: "KRW", retailer: "올리브영", url: "https://www.oliveyoung.co.kr", image: "/seed/prod-cream.svg", category: "beauty", affiliate: true, similarIds: ["p-serum"] },
  { id: "p-toner", brand: "글로우랩", name: "pH 밸런싱 토너 250ml", price: 24000, currency: "KRW", retailer: "올리브영", url: "https://www.oliveyoung.co.kr", image: "/seed/prod-toner.svg", category: "beauty", affiliate: false, similarIds: ["p-cream"] },
];

export const CREATORS: Creator[] = [
  { id: "c-daily", handle: "daily.bam", name: "김하은", bio: "잔잔한 일상과 좋은 물건들 ☕", followers: 48200, category: "lifestyle", tone: "#B9AFA3" },
  { id: "c-seoul", handle: "seoul.edit", name: "이수민", bio: "서울의 옷장. OOTD 아카이브", followers: 142000, category: "fashion", tone: "#9AA0A8" },
  { id: "c-desk", handle: "deskgram", name: "박준서", bio: "데스크셋업 & 생산성 장비", followers: 31500, category: "tech", tone: "#8C9199" },
  { id: "c-haus", handle: "haus.min", name: "최민아", bio: "36㎡ 신혼집 기록 🏠", followers: 67800, category: "interior", tone: "#A8A29A" },
  { id: "c-glow", handle: "glow.archive", name: "정유나", bio: "성분으로 고르는 스킨케어", followers: 89400, category: "beauty", tone: "#B3A8AC" },
  { id: "c-mono", handle: "street.mono", name: "한도윤", bio: "흑백의 스트리트 무드", followers: 23600, category: "fashion", tone: "#7E8288" },
  { id: "c-me", handle: "me.objet", name: "나", bio: "내 콘텐츠", followers: 0, category: "lifestyle", tone: "#77727F" },
];

/**
 * 피드 게시물 — objects 좌표는 생성 이미지에 대해 Gemini detection으로 산출 후 수동 검수한 값.
 */
export const POSTS: Post[] = [
  {
    id: "post-ootd",
    creatorId: "c-seoul",
    image: "/seed/feed-ootd.svg",
    ratio: 0.75,
    caption: "쌀쌀해지기 시작한 날의 첫 코트. 전부 태그해뒀어요 🧥",
    category: "fashion",
    likes: 4821,
    createdAt: "2026-08-10T09:12:00+09:00",
    objects: [
      { id: "o-ootd-coat", label: "울 코트", x: 0.367, y: 0.178, w: 0.267, h: 0.36, productId: "p-coat", exactness: "exact", confidence: 0.93 },
      { id: "o-ootd-shirt", label: "화이트 셔츠", x: 0.453, y: 0.183, w: 0.093, h: 0.157, productId: "p-shirt", exactness: "exact", confidence: 0.88 },
      { id: "o-ootd-jeans", label: "데님 팬츠", x: 0.451, y: 0.479, w: 0.098, h: 0.17, productId: "p-jeans", exactness: "similar", confidence: 0.74 },
      { id: "o-ootd-loafers", label: "레더 로퍼", x: 0.431, y: 0.628, w: 0.138, h: 0.052, productId: "p-loafers", exactness: "exact", confidence: 0.9 },
      { id: "o-ootd-bag", label: "숄더백", x: 0.547, y: 0.323, w: 0.102, h: 0.085, productId: "p-bag", exactness: "exact", confidence: 0.86 },
    ],
  },
  {
    id: "post-mug",
    creatorId: "c-daily",
    image: "/seed/feed-mug.svg",
    ratio: 0.75,
    caption: "아침을 여는 창가의 머그 한 잔 ☕ 요즘 매일 쓰는 컵이에요",
    category: "lifestyle",
    likes: 2934,
    createdAt: "2026-08-11T08:03:00+09:00",
    objects: [
      { id: "o-mug-cup", label: "세라믹 머그", x: 0.242, y: 0.453, w: 0.249, h: 0.167, productId: "p-mug", exactness: "exact", confidence: 0.95 },
      { id: "o-mug-vase", label: "세라믹 베이스", x: 0.753, y: 0.397, w: 0.116, h: 0.187, productId: null, exactness: "similar", confidence: 0.62 },
    ],
  },
  {
    id: "post-desk",
    creatorId: "c-desk",
    image: "/seed/feed-desk.svg",
    ratio: 0.75,
    caption: "2026 데스크셋업 근황. 키보드 질문 많았는데 드디어 태그로 답합니다",
    category: "tech",
    likes: 5127,
    createdAt: "2026-08-09T21:44:00+09:00",
    objects: [
      { id: "o-desk-monitor", label: "모니터", x: 0.271, y: 0.227, w: 0.457, h: 0.289, productId: "p-monitor", exactness: "similar", confidence: 0.78 },
      { id: "o-desk-keyboard", label: "기계식 키보드", x: 0.322, y: 0.59, w: 0.333, h: 0.09, productId: "p-keyboard", exactness: "exact", confidence: 0.91 },
      { id: "o-desk-lamp", label: "데스크 램프", x: 0.078, y: 0.395, w: 0.231, h: 0.148, productId: "p-lamp", exactness: "exact", confidence: 0.89 },
      { id: "o-desk-headphones", label: "헤드폰", x: 0.756, y: 0.413, w: 0.177, h: 0.125, productId: "p-headphones", exactness: "exact", confidence: 0.92 },
    ],
  },
  {
    id: "post-interior",
    creatorId: "c-haus",
    image: "/seed/feed-interior.svg",
    ratio: 0.75,
    caption: "거실 코너 완성. 소파 배송 3주 기다린 보람이 있다 🛋️",
    category: "interior",
    likes: 8213,
    createdAt: "2026-08-08T19:30:00+09:00",
    objects: [
      { id: "o-int-sofa", label: "패브릭 소파", x: 0.1, y: 0.498, w: 0.573, h: 0.203, productId: "p-sofa", exactness: "exact", confidence: 0.94 },
      { id: "o-int-lamp", label: "플로어 램프", x: 0.733, y: 0.348, w: 0.133, h: 0.367, productId: "p-floorlamp", exactness: "exact", confidence: 0.9 },
      { id: "o-int-table", label: "사이드 테이블", x: 0.756, y: 0.78, w: 0.2, h: 0.107, productId: "p-sidetable", exactness: "similar", confidence: 0.71 },
    ],
  },
  {
    id: "post-beauty",
    creatorId: "c-glow",
    image: "/seed/feed-beauty.svg",
    ratio: 0.75,
    caption: "환절기 루틴 3종. 순서대로 토너 → 세럼 → 크림",
    category: "beauty",
    likes: 3642,
    createdAt: "2026-08-11T12:20:00+09:00",
    objects: [
      { id: "o-b-serum", label: "앰플 세럼", x: 0.213, y: 0.423, w: 0.152, h: 0.253, productId: "p-serum", exactness: "exact", confidence: 0.93 },
      { id: "o-b-cream", label: "크림", x: 0.419, y: 0.533, w: 0.206, h: 0.151, productId: "p-cream", exactness: "exact", confidence: 0.9 },
      { id: "o-b-toner", label: "토너", x: 0.69, y: 0.422, w: 0.132, h: 0.27, productId: "p-toner", exactness: "exact", confidence: 0.87 },
    ],
  },
  {
    id: "post-street",
    creatorId: "c-mono",
    image: "/seed/feed-street.svg",
    ratio: 0.75,
    caption: "회색과 검정 사이. 후디는 오버핏 추천",
    category: "fashion",
    likes: 1958,
    createdAt: "2026-08-07T17:05:00+09:00",
    objects: [
      { id: "o-st-hoodie", label: "오버핏 후디", x: 0.398, y: 0.2, w: 0.204, h: 0.212, productId: "p-hoodie", exactness: "exact", confidence: 0.92 },
      { id: "o-st-cap", label: "볼캡", x: 0.42, y: 0.108, w: 0.18, h: 0.075, productId: "p-cap", exactness: "exact", confidence: 0.88 },
      { id: "o-st-sneakers", label: "스니커즈", x: 0.418, y: 0.632, w: 0.164, h: 0.06, productId: "p-sneakers", exactness: "exact", confidence: 0.91 },
      { id: "o-st-bag", label: "크로스백", x: 0.502, y: 0.3, w: 0.098, h: 0.068, productId: "p-crossbody", exactness: "similar", confidence: 0.69 },
    ],
  },
  // ── Discover 전용 에디토리얼 게시물 ──────────────────
  {
    id: "post-sneaker",
    creatorId: "c-mono",
    image: "/seed/disc-sneaker.svg",
    ratio: 1,
    caption: "이번 시즌 가장 많이 신은 신발",
    category: "fashion",
    likes: 1211,
    createdAt: "2026-08-05T10:00:00+09:00",
    objects: [
      { id: "o-dsn", label: "스니커즈", x: 0.259, y: 0.43, w: 0.59, h: 0.312, productId: "p-sneakers", exactness: "exact", confidence: 0.95 },
    ],
  },
  {
    id: "post-bag",
    creatorId: "c-seoul",
    image: "/seed/disc-bag.svg",
    ratio: 0.75,
    caption: "탠 컬러 토트, 가을 준비",
    category: "fashion",
    likes: 987,
    createdAt: "2026-08-04T15:00:00+09:00",
    objects: [
      { id: "o-dbg", label: "레더 토트백", x: 0.324, y: 0.385, w: 0.352, h: 0.256, productId: "p-bag-2", exactness: "similar", confidence: 0.66 },
    ],
  },
  {
    id: "post-sunglasses",
    creatorId: "c-seoul",
    image: "/seed/disc-sunglasses.svg",
    ratio: 1,
    caption: "여름의 마지막 장비",
    category: "fashion",
    likes: 754,
    createdAt: "2026-08-03T13:00:00+09:00",
    objects: [
      { id: "o-dsg", label: "선글라스", x: 0.227, y: 0.433, w: 0.547, h: 0.153, productId: null, exactness: "similar", confidence: 0.58 },
    ],
  },
  {
    id: "post-perfume",
    creatorId: "c-glow",
    image: "/seed/disc-perfume.svg",
    ratio: 0.75,
    caption: "요즘 매일 뿌리는 향",
    category: "beauty",
    likes: 1420,
    createdAt: "2026-08-02T18:00:00+09:00",
    objects: [
      { id: "o-dpf", label: "퍼퓸", x: 0.402, y: 0.316, w: 0.197, h: 0.225, productId: null, exactness: "similar", confidence: 0.61 },
    ],
  },
  {
    id: "post-chair",
    creatorId: "c-haus",
    image: "/seed/disc-chair.svg",
    ratio: 0.75,
    caption: "오후 4시의 라운지 체어",
    category: "interior",
    likes: 2033,
    createdAt: "2026-08-01T16:00:00+09:00",
    objects: [
      { id: "o-dch", label: "라운지 체어", x: 0.271, y: 0.4, w: 0.413, h: 0.307, productId: "p-sofa-2", exactness: "similar", confidence: 0.64 },
    ],
  },
  {
    id: "post-watch",
    creatorId: "c-desk",
    image: "/seed/disc-watch.svg",
    ratio: 1,
    caption: "미니멀의 기준",
    category: "fashion",
    likes: 1688,
    createdAt: "2026-07-31T11:00:00+09:00",
    objects: [
      { id: "o-dwt", label: "손목시계", x: 0.383, y: 0.279, w: 0.235, h: 0.398, productId: null, exactness: "similar", confidence: 0.6 },
    ],
  },
  {
    id: "post-knit",
    creatorId: "c-seoul",
    image: "/seed/disc-knit.svg",
    ratio: 0.75,
    caption: "니트 정리하다가 발견한 톤온톤",
    category: "fashion",
    likes: 845,
    createdAt: "2026-07-30T20:00:00+09:00",
    objects: [],
  },
  {
    id: "post-vase",
    creatorId: "c-daily",
    image: "/seed/disc-vase.svg",
    ratio: 0.75,
    caption: "콘솔 위 오브제 두 점",
    category: "interior",
    likes: 623,
    createdAt: "2026-07-29T09:00:00+09:00",
    objects: [],
  },
];

export const productById = (id: string | null | undefined) =>
  PRODUCTS.find((p) => p.id === id);

export const creatorById = (id: string) => CREATORS.find((c) => c.id === id)!;

export const CATEGORY_LABEL: Record<string, string> = {
  fashion: "패션",
  beauty: "뷰티",
  interior: "인테리어",
  tech: "테크",
  lifestyle: "라이프",
};
