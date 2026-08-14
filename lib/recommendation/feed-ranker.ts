import {
  affinityFor,
  EMPTY_PROFILE,
  type PriceBand,
  type TasteProfile,
} from "./taste-profile";

/**
 * For You 랭킹 v1 — 결정적(deterministic).
 *
 * 같은 입력(후보·프로필·기준시각)이면 항상 같은 순서가 나온다. 무작위성이 없고,
 * 모든 점수 요소가 후보에서 계산되므로 테스트·디버깅·설명이 가능하다.
 *
 * ── 설계 원칙 ────────────────────────────────────────────────────────────
 * 1. **수수료는 주요 랭킹 요소가 될 수 없다.** 가중치가 다른 모든 축보다 작고
 *    상한이 걸려 있다 — 취향·품질·신선도 중 하나만 앞서도 뒤집힌다.
 *    (로드 시점 단언으로 강제 — offer-resolver와 같은 방식)
 * 2. **모든 게시물이 쇼퍼블로 보일 필요는 없다.** 품질 점수는 커머스 밀도를
 *    보지 않고, 다양성 후처리가 고밀도 상품 게시물의 연속 노출을 끊는다.
 *    상품이 하나도 없는 순수 콘텐츠도 동등하게 경쟁한다.
 * 3. 부정 피드백(숨기기)은 감점이 아니라 **제외**다. 사용자가 아니라고 했으면 아니다.
 */

export const RANK_WEIGHTS = {
  taste: 0.24, // 카테고리/브랜드/색상/가격대/스타일 적합도
  creator: 0.22, // 크리에이터 친밀도 (팔로우 + 과거 상호작용)
  quality: 0.2, // 콘텐츠 품질 (참여율 — 커머스 밀도 무관)
  freshness: 0.18, // 시간 감쇠
  novelty: 0.1, // 새로움 (이미 본 것 감점)
  commission: 0.03, // 수수료 — 반드시 최소 가중치
} as const;

/** 수수료 입력 상한 — 이 이상은 추가 이득이 없다 */
export const COMMISSION_RATE_CAP = 0.1;

/** 커머스 무결성 페널티 상한 (구매 불가 링크가 많은 게시물) */
export const MAX_INTEGRITY_PENALTY = 0.15;

// 수수료가 지배할 수 없음을 코드로 강제한다 — 가중치를 잘못 바꾸면 즉시 실패한다
for (const [axis, weight] of Object.entries(RANK_WEIGHTS)) {
  if (axis !== "commission" && RANK_WEIGHTS.commission >= weight) {
    throw new Error(
      `invariant violated: commission weight must stay below every other axis (${axis})`
    );
  }
}

/** 신선도 반감기 — 3일 지난 게시물은 절반의 신선도 */
export const FRESHNESS_HALF_LIFE_MS = 3 * 24 * 60 * 60 * 1000;

export interface RankableCandidate {
  postId: string;
  creatorId: string;
  category: string;
  /** 발행 시각 (ms) */
  createdAt: number;
  /** 연결된 상품에서 뽑은 취향 축 */
  brands: string[];
  colors: string[];
  priceBands: PriceBand[];
  styles: string[];
  /** 콘텐츠 구조 */
  objectCount: number;
  linkedProductCount: number;
  /** 참여 지표 (없으면 0) */
  views: number;
  likes: number;
  taps: number;
  shares: number;
  comments: number;
  /** 연결 상품 중 실제 구매 가능한 비율 (0~1). 링크가 없으면 1(감점 없음) */
  purchasableRatio: number;
  /** 연결 상품의 최대 수수료율 (0~1) */
  maxCommissionRate: number;
}

export interface RankingContext {
  profile: TasteProfile;
  /** 팔로우 중인 크리에이터 */
  following: Set<string>;
  /** 숨김/관심없음 처리된 게시물 — 결과에서 제외된다 */
  hidden: Set<string>;
  /** 이미 본 게시물 — novelty 감점 */
  seen: Set<string>;
  now: number;
}

export interface RankedCandidate {
  candidate: RankableCandidate;
  score: number;
  breakdown: {
    taste: number;
    creator: number;
    quality: number;
    freshness: number;
    novelty: number;
    commission: number;
    integrityPenalty: number;
  };
  reasons: string[];
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** 여러 축 적합도의 평균 — 음수(회피 학습)도 살린다 */
function tasteScore(c: RankableCandidate, p: TasteProfile): number {
  const parts: number[] = [affinityFor(p, "categories", c.category)];
  const push = (dim: Parameters<typeof affinityFor>[1], keys: string[]) => {
    if (keys.length === 0) return;
    const vals = keys.map((k) => affinityFor(p, dim, k));
    parts.push(vals.reduce((a, b) => a + b, 0) / vals.length);
  };
  push("brands", c.brands);
  push("colors", c.colors);
  push("priceBands", c.priceBands);
  push("styles", c.styles);
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  // -1~1 → 0~1 (0.5가 중립)
  return clamp01((avg + 1) / 2);
}

function creatorScore(c: RankableCandidate, ctx: RankingContext): number {
  const affinity = affinityFor(ctx.profile, "creators", c.creatorId); // -1~1
  const followed = ctx.following.has(c.creatorId) ? 1 : 0;
  // 팔로우는 명시적 선언이므로 과거 상호작용보다 조금 더 무겁게 본다
  return clamp01(0.55 * followed + 0.45 * ((affinity + 1) / 2));
}

/**
 * 콘텐츠 품질 — 참여율 기반. 커머스 밀도는 **의도적으로 보지 않는다**
 * (상품이 많은 게시물이 자동으로 좋은 콘텐츠는 아니다).
 */
function qualityScore(c: RankableCandidate): number {
  if (c.views < 5) {
    // 노출이 적어 참여율을 신뢰할 수 없음 — 중립에서 시작한다 (신규 게시물 보호)
    return 0.5;
  }
  const engaged = c.likes + c.shares * 2 + c.comments * 2 + c.taps * 0.5;
  const rate = engaged / c.views;
  // 참여율 20%면 만점 — 그 이상은 이상치로 보고 포화시킨다
  return clamp01(rate / 0.2);
}

function freshnessScore(c: RankableCandidate, now: number): number {
  const age = Math.max(0, now - c.createdAt);
  return clamp01(Math.pow(0.5, age / FRESHNESS_HALF_LIFE_MS));
}

function noveltyScore(c: RankableCandidate, ctx: RankingContext): number {
  return ctx.seen.has(c.postId) ? 0.15 : 1;
}

/** 구매 불가 링크가 많을수록 감점 — 무결성은 사용자 신뢰의 문제다 */
function integrityPenalty(c: RankableCandidate): number {
  if (c.linkedProductCount === 0) return 0;
  const broken = 1 - clamp01(c.purchasableRatio);
  return Math.round(broken * MAX_INTEGRITY_PENALTY * 1000) / 1000;
}

export function scoreCandidate(c: RankableCandidate, ctx: RankingContext): RankedCandidate {
  const cold = ctx.profile.isCold;

  const breakdown = {
    // 콜드 스타트: 긍정 개인화는 신뢰하지 않지만(0.5로 억제) **회피 신호는 즉시 적용한다**.
    // 사용자가 "관심 없음"을 눌렀다면 신호가 적다는 이유로 무시해선 안 된다.
    taste: cold ? Math.min(0.5, tasteScore(c, ctx.profile)) : tasteScore(c, ctx.profile),
    creator: cold ? (ctx.following.has(c.creatorId) ? 1 : 0.5) : creatorScore(c, ctx),
    quality: qualityScore(c),
    freshness: freshnessScore(c, ctx.now),
    novelty: noveltyScore(c, ctx),
    commission: clamp01(Math.min(c.maxCommissionRate, COMMISSION_RATE_CAP) / COMMISSION_RATE_CAP),
    integrityPenalty: integrityPenalty(c),
  };

  const score =
    RANK_WEIGHTS.taste * breakdown.taste +
    RANK_WEIGHTS.creator * breakdown.creator +
    RANK_WEIGHTS.quality * breakdown.quality +
    RANK_WEIGHTS.freshness * breakdown.freshness +
    RANK_WEIGHTS.novelty * breakdown.novelty +
    RANK_WEIGHTS.commission * breakdown.commission -
    breakdown.integrityPenalty;

  const reasons: string[] = [];
  if (ctx.following.has(c.creatorId)) reasons.push("팔로우 중인 크리에이터");
  if (!cold && breakdown.taste > 0.65) reasons.push("취향과 가까움");
  if (breakdown.freshness > 0.7) reasons.push("새 콘텐츠");
  if (breakdown.quality > 0.7) reasons.push("반응이 좋은 콘텐츠");
  if (breakdown.integrityPenalty > 0) reasons.push("일부 상품 구매 불가");

  return { candidate: c, score: Math.round(score * 10000) / 10000, breakdown, reasons };
}

/**
 * For You 랭킹.
 * 숨긴 게시물은 제외하고, 점수순 정렬 후 다양성 후처리를 적용한다.
 * 동점은 postId 오름차순으로 갈라 완전 결정적이다.
 */
export function rankFeed(
  candidates: RankableCandidate[],
  ctx: RankingContext
): RankedCandidate[] {
  const scored = candidates
    .filter((c) => !ctx.hidden.has(c.postId)) // 부정 피드백 = 제외
    .map((c) => scoreCandidate(c, ctx))
    .sort((a, b) => b.score - a.score || a.candidate.postId.localeCompare(b.candidate.postId));

  return diversify(scored);
}

/**
 * 다양성 후처리 — 순수 소셜 경험을 지킨다.
 *  1. 같은 크리에이터가 연달아 나오지 않게 한다.
 *  2. 상품이 빽빽한 게시물이 연속 3개를 넘지 않게 한다
 *     (피드가 전부 쇼퍼블로 보이면 그건 카탈로그지 소셜이 아니다).
 * 규칙 위반 후보는 버리지 않고 뒤로 미룬다 — 순서만 바뀐다.
 */
export function diversify(ranked: RankedCandidate[]): RankedCandidate[] {
  const SHOPPABLE_DENSE = 3; // 연결 상품 3개 이상이면 "상품 밀집"
  const MAX_DENSE_RUN = 3;

  const pool = [...ranked];
  const out: RankedCandidate[] = [];
  let lastCreator: string | null = null;
  let denseRun = 0;

  while (pool.length > 0) {
    let pickIndex = pool.findIndex((r) => {
      const sameCreator = r.candidate.creatorId === lastCreator;
      const dense = r.candidate.linkedProductCount >= SHOPPABLE_DENSE;
      const denseBlocked = dense && denseRun >= MAX_DENSE_RUN;
      return !sameCreator && !denseBlocked;
    });
    // 규칙을 만족하는 후보가 없으면 점수 1위를 그대로 쓴다 (무한 루프 방지)
    if (pickIndex === -1) pickIndex = 0;

    const [picked] = pool.splice(pickIndex, 1);
    out.push(picked);
    denseRun = picked.candidate.linkedProductCount >= SHOPPABLE_DENSE ? denseRun + 1 : 0;
    lastCreator = picked.candidate.creatorId;
  }
  return out;
}

/** Following 피드 — 시간순(최신 우선). 숨긴 게시물만 제외한다 */
export function rankFollowingFeed(
  candidates: RankableCandidate[],
  ctx: Pick<RankingContext, "following" | "hidden">
): RankableCandidate[] {
  return candidates
    .filter((c) => ctx.following.has(c.creatorId) && !ctx.hidden.has(c.postId))
    .sort((a, b) => b.createdAt - a.createdAt || a.postId.localeCompare(b.postId));
}

export { EMPTY_PROFILE };
