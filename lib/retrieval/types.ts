import type { FashionAttributes } from "../types";

/**
 * Product Retrieval 공통 타입 — provider 결과를 이 스키마로 normalize한다.
 */

export type MatchTier = "exact" | "likely" | "similar";

export interface CandidateScores {
  visual: number;
  brand: number;
  logo: number;
  color: number;
  attributes: number;
  text: number;
  pageTrust: number;
  final: number;
}

export interface ProductCandidate {
  id: string;
  brand: string | null;
  productName: string;
  category: string | null;
  color: string | null;
  price: { value: number | null; currency: string | null };
  retailer: string;
  url: string;
  imageUrls: string[];
  availability?: string;
  /** "catalog" | "naver" | "gemini-web" | ... */
  source: string;
  /** 그라운딩/검색 출처 URL (신뢰 근거, 디버그·검증용) */
  sourceUrl?: string;
  /** 카탈로그 상품이면 로컬 product id (링크·제휴 정보 재사용) */
  catalogProductId?: string;
  affiliate?: boolean;
  commissionRate?: number;
  scores: CandidateScores;
  tier: MatchTier;
  /** 왜 이 상품인지 — 사용자에게 보여줄 수 있는 근거 */
  matchReason: string[];
}

/** retrieval 입력 — 탐지 객체에서 뽑은 검색 시그널 */
export interface RetrievalQuery {
  canonicalClass: string;
  label: string;
  labelKo: string;
  /** 마스크 픽셀 기반 대표색 hex */
  tone?: string;
  secondaryTones?: string[];
  attributes?: FashionAttributes;
  /** 생성된 검색 쿼리 variants (3~5개) */
  queries: string[];
}
