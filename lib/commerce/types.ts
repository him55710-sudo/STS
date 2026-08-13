import type { Category } from "../types";

/**
 * Commerce Product Graph — Phase 2.
 *
 * 원칙: "이게 무슨 상품인가?"(CanonicalProduct)와 "어디서 살 수 있는가?"(MerchantOffer)를
 * 분리한다. CanonicalProduct 1 : N MerchantOffer.
 *
 *  - Retrieval 파이프라인(lib/retrieval, lib/match)은 계속 "무슨 상품인가"에 답한다.
 *  - OfferResolver(lib/commerce/offer-resolver.ts)가 "어디서 살 것인가"에 답한다.
 *  - 기존 UI가 쓰는 legacy Product 타입은 canonical + best offer를 평탄화한
 *    호환 뷰(lib/commerce/index.ts toLegacyProduct)로 유지된다.
 */

export interface CanonicalProduct {
  id: string;
  brand: string;
  /** 모델/상품명 — "무엇인가"의 이름. 판매처별 상품명(offer.title)과 구분된다 */
  modelName: string;
  sku: string | null;
  gtin: string | null;
  category: Category;
  /** 대표 색상 (#rrggbb 또는 색상명). 마스크 색 비교·색상 칩 표시에 사용 */
  color: string | null;
  /**
   * 구조화 속성 — similarIds(비슷한 스타일 canonical id), fit/pattern 등.
   * Phase 2에서는 similarIds가 핵심이고, 이후 임베딩 기반 유사도로 대체된다.
   */
  attributes: {
    similarIds?: string[];
    [key: string]: unknown;
  };
  primaryImage: string;
  createdAt?: string;
}

export type MerchantStatus = "active" | "paused" | "delisted";

export interface Merchant {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  /** 0~1 — 정품 신뢰/CS/배송 품질 종합. 랭킹의 주요 축 중 하나 */
  trustScore: number;
  status: MerchantStatus;
}

export type CommissionType = "percentage" | "fixed";
export type ProgramStatus = "active" | "pending" | "ended";

/**
 * 제휴 프로그램 — 실제 네트워크 연동은 이후 단계(click attribution).
 * 여기서는 데이터 모델만 존재하며 provider는 자리표시 문자열이다.
 */
export interface AffiliateProgram {
  id: string;
  merchantId: string;
  /** "direct" | "linkprice" | "coupang-partners" 등 — 연동 전까지는 식별용 문자열 */
  provider: string;
  commissionType: CommissionType;
  /** percentage면 0~1, fixed면 KRW */
  defaultRate: number;
  /** 어트리뷰션 쿠키 유효시간 (시간 단위) */
  cookieWindowHours: number;
  status: ProgramStatus;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface MerchantOffer {
  id: string;
  canonicalProductId: string;
  merchantId: string;
  /** 판매처 내부 상품 id — 실연동 전까지 null */
  externalProductId: string | null;
  /** 판매처가 부르는 상품명 */
  title: string;
  price: number;
  currency: "KRW";
  stockStatus: StockStatus;
  /** "무료배송" | "로켓배송" | "당일배송" 등 표시용 라벨 */
  shippingLabel: string | null;
  productUrl: string;
  /** 제휴 딥링크 — 네트워크 연동 전까지 null (가짜 링크를 만들지 않는다) */
  affiliateUrl: string | null;
  /** 이 오퍼의 수수료율 (0~1). null이면 프로그램 default_rate로 폴백 */
  commissionRate: number | null;
  /** 가격/재고 동기화 파이프라인 도입 전까지 null */
  lastSyncedAt: string | null;
}
