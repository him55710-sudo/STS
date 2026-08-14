/**
 * 커머스 무결성 지표 (순수 함수).
 *
 * 이 숫자들은 "STS가 소셜 플랫폼으로 남아 있는가"를 감시한다.
 * 수익 지표(GMV·수수료)와 달리, 이것들이 나빠지면 제품이 카탈로그로
 * 변질되고 있다는 신호다 — 성장 지표보다 먼저 본다.
 *
 * 참고 임계값은 운영 판단용 가이드이며 강제 규칙이 아니다.
 */

/** 연결 상품이 이 개수 이상이면 "상품 밀집" 콘텐츠로 본다 */
export const COMMERCE_HEAVY_THRESHOLD = 3;

export interface PostShape {
  postId: string;
  creatorId: string;
  linkedProductCount: number;
  publishedAt: number;
}

/**
 * 표본이 없으면 `null`이다 — 0%가 아니다.
 *
 * 데이터 없음을 0으로 계산하면 "유지율 0% · 주의"처럼 사실이 아닌 경고가 뜬다.
 * 관측되지 않은 것과 나쁜 것은 다르다. 화면은 null을 "데이터 없음"으로 그린다.
 */
export interface IntegrityMetrics {
  /** 상품이 0~1개인 평범한 콘텐츠 비율 (높을수록 건강) */
  organicContentRatio: number | null;
  /** 상품 밀집 콘텐츠 비율 (낮을수록 건강) */
  commerceHeavyRatio: number | null;
  /** 노출 대비 숨김/관심없음 비율 (낮을수록 건강) */
  hideRate: number | null;
  /** 이전 기간에 발행한 크리에이터 중 이번 기간에도 발행한 비율 */
  creatorRetention: number | null;
  sampleSize: number;
}

export const EMPTY_METRICS: IntegrityMetrics = {
  organicContentRatio: null,
  commerceHeavyRatio: null,
  hideRate: null,
  creatorRetention: null,
  sampleSize: 0,
};

const ratio = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 1000 : null);

/**
 * 오가닉 콘텐츠 비율 — 상품이 없거나 하나뿐인 게시물의 비중.
 * 낮아지면 크리에이터가 "판매용 콘텐츠"만 올리고 있다는 뜻이다.
 */
export function organicContentRatio(posts: PostShape[]): number | null {
  return ratio(posts.filter((p) => p.linkedProductCount <= 1).length, posts.length);
}

/** 상품 밀집 비율 — 피드가 카탈로그처럼 보이기 시작하는 임계 */
export function commerceHeavyRatio(posts: PostShape[]): number | null {
  return ratio(
    posts.filter((p) => p.linkedProductCount >= COMMERCE_HEAVY_THRESHOLD).length,
    posts.length
  );
}

/**
 * 숨김률 — 노출(조회) 대비 숨김/관심없음.
 * 상거래 노출이 과해지면 가장 먼저 오르는 지표다.
 */
export function hideRate(hides: number, impressions: number): number | null {
  return ratio(hides, impressions);
}

/**
 * 크리에이터 유지율 — 이전 기간 발행자 중 이번 기간에도 발행한 비율.
 * 수익만 좇는 설계는 단기 GMV를 올리고 이 지표를 떨어뜨린다.
 *
 * 이전 기간에 발행자가 없으면 null — 유지율을 계산할 대상 자체가 없다.
 */
export function creatorRetention(
  posts: PostShape[],
  now: number,
  periodMs = 30 * 24 * 60 * 60 * 1000
): number | null {
  const currentStart = now - periodMs;
  const previousStart = now - periodMs * 2;

  const previous = new Set(
    posts.filter((p) => p.publishedAt >= previousStart && p.publishedAt < currentStart).map((p) => p.creatorId)
  );
  const current = new Set(posts.filter((p) => p.publishedAt >= currentStart).map((p) => p.creatorId));
  let retained = 0;
  for (const id of previous) if (current.has(id)) retained += 1;
  return ratio(retained, previous.size);
}

export interface IntegrityInput {
  posts: PostShape[];
  hides: number;
  impressions: number;
  now?: number;
}

export function computeIntegrityMetrics({
  posts,
  hides,
  impressions,
  now = Date.now(),
}: IntegrityInput): IntegrityMetrics {
  return {
    organicContentRatio: organicContentRatio(posts),
    commerceHeavyRatio: commerceHeavyRatio(posts),
    hideRate: hideRate(hides, impressions),
    creatorRetention: creatorRetention(posts, now),
    sampleSize: posts.length,
  };
}

/**
 * 운영 가이드 — 임계를 벗어나면 관리자 화면이 경고를 띄운다.
 *
 * status가 "no_data"면 경고를 띄우지 않는다. 표본이 없는 지표에 "주의"를 붙이면
 * 운영자가 실제 신호와 빈 화면을 구분할 수 없게 된다.
 */
export type MetricStatus = "healthy" | "warn" | "no_data";

export interface MetricHealth {
  key: keyof Omit<IntegrityMetrics, "sampleSize">;
  label: string;
  value: number | null;
  status: MetricStatus;
  guide: string;
}

const judge = (value: number | null, ok: (v: number) => boolean): MetricStatus =>
  value == null ? "no_data" : ok(value) ? "healthy" : "warn";

export function assessIntegrity(m: IntegrityMetrics): MetricHealth[] {
  return [
    {
      key: "organicContentRatio",
      label: "오가닉 콘텐츠 비율",
      value: m.organicContentRatio,
      status: judge(m.organicContentRatio, (v) => v >= 0.4),
      guide: "40% 이상 권장 — 평범한 일상 콘텐츠가 충분히 남아 있는가",
    },
    {
      key: "commerceHeavyRatio",
      label: "상품 밀집 비율",
      value: m.commerceHeavyRatio,
      status: judge(m.commerceHeavyRatio, (v) => v <= 0.5),
      guide: "50% 이하 권장 — 피드가 카탈로그로 변질되고 있지 않은가",
    },
    {
      key: "hideRate",
      label: "숨김률",
      value: m.hideRate,
      status: judge(m.hideRate, (v) => v <= 0.05),
      guide: "5% 이하 권장 — 상거래 노출이 과한지 알려주는 조기 신호",
    },
    {
      key: "creatorRetention",
      label: "크리에이터 유지율",
      value: m.creatorRetention,
      status: judge(m.creatorRetention, (v) => v >= 0.3),
      guide: "30% 이상 권장 — 수익만 좇는 설계는 이 지표를 떨어뜨린다",
    },
  ];
}
