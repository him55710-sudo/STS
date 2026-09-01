import type { Category } from "./types";

/**
 * Vision Pipeline 중앙 설정 — 모든 임계값·온톨로지·우선순위를 한 곳에서 관리.
 * 하드코딩 금지 원칙: 파이프라인 코드는 이 파일의 값만 참조한다.
 */

export const PIPELINE_VERSION = "fashion_v2";

/** 파이프라인 선택 플래그 — 환경변수 VISION_PIPELINE=legacy 로 구버전 강제 가능 */
export const PIPELINE_FLAG_ENV = "VISION_PIPELINE";

/** canonical class — 온톨로지의 표준 클래스 */
export type FashionClass =
  | "top"
  | "outerwear"
  | "pants"
  | "shorts"
  | "skirt"
  | "dress"
  | "shoes"
  | "bag"
  | "hat"
  | "glasses"
  | "belt"
  | "scarf"
  | "watch"
  | "bracelet"
  | "necklace"
  | "earrings"
  | "ring"
  | "object"; // non-fashion (머그·가구·가전 등)

/**
 * Fashion Ontology — 자유 라벨(영/한) → canonical class 매핑.
 * prompt ensembling과 라벨 정규화 양쪽에서 사용한다.
 */
export const FASHION_ONTOLOGY: Record<Exclude<FashionClass, "object">, string[]> = {
  top: ["shirt", "t-shirt", "tee", "blouse", "sweater", "knit", "hoodie", "sweatshirt", "top", "polo", "셔츠", "티셔츠", "니트", "블라우스", "후드", "맨투맨", "스웨트", "상의"],
  outerwear: ["jacket", "blazer", "coat", "cardigan", "outerwear", "fleece", "parka", "puffer", "자켓", "재킷", "블레이저", "코트", "가디건", "아우터", "플리스", "패딩"],
  pants: ["pants", "trousers", "jeans", "denim", "slacks", "joggers", "바지", "팬츠", "청바지", "데님", "슬랙스", "조거", "하의"],
  shorts: ["shorts", "반바지", "쇼츠"],
  skirt: ["skirt", "스커트", "치마"],
  dress: ["dress", "드레스", "원피스"],
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "loafer", "loafers", "boot", "boots", "heel", "heels", "sandal", "sandals", "derby", "clog", "footwear", "신발", "스니커즈", "로퍼", "부츠", "샌들", "구두", "운동화", "클로그"],
  bag: ["bag", "handbag", "shoulder bag", "crossbody bag", "backpack", "tote bag", "purse", "가방", "핸드백", "숄더백", "크로스백", "백팩", "토트백"],
  hat: ["hat", "cap", "beanie", "모자", "캡", "비니"],
  glasses: ["glasses", "sunglasses", "eyeglasses", "안경", "선글라스"],
  belt: ["belt", "벨트"],
  scarf: ["scarf", "muffler", "스카프", "머플러", "목도리"],
  watch: ["watch", "wristwatch", "wrist watch", "시계", "손목시계", "워치"],
  bracelet: ["bracelet", "팔찌"],
  necklace: ["necklace", "chain necklace", "pendant", "목걸이"],
  earrings: ["earring", "earrings", "귀걸이"],
  ring: ["ring", "finger ring", "반지"],
};

/** 자유 라벨 → canonical class */
export function canonicalClass(label: string): FashionClass {
  const l = label.toLowerCase();
  // 구체적인 클래스(액세서리·신발)가 먼저 매칭되도록 우선순위 순회
  const order: Exclude<FashionClass, "object">[] = [
    "watch", "bracelet", "necklace", "earrings", "ring", "glasses", "belt", "hat", "scarf",
    "shoes", "bag", "dress", "skirt", "shorts", "outerwear", "pants", "top",
  ];
  for (const cls of order) {
    if (FASHION_ONTOLOGY[cls].some((kw) => l.includes(kw.toLowerCase()))) return cls;
  }
  return "object";
}

/** canonical class → 앱 카테고리 */
export function classCategory(cls: FashionClass): Category {
  if (cls === "object") return "lifestyle";
  return "fashion";
}

/**
 * UI 히트 테스트 우선순위 — 겹칠 때 작은 액세서리가 소매/상의를 이겨야 한다.
 * 값이 클수록 우선.
 */
export const INTERACTION_PRIORITY: Record<FashionClass, number> = {
  ring: 100,
  watch: 100,
  bracelet: 100,
  earrings: 100,
  necklace: 95,
  glasses: 90,
  hat: 88,
  scarf: 86,
  bag: 85,
  shoes: 85,
  belt: 80,
  outerwear: 70,
  top: 65,
  pants: 65,
  shorts: 65,
  skirt: 65,
  dress: 65,
  object: 50,
};

/** 클래스별 최소 신뢰도 — 작은 액세서리는 임계값을 낮게 */
export const MIN_CONFIDENCE_BY_CLASS: Partial<Record<FashionClass, number>> = {
  watch: 0.12,
  bracelet: 0.12,
  earrings: 0.1,
  ring: 0.08,
  necklace: 0.12,
  glasses: 0.15,
};
export const DEFAULT_MIN_CONFIDENCE = 0.25;

/** 클래스별 최소 면적 (이미지 대비 비율) — 액세서리를 area threshold로 죽이지 않는다 */
export const MIN_AREA_BY_CLASS: Partial<Record<FashionClass, number>> = {
  top: 0.005,
  outerwear: 0.005,
  pants: 0.005,
  dress: 0.005,
  skirt: 0.004,
  shorts: 0.004,
  shoes: 0.0012,
  bag: 0.0015,
  hat: 0.001,
  watch: 0.00004,
  bracelet: 0.00004,
  ring: 0.00002,
  earrings: 0.00002,
  necklace: 0.00006,
  glasses: 0.0002,
  belt: 0.0004,
};
export const DEFAULT_MIN_AREA = 0.002;

/**
 * 해부학적 일관성 — person bbox 기준 예상 세로 위치 밴드 [yMin, yMax] (0=머리, 1=발끝).
 * 밴드를 벗어난 탐지는 confidence penalty.
 */
export const ANATOMICAL_BAND: Partial<Record<FashionClass, [number, number]>> = {
  hat: [0, 0.2],
  glasses: [0.02, 0.22],
  earrings: [0.04, 0.22],
  necklace: [0.1, 0.35],
  scarf: [0.08, 0.4],
  top: [0.1, 0.62],
  outerwear: [0.08, 0.75],
  watch: [0.25, 0.68],
  bracelet: [0.25, 0.68],
  ring: [0.3, 0.72],
  belt: [0.38, 0.58],
  bag: [0.15, 0.85],
  pants: [0.42, 0.95],
  shorts: [0.42, 0.75],
  skirt: [0.4, 0.85],
  dress: [0.1, 0.9],
  shoes: [0.82, 1.05],
};
export const ANATOMICAL_PENALTY = 0.45; // 밴드 밖이면 confidence × (1 - penalty)

/** 같은 클래스 중복 억제(마스크/박스 IoU 기준) */
export const DEDUPE_IOU = 0.45;

/**
 * Segmentation 품질 설정 — Boundary Accuracy가 UX의 핵심이므로
 * 해상도·정점 수를 넉넉히 잡고, 단순화는 최소한으로 한다.
 */
export const SEG = {
  /** 세그멘테이션 입력 최대 폭 (원본이 작으면 그대로) */
  inputMaxWidth: 1024,
  /** Douglas-Peucker 허용 오차 — 입력 대각선 대비 비율 (곡선 보존 우선) */
  epsilonRatio: 0.0022,
  /** 링(연결 컴포넌트)당 최대 정점 수 */
  maxPointsPerRing: 120,
  /** 객체당 최대 링 수 — 신발 좌/우, 분리된 스트랩 등 */
  maxRings: 3,
  /** 2번째 이후 링의 최소 면적 (최대 링 대비 비율) */
  minRingAreaRatio: 0.12,
  /** Chaikin corner-cutting 반복 횟수 (아주 가벼운 smoothing) */
  chaikinIterations: 1,
} as const;

/** @deprecated SEG.epsilonRatio 사용 */
export const POLYGON_EPSILON_RATIO = SEG.epsilonRatio;
/** @deprecated SEG.maxPointsPerRing 사용 */
export const POLYGON_MAX_POINTS = SEG.maxPointsPerRing;

/** 탐지 최대 객체 수 */
export const MAX_OBJECTS = 10;

/**
 * Product Retrieval 랭킹 가중치 — 절대값이 아니라 벤치마크로 조정하는 값.
 */
export const RANK_WEIGHTS = {
  visual: 0.35,
  brand: 0.2,
  logo: 0.15,
  attributes: 0.1,
  color: 0.08,
  text: 0.07,
  pageTrust: 0.05,
} as const;

/** Goal 3 visual reranking weights. Commission and affiliate fields are intentionally absent. */
export const VISUAL_RERANK_WEIGHTS = {
  visualSiglip: 0.5,
  brand: 0.15,
  canonicalClass: 0.1,
  logoOrText: 0.08,
  attributes: 0.07,
  color: 0.05,
  sourceAgreement: 0.05,
} as const;

export const FINAL_IDENTITY_WEIGHTS = {
  visualSiglip: 0.4,
  brand: 0.12,
  canonicalClass: 0.08,
  model: 0.15,
  identifier: 0.1,
  logo: 0.05,
  colorway: 0.05,
  sourceAgreement: 0.05,
} as const;

export const VISUAL_RERANK_POLICY = {
  modelVersion: "google/siglip2-base-patch16-224",
  preliminaryTopK: 10,
  finalTopK: 5,
  verifiedVisualMin: 0.86,
  likelyVisualMin: 0.72,
  verifiedFinalMin: 0.78,
  likelyFinalMin: 0.58,
  maxCandidateImageBytes: 2 * 1024 * 1024,
  requestTimeoutMs: 8_000,
  maxImageConcurrency: 4,
} as const;

/** Exact / Likely / Similar 판정 임계값 (finalScore 0~1) */
export const MATCH_TIERS = {
  exactMin: 0.78,
  likelyMin: 0.58,
} as const;

/** 상품 검색 동시 실행 상한 (객체 수만큼 무제한 병렬 금지) */
export const RETRIEVAL_CONCURRENCY = 3;

/** Gemini 설정 */
export const GEMINI = {
  model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  /** 마스크 포함 세그멘테이션 요청 타임아웃 (마스크는 토큰이 커서 여유 필요) */
  segTimeoutMs: 55000,
  /** 박스 전용 폴백 타임아웃 */
  boxTimeoutMs: 25000,
};
