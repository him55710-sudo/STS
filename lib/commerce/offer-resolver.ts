import type { Merchant, MerchantOffer } from "./types";

/**
 * OfferResolver — "어디서 살 것인가"에 답한다.
 *
 * Retrieval(lib/retrieval)이 "무슨 상품인가"를 결정한 뒤, 그 canonical product의
 * 오퍼들 중 Buy CTA를 받을 최적 오퍼(best)와 "다른 판매처" 목록을 랭킹한다.
 *
 * 랭킹 축: 재고(exact availability) · 가격 · 판매처 신뢰 · 배송 · 사용자 가치(중앙값
 * 대비 절약) · 수수료. 축별 0~1 정규화 후 가중합.
 *
 * ── 수수료 지배 금지 불변식 ────────────────────────────────────────────────
 * 수수료는 (1) 입력이 COMMISSION_RATE_CAP에서 잘리고 (2) 가중치가 가격·신뢰
 * 각각보다 작다. 즉 수수료가 만들 수 있는 최대 점수 차이(COMMISSION_WEIGHT)는
 * 가격 열세나 신뢰 열세 하나만으로도 뒤집힌다 — 나쁜 오퍼가 수수료만으로
 * 1위가 되는 것은 산술적으로 불가능하다. (tests/commerce/offer-resolver.test.ts)
 */

export const RANK_WEIGHTS = {
  price: 0.3, // 최저 가용가 대비
  trust: 0.26, // merchant.trustScore
  availability: 0.12, // in_stock > low_stock (out_of_stock은 후보 자체가 아님)
  value: 0.14, // 중앙값 대비 절약 (사용자 가치)
  shipping: 0.1, // 무료/로켓/당일 배송
  commission: 0.08, // 플랫폼 수수료 — 반드시 price·trust보다 작아야 한다
} as const;

/** 수수료 입력 상한 — 이 이상의 수수료율은 랭킹에 추가 이득을 주지 않는다 */
export const COMMISSION_RATE_CAP = 0.1;

// 불변식을 코드에서 강제 — 가중치를 바꾸다 실수로 깨뜨리면 로드 시점에 죽는다
if (
  RANK_WEIGHTS.commission >= RANK_WEIGHTS.price ||
  RANK_WEIGHTS.commission >= RANK_WEIGHTS.trust
) {
  throw new Error("invariant violated: commission weight must stay below price and trust");
}

export interface RankedOffer {
  offer: MerchantOffer;
  merchant: Merchant;
  score: number;
  /** 축별 점수 (0~1, 가중 전) — 디버그·근거 표시용 */
  breakdown: {
    price: number;
    trust: number;
    availability: number;
    value: number;
    shipping: number;
    commission: number;
  };
  /** 사용자에게 보여줄 수 있는 근거 */
  reasons: string[];
}

export interface ResolvedOffers {
  /** Buy CTA를 받는 오퍼 — 가용 오퍼가 없으면 null */
  best: RankedOffer | null;
  /** "다른 판매처" — best 제외, 점수순 */
  alternatives: RankedOffer[];
  /** 품절 오퍼 — 절대 best가 될 수 없고, UI는 품절 표시로만 노출 */
  unavailable: RankedOffer[];
}

const FAST_SHIPPING = /무료|로켓|당일|새벽/;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function shippingScore(label: string | null): number {
  if (!label) return 0.4;
  return FAST_SHIPPING.test(label) ? 1 : 0.6;
}

function availabilityScore(stock: MerchantOffer["stockStatus"]): number {
  return stock === "in_stock" ? 1 : stock === "low_stock" ? 0.6 : 0;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * canonical product 하나의 오퍼들을 랭킹한다.
 * 결정적(deterministic): 동점이면 가격 → 신뢰 → id 순으로 가른다.
 */
export function resolveOffers(
  offers: MerchantOffer[],
  merchantById: (id: string) => Merchant | undefined
): ResolvedOffers {
  const usable = offers
    .map((offer) => ({ offer, merchant: merchantById(offer.merchantId) }))
    .filter((x): x is { offer: MerchantOffer; merchant: Merchant } => {
      // 판매처가 없거나 활성이 아니면 후보에서 제외
      return x.merchant != null && x.merchant.status === "active";
    });

  const available = usable.filter((x) => x.offer.stockStatus !== "out_of_stock");
  const soldOut = usable.filter((x) => x.offer.stockStatus === "out_of_stock");

  if (available.length === 0) {
    return {
      best: null,
      alternatives: [],
      unavailable: soldOut.map((x) => rank(x.offer, x.merchant, 1, 1)),
    };
  }

  const prices = available.map((x) => x.offer.price);
  const minPrice = Math.min(...prices);
  const medPrice = median(prices);

  const ranked = available
    .map((x) => rank(x.offer, x.merchant, minPrice, medPrice))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.offer.price - b.offer.price ||
        b.merchant.trustScore - a.merchant.trustScore ||
        a.offer.id.localeCompare(b.offer.id)
    );

  return {
    best: ranked[0],
    alternatives: ranked.slice(1),
    unavailable: soldOut
      .map((x) => rank(x.offer, x.merchant, minPrice, medPrice))
      .sort((a, b) => a.offer.price - b.offer.price),
  };
}

function rank(
  offer: MerchantOffer,
  merchant: Merchant,
  minPrice: number,
  medPrice: number
): RankedOffer {
  const breakdown = {
    price: clamp01(minPrice / Math.max(offer.price, 1)),
    trust: clamp01(merchant.trustScore),
    availability: availabilityScore(offer.stockStatus),
    // 사용자 가치: 중앙값 대비 절약분. 30% 절약이면 만점
    value: medPrice > 0 ? clamp01((medPrice - offer.price) / medPrice / 0.3) : 0,
    shipping: shippingScore(offer.shippingLabel),
    // 수수료: CAP에서 절단 — 그 이상은 랭킹에 기여하지 않는다
    commission: clamp01(Math.min(offer.commissionRate ?? 0, COMMISSION_RATE_CAP) / COMMISSION_RATE_CAP),
  };

  const score =
    RANK_WEIGHTS.price * breakdown.price +
    RANK_WEIGHTS.trust * breakdown.trust +
    RANK_WEIGHTS.availability * breakdown.availability +
    RANK_WEIGHTS.value * breakdown.value +
    RANK_WEIGHTS.shipping * breakdown.shipping +
    RANK_WEIGHTS.commission * breakdown.commission;

  const reasons: string[] = [];
  if (offer.price <= minPrice) reasons.push("최저가");
  if (breakdown.value > 0.3) reasons.push("평균보다 저렴");
  if (merchant.trustScore >= 0.88) reasons.push("신뢰도 높은 판매처");
  if (offer.shippingLabel && FAST_SHIPPING.test(offer.shippingLabel)) reasons.push(offer.shippingLabel);
  if (offer.stockStatus === "low_stock") reasons.push("품절 임박");
  if (offer.stockStatus === "out_of_stock") reasons.push("품절");

  return { offer, merchant, score: Math.round(score * 1000) / 1000, breakdown, reasons };
}
