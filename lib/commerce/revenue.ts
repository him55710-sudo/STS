/**
 * 수익 분배 정책 — 단일 출처.
 *
 * 크리에이터 몫은 NEXT_PUBLIC_CREATOR_SHARE로 설정한다 (기본 0.70).
 * UI 문자열·정산 계산 모두 이 모듈을 거친다 — 70%를 코드 곳곳에
 * 하드코딩하지 않는다. (감사 문서의 B1: 0.75/0.70 불일치의 재발 방지)
 */

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.7);

export const DEFAULT_CREATOR_SHARE = clamp01(
  parseFloat(process.env.NEXT_PUBLIC_CREATOR_SHARE ?? "0.7")
);

/** 확정 후 지급 가능까지의 보류 기간 (반품/취소 윈도) */
export const LEDGER_HOLD_DAYS = 30;

/** UI 라벨용 — "수수료의 70%" 등 */
export const creatorSharePercent = (share: number = DEFAULT_CREATOR_SHARE) =>
  Math.round(share * 100);

export interface CommissionSplit {
  creatorShare: number;
  platformShare: number;
}

/**
 * 수수료 분배 — 원 단위 반올림, 합계 불변식(creator + platform === gross)은
 * platform이 잔여를 가져가는 방식으로 항상 성립한다. DB check 제약과 동일 규칙.
 */
export function computeSplit(
  grossCommission: number,
  share: number = DEFAULT_CREATOR_SHARE
): CommissionSplit {
  if (!Number.isFinite(grossCommission) || grossCommission < 0) {
    throw new Error(`invalid gross commission: ${grossCommission}`);
  }
  const s = clamp01(share);
  const creatorShare = Math.round(grossCommission * s);
  return { creatorShare, platformShare: grossCommission - creatorShare };
}
