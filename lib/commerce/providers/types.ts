import type { AffiliateProgram, Merchant, MerchantOffer } from "../types";

/**
 * 제휴 provider 어댑터 경계 — lib/llm/*와 같은 어댑터 패턴.
 *
 * 실제 네트워크(LinkPrice·쿠팡 파트너스 등) 연동은 공식 자격증명/문서 확보 후
 * 이 인터페이스의 구현체를 registry에 등록하는 것으로 끝난다. 그 전까지는
 * mock provider가 모든 provider 이름을 처리한다 — 엔드포인트를 지어내지 않는다.
 */

export interface TrackingUrlInput {
  offer: MerchantOffer;
  merchant: Merchant;
  program: AffiliateProgram | null;
  /** commerce_clicks.id — 네트워크 subid로 실려 갔다가 postback으로 돌아온다 */
  clickId: string;
}

/** 스키마 검증을 통과한 전환 페이로드 — provider 값을 검증 없이 신뢰하지 않는다 */
export interface ParsedConversion {
  externalConversionId: string;
  externalOrderId: string | null;
  /** subid 왕복으로 돌아온 클릭 id — 없으면 미귀속 전환으로 저장된다 */
  clickId: string | null;
  grossOrderValue: number;
  eligibleValue: number;
  commissionAmount: number;
  currency: string;
  status: "pending" | "confirmed" | "reversed";
  occurredAt: string; // ISO
}

export type ParseConversionResult =
  | { ok: true; conversion: ParsedConversion }
  | { ok: false; reason: string };

export interface AffiliateProviderAdapter {
  /** registry 키 — postback 경로 /api/affiliate/[provider]/postback와 일치 */
  id: string;
  /**
   * 클릭 id를 실은 판매처 이동 URL 생성.
   * 실연동 전 mock은 offer.productUrl에 자체 파라미터만 부가한다 —
   * 가짜 네트워크 도메인/딥링크를 만들지 않는다.
   */
  createTrackingUrl(input: TrackingUrlInput): string;
  /** postback 페이로드 파싱 + 스키마 검증. 실패 사유는 audit용으로 보존된다 */
  parseConversion(payload: unknown): ParseConversionResult;
}
