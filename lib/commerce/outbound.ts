"use client";

import { bestOfferIdFor, buildGoUrl, type GoContext } from "./click";

/**
 * 상품 아웃바운드 URL — 상거래 CTA는 절대 판매처 URL을 직접 열지 않는다.
 *
 * 오퍼 그래프의 상품이면 /go/[offerId] (서버 어트리뷰션 + 303 리다이렉트).
 * 그래프 밖 상품(크리에이터가 URL로 직접 연결한 커스텀 상품 — 판매처·오퍼가
 * 없어 서버가 목적지를 소유하지 않음)만 원 URL 폴백이다. 임의 목적지를
 * 리다이렉터에 태우면 open redirect가 되므로 이 경계는 의도된 것이다.
 */
export function productOutboundUrl(
  productId: string | null | undefined,
  fallbackUrl: string,
  ctx: GoContext
): string {
  const offerId = bestOfferIdFor(productId);
  return offerId ? buildGoUrl(offerId, ctx) : fallbackUrl;
}
