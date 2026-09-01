import { isPurchaseEligibleOffer } from "./url-policy";
import type { CommerceOffer } from "./types";

export type PurchaseCtaDecision =
  | {
      readonly kind: "purchase";
      readonly reason: string;
    }
  | {
      readonly kind: "review_only";
      readonly reason: string;
    };

export function resolvePurchaseCtaDecision(offer: CommerceOffer | null): PurchaseCtaDecision {
  if (!offer) {
    return {
      kind: "review_only",
      reason: "검증된 판매처를 찾지 못해 구매 CTA를 숨깁니다.",
    };
  }

  if (offer.offerLifecycle !== "active") {
    return {
      kind: "review_only",
      reason: offer.offerLifecycle === "stale"
        ? "이 상품은 stale 상태라 구매 CTA를 숨깁니다."
        : "이 상품은 quarantined 상태라 구매 CTA를 숨깁니다.",
    };
  }

  if (offer.matchState !== "exact") {
    return {
      kind: "review_only",
      reason: `matchState=${offer.matchState} 이므로 리뷰/유사 상품만 노출합니다.`,
    };
  }

  if (!offer.detailPageVerified || !offer.detailUrl) {
    return {
      kind: "review_only",
      reason: "검증된 직접 상품 상세 페이지가 없어 구매 CTA를 숨깁니다.",
    };
  }

  if (!offer.affiliateUrl) {
    return {
      kind: "review_only",
      reason: "승인된 affiliate 경로가 없어 구매 CTA를 숨깁니다.",
    };
  }

  if (!isPurchaseEligibleOffer(offer)) {
    return {
      kind: "review_only",
      reason: "canonical eligibility 검사에서 통과하지 못해 구매 CTA를 숨깁니다.",
    };
  }

  return {
    kind: "purchase",
    reason: "matchState=exact · offerLifecycle=active · verified direct detail · approved affiliate path",
  };
}
