import { CREATOR_REVENUE_SHARE } from "@/lib/marketing-home";

export type BrandNavItem = {
  readonly label: string;
  readonly href: string;
};

export type PhoneSlide = {
  readonly image: string;
  readonly creator: string;
  readonly title: string;
  readonly product: string;
};

export type BrandChapterData = {
  readonly id: string;
  readonly number: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly steps: readonly string[];
  readonly flipped: boolean;
  readonly tone: "white" | "warm";
};

export type MatchStreamItem = {
  readonly creator: string;
  readonly object: string;
  readonly action: string;
};

export type Voice = {
  readonly quote: string;
  readonly name: string;
  readonly role: string;
  readonly tag: string;
};

export const BRAND_NAV_ITEMS: readonly BrandNavItem[] = [
  { label: "쇼핑하기", href: "/discover" },
  { label: "크리에이터", href: "/creator" },
  { label: "브랜드", href: "#inquiry" },
  { label: "회사", href: "#about" },
  { label: "지원", href: "#inquiry" },
] as const;

export const PHONE_SLIDES: readonly PhoneSlide[] = [
  { image: "/looks/look4.jpg", creator: "minu.archive", title: "오늘의 플리스", product: "아웃도어 레이어" },
  { image: "/looks/look10.jpg", creator: "edit.eunseo", title: "파리의 니트", product: "아이보리 울 스웨터" },
  { image: "/looks/look2.jpg", creator: "rin.heritage", title: "오래 입는 셔츠", product: "헤리티지 재킷" },
  { image: "/looks/look6.jpg", creator: "jiho.finds", title: "도시를 걷는 날", product: "데일리 스니커즈" },
] as const;

export const HERO_STATS = [
  { value: "1장", label: "사진 업로드" },
  { value: `${CREATOR_REVENUE_SHARE}%`, label: "크리에이터 수익" },
  { value: "1탭", label: "구매 경로 연결" },
] as const;

export const BRAND_NAMES = [
  "A.P.C.",
  "AMI",
  "BARBOUR",
  "COS",
  "LEVI'S",
  "MARGIELA",
  "PRADA",
  "THE NORTH FACE",
  "ADIDAS",
  "POLO",
] as const;

export const MATCH_STREAM: readonly MatchStreamItem[] = [
  { creator: "minu.archive", object: "옥스포드 셔츠", action: "상품 연결" },
  { creator: "hana.weekday", object: "시티 스니커즈", action: "구매 경로 확인" },
  { creator: "rin.heritage", object: "헤리티지 재킷", action: "숍에 저장" },
  { creator: "soo.frame", object: "데스크 오브젝트", action: "컬렉션 공유" },
  { creator: "edit.eunseo", object: "클린 뷰티 루틴", action: "상품 후보 확인" },
  { creator: "jiho.finds", object: "트래블 레이어", action: "콘텐츠 발행" },
] as const;

export const HOME_CHAPTERS: readonly BrandChapterData[] = [
  {
    id: "discover",
    number: "01",
    eyebrow: "01 / DISCOVER",
    title: "사진 한 장으로\n취향을 발견",
    body: "좋아하는 사람의 사진을 보다가 마음에 든 상품을 발견하세요. STS는 장면 속 오브젝트를 찾아 다음 행동까지 이어줍니다.",
    steps: ["사진 업로드", "상품 후보 확인", "실제 상품 연결", "구매 페이지 이동"],
    flipped: false,
    tone: "white",
  },
  {
    id: "match",
    number: "02",
    eyebrow: "02 / CURATE",
    title: "좋아하는 사람의\n취향을 그대로",
    body: "팔로워 수가 아니라 선택의 맥락을 봅니다. 나와 결이 맞는 큐레이터의 리스트에서 더 빨리 고르고 저장하세요.",
    steps: ["큐레이터 팔로우", "새로운 리스트 도착", "상품 맥락 확인", "나만의 컬렉션"],
    flipped: true,
    tone: "warm",
  },
  {
    id: "surface",
    number: "03",
    eyebrow: "03 / CREATOR SHOP",
    title: "콘텐츠가 나만의\n숍이 되는 순간",
    body: "이미 만들던 콘텐츠를 그대로 올리면 됩니다. 발견된 상품을 직접 확인하고, 한 번의 공유로 나만의 쇼핑 페이지를 완성하세요.",
    steps: ["콘텐츠 업로드", "AI 상품 후보", "내가 직접 확정", "숍 링크 공유"],
    flipped: false,
    tone: "white",
  },
  {
    id: "track",
    number: "04",
    eyebrow: "04 / TRACK",
    title: "추천이 일어난 순간부터\n구매까지 연결",
    body: "무엇을 보여줬는지, 누가 눌렀는지, 어떤 상품으로 이어졌는지 하나의 흐름으로 확인합니다.",
    steps: ["노출 확인", "탭 추적", "구매 전환", "수익 정산"],
    flipped: true,
    tone: "warm",
  },
  {
    id: "catalog",
    number: "05",
    eyebrow: "05 / CATALOG",
    title: "검증된 상품만\n남기기",
    body: "사진 속 후보와 실제 카탈로그를 맞춰 봅니다. 판매 가능한 SKU와 구매 경로가 확인된 상품만 쇼핑 경험에 남습니다.",
    steps: ["객체 탐지", "후보 비교", "SKU 확인", "구매 링크 검증"],
    flipped: false,
    tone: "white",
  },
  {
    id: "revenue",
    number: "06",
    eyebrow: "06 / REVENUE",
    title: "좋아하는 것을\n수익으로 연결",
    body: "STS는 추천을 광고처럼 바꾸지 않습니다. 신뢰할 수 있는 콘텐츠와 실제 구매가 이어질 때, 크리에이터의 수익이 시작됩니다.",
    steps: ["추천 링크 생성", "구매 전환 확인", "수익 누적", "다음 콘텐츠로 확장"],
    flipped: true,
    tone: "warm",
  },
] as const;

export const VOICES: readonly Voice[] = [
  { quote: "사진 속 상품을 일일이 찾는 시간이 줄었어요. 좋아하는 사람의 선택에서 바로 다음 아이템을 발견할 수 있어서 쇼핑이 더 자연스러워졌습니다.", name: "서윤", role: "STS 쇼퍼", tag: "발견에서 구매까지" },
  { quote: "내가 올리던 콘텐츠를 바꾸지 않고도 상품을 연결할 수 있다는 점이 좋았어요. 어떤 추천이 반응을 만들었는지도 한눈에 보입니다.", name: "민우", role: "스타일 큐레이터", tag: "콘텐츠를 숍으로" },
  { quote: "브랜드가 보여주고 싶은 상품이 실제 취향의 장면 안에 놓입니다. 단순 노출이 아니라 어떤 콘텐츠가 구매로 이어지는지 확인할 수 있어요.", name: "지현", role: "파트너 브랜드 운영팀", tag: "성과를 읽는 연결" },
] as const;

export const PARTNERSHIP_EMAIL = process.env.NEXT_PUBLIC_PARTNERSHIP_EMAIL ?? "partnerships@sts.kr";
