import type { FashionAttributes } from "../types";
import type { MatchState, ProductIdentifier } from "../commerce/types";

/**
 * Product Retrieval 공통 타입 — provider 결과를 이 스키마로 normalize한다.
 */

export type MatchTier = MatchState;

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
  /** 상품 상세 URL. 검색/목록 URL은 null이어야 한다. */
  detailUrl?: string | null;
  /** 검색/목록 페이지는 구매 링크가 아닌 discovery로만 보존한다. */
  discoveryUrl?: string | null;
  providerProductId?: string;
  identifiers?: readonly ProductIdentifier[];
  detailPageVerified?: boolean;
  purchaseEligible?: boolean;
  matchState?: MatchState;
  imageUrls: string[];
  availability?: string;
  /** "catalog" | "naver" | "gemini-web" | ... */
  source: string;
  /** 그라운딩/검색 출처 URL (신뢰 근거, 디버그·검증용) */
  sourceUrl?: string;
  /** 서버가 네이버 이미지 검색으로 산출한 색상 유사도 (0~1) */
  visualScore?: number;
  visualSource?: string;
  sameProductProbability?: number;
  visualEvidence?: readonly string[];
  visualConflicts?: readonly string[];
  visualSiglipScore?: number | null;
  preliminaryIdentityScore?: number | null;
  finalIdentityScore?: number | null;
  identityStatus?: "VERIFIED" | "LIKELY" | "POSSIBLE" | "CONFLICT" | "UNVERIFIED";
  variantExactness?: boolean;
  matchReasons?: readonly string[];
  conflicts?: readonly string[];
  visualEvidenceDetail?: {
    model: string;
    score: number;
    queryCropMode: "polygon" | "bbox";
    candidateImageAvailable: boolean;
  };
  /** 카탈로그 상품이면 로컬 product id (링크·제휴 정보 재사용) */
  catalogProductId?: string;
  affiliate?: boolean;
  commissionRate?: number | null;
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
