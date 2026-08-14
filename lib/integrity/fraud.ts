/**
 * 결정적 사기 방지 규칙 (ML 없음).
 *
 * 모든 판정은 명시적 임계값과 순수 비교로 이뤄진다 — 학습 모델도, 확률도 없다.
 * 오탐이 나도 왜 걸렸는지 한 줄로 설명할 수 있어야 한다는 원칙이다.
 *
 * **임계값의 단일 출처**: 아래 상수는 서버 라우트가 DB RPC에 파라미터로 넘겨
 * 판정에 사용된다. SQL에 값이 중복 정의되지 않으므로 드리프트가 생기지 않는다.
 */

export type FraudKind =
  | "duplicate_callback"
  | "click_burst"
  | "self_click"
  | "conversion_replay";

export type FraudSeverity = "info" | "warn" | "critical";

export const FRAUD_RULES = {
  /** 클릭 버스트: 이 시간창 안에 */
  burstWindowSeconds: 60,
  /** 같은 사용자·같은 오퍼로 이만큼 넘게 클릭하면 플래그 */
  burstThreshold: 5,
  /**
   * 전환 리플레이: 통보된 발생 시각이 지금보다 이만큼 과거면 의심.
   * (정상 postback은 보통 수 분~수 일 내에 도착한다)
   */
  replayMaxAgeDays: 90,
} as const;

export interface FraudFlag {
  kind: FraudKind;
  severity: FraudSeverity;
  reason: string;
}

/** 클릭 위험 평가 입력 — 삽입 직전 컨텍스트 */
export interface ClickRiskInput {
  /** 클릭한 사람 (로그인 시) */
  viewerId: string | null;
  /** 게시물의 크리에이터 */
  creatorId: string | null;
  /** 같은 사용자·같은 오퍼의 최근 클릭 수 (burstWindowSeconds 이내, 이번 클릭 제외) */
  recentClickCount: number;
}

/**
 * 클릭 위험 판정 — 두 규칙.
 *  1. self_click: 크리에이터가 자기 콘텐츠의 상품을 클릭 (수수료 자기거래)
 *  2. click_burst: 짧은 시간에 같은 오퍼를 반복 클릭
 *
 * 플래그는 클릭을 **막지 않는다**. 기록하고 정산 검토 대상으로 표시할 뿐이다 —
 * 정상 사용자가 링크를 두 번 눌렀다고 구매를 막으면 그게 더 큰 손해다.
 */
export function evaluateClickRisk(input: ClickRiskInput): FraudFlag[] {
  const flags: FraudFlag[] = [];

  if (input.viewerId != null && input.creatorId != null && input.viewerId === input.creatorId) {
    flags.push({
      kind: "self_click",
      severity: "warn",
      reason: "크리에이터가 자기 콘텐츠의 상품 링크를 클릭했습니다 (자기거래 가능성)",
    });
  }

  if (input.recentClickCount >= FRAUD_RULES.burstThreshold) {
    flags.push({
      kind: "click_burst",
      severity: "warn",
      reason: `${FRAUD_RULES.burstWindowSeconds}초 내 같은 오퍼 클릭 ${
        input.recentClickCount + 1
      }회 (임계 ${FRAUD_RULES.burstThreshold})`,
    });
  }

  return flags;
}

/** 전환 위험 평가 입력 */
export interface ConversionRiskInput {
  /** ingest_conversion의 판정 결과 */
  outcome: "created" | "duplicate" | "confirmed" | "reversed" | "ignored_downgrade";
  /** provider가 통보한 발생 시각 */
  occurredAt: number;
  /** 처리 시각 */
  now: number;
  /** 이미 저장된 전환의 수수료 (있으면) */
  storedCommission?: number | null;
  /** 이번 콜백의 수수료 */
  incomingCommission: number;
}

/**
 * 전환 위험 판정 — 두 규칙.
 *  1. duplicate_callback: 동일 전환이 재전송됨 (수익 중복은 DB가 이미 막지만 가시성 확보)
 *  2. conversion_replay: 과거 전환을 재생하거나, 같은 id로 금액이 바뀜
 *
 * 중복 자체가 곧 사기는 아니다 (네트워크 재시도는 정상) — 그래서 severity가 info다.
 * 금액이 바뀐 재전송은 다르다: critical.
 */
export function evaluateConversionRisk(input: ConversionRiskInput): FraudFlag[] {
  const flags: FraudFlag[] = [];

  if (input.outcome === "duplicate") {
    flags.push({
      kind: "duplicate_callback",
      severity: "info",
      reason: "동일 전환 콜백이 재전송되었습니다 (중복 수익은 생성되지 않음)",
    });
  }

  const ageDays = (input.now - input.occurredAt) / (24 * 60 * 60 * 1000);
  if (ageDays > FRAUD_RULES.replayMaxAgeDays) {
    flags.push({
      kind: "conversion_replay",
      severity: "warn",
      reason: `발생 시각이 ${Math.round(ageDays)}일 전입니다 (임계 ${
        FRAUD_RULES.replayMaxAgeDays
      }일 — 과거 전환 재생 의심)`,
    });
  }

  if (
    input.storedCommission != null &&
    input.outcome === "duplicate" &&
    input.storedCommission !== input.incomingCommission
  ) {
    flags.push({
      kind: "conversion_replay",
      severity: "critical",
      reason: `같은 전환 id로 다른 수수료가 통보되었습니다 (저장 ${input.storedCommission} → 수신 ${input.incomingCommission})`,
    });
  }

  return flags;
}

/** 미래 시각으로 온 전환도 신뢰할 수 없다 */
export function isImplausibleTimestamp(occurredAt: number, now: number): boolean {
  return occurredAt > now + 60 * 60 * 1000; // 1시간 이상 미래
}
