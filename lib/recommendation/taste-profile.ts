/**
 * 취향 프로필 — 사용자의 행동 신호를 선호도로 집계한다 (순수 함수).
 *
 * 신호의 출처는 전부 서버 권위 데이터다:
 *   interaction_events(조회·오브젝트 탭) · post_likes · post_saves ·
 *   product_saves · commerce_clicks(아웃바운드) · conversions(구매) ·
 *   content_feedback(숨기기) · follows
 *
 * 결정적(deterministic)이다: 같은 신호 집합 + 같은 기준시각 → 같은 프로필.
 */

export type SignalType =
  | "view"
  | "object_tap"
  | "card_open"
  | "post_like"
  | "post_save"
  | "product_save"
  | "share"
  | "outbound"
  | "purchase"
  | "follow"
  | "hide";

/** 신호별 가중치 — 의도의 강도 순. 부정 신호는 음수 */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  view: 0.1,
  object_tap: 1,
  card_open: 1.5,
  post_like: 1.5,
  post_save: 2,
  product_save: 3,
  share: 3,
  outbound: 5,
  purchase: 10,
  follow: 4,
  hide: -5,
};

export type PriceBand = "budget" | "mid" | "premium" | "luxury";

/** 가격대 — 취향은 절대 금액이 아니라 구간으로 학습된다 */
export function priceBandOf(price: number | null | undefined): PriceBand | undefined {
  if (price == null || !Number.isFinite(price) || price <= 0) return undefined;
  if (price < 50_000) return "budget";
  if (price < 200_000) return "mid";
  if (price < 700_000) return "premium";
  return "luxury";
}

/**
 * 색상 버킷 — hex를 그대로 학습하면 일반화가 안 되므로 인지 가능한 구간으로 묶는다.
 * (무채색은 명도로, 유채색은 색상환으로)
 */
export function colorBucketOf(hex: string | null | undefined): string | undefined {
  if (!hex) return undefined;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2 / 255;
  const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

  // 극단적으로 어둡거나 밝은 색에서는 채도를 신뢰할 수 없다 —
  // #0b0c0f처럼 RGB 차이가 몇 단위뿐인 검정이 파랑으로 분류되는 것을 막는다.
  if (sat < 0.12 || light < 0.12 || light > 0.93) {
    if (light < 0.2) return "neutral-black";
    if (light < 0.45) return "neutral-charcoal";
    if (light < 0.75) return "neutral-grey";
    return "neutral-white";
  }
  let hue = 0;
  const d = max - min;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;

  if (hue < 20 || hue >= 340) return "red";
  if (hue < 45) return light < 0.4 ? "brown" : "orange";
  if (hue < 70) return "yellow";
  if (hue < 165) return "green";
  if (hue < 250) return "blue";
  if (hue < 290) return "purple";
  return "pink";
}

export interface TasteSignal {
  type: SignalType;
  /** 발생 시각 (ms) — 최근 신호에 더 큰 가중을 준다 */
  at?: number;
  creatorId?: string | null;
  category?: string | null;
  brand?: string | null;
  /** hex 또는 이미 버킷팅된 값 */
  color?: string | null;
  priceBand?: PriceBand | null;
  /** 사용 가능한 경우의 스타일 속성 (패턴·핏 등) */
  styles?: string[] | null;
}

export type Dimension = "categories" | "brands" | "colors" | "priceBands" | "creators" | "styles";

export interface TasteProfile {
  categories: Record<string, number>;
  brands: Record<string, number>;
  colors: Record<string, number>;
  priceBands: Record<string, number>;
  creators: Record<string, number>;
  styles: Record<string, number>;
  /** 유효 신호 개수 (감쇠 전) */
  signalCount: number;
  /** 긍정 가중치 총합 — 프로필 신뢰도 */
  totalWeight: number;
  /** 신호가 부족해 개인화를 신뢰할 수 없는 상태 (신규 사용자) */
  isCold: boolean;
}

/** 이 미만이면 개인화 대신 인기·신선도 폴백을 쓴다 */
export const COLD_START_MIN_WEIGHT = 5;

/** 신호 반감기 — 30일 지난 신호는 절반의 영향력 */
export const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;

export const EMPTY_PROFILE: TasteProfile = {
  categories: {},
  brands: {},
  colors: {},
  priceBands: {},
  creators: {},
  styles: {},
  signalCount: 0,
  totalWeight: 0,
  isCold: true,
};

function decay(at: number | undefined, now: number): number {
  if (at == null) return 1;
  const age = Math.max(0, now - at);
  return Math.pow(0.5, age / HALF_LIFE_MS);
}

function bump(map: Record<string, number>, key: string | null | undefined, value: number) {
  const k = typeof key === "string" ? key.trim() : "";
  if (!k) return;
  map[k] = (map[k] ?? 0) + value;
}

/** 차원별 점수를 -1~1로 정규화 — 절대 크기가 아니라 상대 선호를 쓴다 */
function normalize(map: Record<string, number>): Record<string, number> {
  const peak = Math.max(...Object.values(map).map(Math.abs), 0);
  if (peak === 0) return map;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = Math.round((v / peak) * 1000) / 1000;
  }
  return out;
}

/**
 * 신호 → 취향 프로필.
 * @param now 기준 시각 (테스트 결정성을 위해 주입 가능)
 */
export function buildTasteProfile(signals: TasteSignal[], now = Date.now()): TasteProfile {
  const raw = {
    categories: {} as Record<string, number>,
    brands: {} as Record<string, number>,
    colors: {} as Record<string, number>,
    priceBands: {} as Record<string, number>,
    creators: {} as Record<string, number>,
    styles: {} as Record<string, number>,
  };

  let totalWeight = 0;
  let counted = 0;

  for (const s of signals) {
    const base = SIGNAL_WEIGHTS[s.type];
    if (base == null) continue;
    const w = base * decay(s.at, now);
    if (w === 0) continue;
    counted += 1;
    if (w > 0) totalWeight += w;

    bump(raw.categories, s.category, w);
    bump(raw.brands, s.brand, w);
    bump(raw.colors, colorBucketOf(s.color) ?? s.color ?? undefined, w);
    bump(raw.priceBands, s.priceBand, w);
    bump(raw.creators, s.creatorId, w);
    for (const style of s.styles ?? []) bump(raw.styles, style, w);
  }

  return {
    categories: normalize(raw.categories),
    brands: normalize(raw.brands),
    colors: normalize(raw.colors),
    priceBands: normalize(raw.priceBands),
    creators: normalize(raw.creators),
    styles: normalize(raw.styles),
    signalCount: counted,
    totalWeight: Math.round(totalWeight * 1000) / 1000,
    isCold: totalWeight < COLD_START_MIN_WEIGHT,
  };
}

/** 프로필에서 특정 차원의 선호도를 읽는다 (없으면 0 = 중립) */
export function affinityFor(
  profile: TasteProfile,
  dimension: Dimension,
  key: string | null | undefined
): number {
  if (!key) return 0;
  return profile[dimension][key] ?? 0;
}

/** 상위 선호 항목 — UI 설명("이 브랜드를 자주 봤어요")과 디버깅용 */
export function topPreferences(
  profile: TasteProfile,
  dimension: Dimension,
  limit = 3
): { key: string; score: number }[] {
  return Object.entries(profile[dimension])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, score]) => ({ key, score }));
}
