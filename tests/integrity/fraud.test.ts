import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateClickRisk,
  evaluateConversionRisk,
  FRAUD_RULES,
  isImplausibleTimestamp,
} from "../../lib/integrity/fraud";

const NOW = Date.parse("2026-08-14T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

// ── 크리에이터 자기 클릭 ─────────────────────────────────────────────────────

test("크리에이터가 자기 상품을 클릭하면 self_click 플래그", () => {
  const flags = evaluateClickRisk({
    viewerId: "creator-1",
    creatorId: "creator-1",
    recentClickCount: 0,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "self_click");
  assert.equal(flags[0].severity, "warn");
});

test("다른 사람이 클릭하면 플래그 없음", () => {
  assert.equal(
    evaluateClickRisk({ viewerId: "viewer-9", creatorId: "creator-1", recentClickCount: 0 }).length,
    0
  );
});

test("익명 클릭은 자기거래 판정 대상이 아니다", () => {
  assert.equal(
    evaluateClickRisk({ viewerId: null, creatorId: "creator-1", recentClickCount: 0 }).length,
    0
  );
});

// ── 클릭 버스트 ──────────────────────────────────────────────────────────────

test("임계 미만 반복 클릭은 정상으로 본다 (두 번 누르는 건 흔하다)", () => {
  const flags = evaluateClickRisk({
    viewerId: "v-1",
    creatorId: "c-1",
    recentClickCount: FRAUD_RULES.burstThreshold - 1,
  });
  assert.equal(flags.length, 0);
});

test("임계 이상이면 click_burst 플래그", () => {
  const flags = evaluateClickRisk({
    viewerId: "v-1",
    creatorId: "c-1",
    recentClickCount: FRAUD_RULES.burstThreshold,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "click_burst");
  assert.ok(flags[0].reason.includes(String(FRAUD_RULES.burstThreshold)));
});

test("자기 클릭 + 버스트가 동시에 걸리면 둘 다 기록된다", () => {
  const flags = evaluateClickRisk({
    viewerId: "c-1",
    creatorId: "c-1",
    recentClickCount: 20,
  });
  assert.deepEqual(flags.map((f) => f.kind).sort(), ["click_burst", "self_click"]);
});

// ── 중복 콜백 ────────────────────────────────────────────────────────────────

test("중복 콜백은 info로 기록된다 (네트워크 재시도는 정상 동작)", () => {
  const flags = evaluateConversionRisk({
    outcome: "duplicate",
    occurredAt: NOW - DAY,
    now: NOW,
    incomingCommission: 1000,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "duplicate_callback");
  assert.equal(flags[0].severity, "info");
});

test("정상 신규 전환은 플래그 없음", () => {
  assert.equal(
    evaluateConversionRisk({
      outcome: "created",
      occurredAt: NOW - DAY,
      now: NOW,
      incomingCommission: 1000,
    }).length,
    0
  );
});

test("같은 전환 id로 금액이 바뀌면 critical", () => {
  const flags = evaluateConversionRisk({
    outcome: "duplicate",
    occurredAt: NOW - DAY,
    now: NOW,
    storedCommission: 1000,
    incomingCommission: 99000,
  });
  const critical = flags.find((f) => f.severity === "critical");
  assert.ok(critical);
  assert.equal(critical.kind, "conversion_replay");
  assert.ok(critical.reason.includes("99000"));
});

test("같은 금액의 중복 재전송은 critical이 아니다", () => {
  const flags = evaluateConversionRisk({
    outcome: "duplicate",
    occurredAt: NOW - DAY,
    now: NOW,
    storedCommission: 1000,
    incomingCommission: 1000,
  });
  assert.ok(!flags.some((f) => f.severity === "critical"));
});

// ── 전환 리플레이 ────────────────────────────────────────────────────────────

test("임계를 넘는 과거 전환은 replay로 의심한다", () => {
  const flags = evaluateConversionRisk({
    outcome: "created",
    occurredAt: NOW - (FRAUD_RULES.replayMaxAgeDays + 10) * DAY,
    now: NOW,
    incomingCommission: 1000,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "conversion_replay");
});

test("정상 지연 범위의 전환은 플래그 없음", () => {
  assert.equal(
    evaluateConversionRisk({
      outcome: "created",
      occurredAt: NOW - 30 * DAY,
      now: NOW,
      incomingCommission: 1000,
    }).length,
    0
  );
});

test("미래 시각 전환은 신뢰 불가로 판정된다", () => {
  assert.ok(isImplausibleTimestamp(NOW + 2 * 60 * 60 * 1000, NOW));
  assert.ok(!isImplausibleTimestamp(NOW - 1000, NOW));
  assert.ok(!isImplausibleTimestamp(NOW + 60_000, NOW), "약간의 시계 오차는 허용");
});

// ── 규칙 자체의 성질 ─────────────────────────────────────────────────────────

test("모든 규칙은 결정적이다 — 같은 입력이면 같은 결과", () => {
  const input = { viewerId: "c-1", creatorId: "c-1", recentClickCount: 9 };
  assert.deepEqual(evaluateClickRisk(input), evaluateClickRisk(input));
});

test("임계값이 합리적인 범위에 있다", () => {
  assert.ok(FRAUD_RULES.burstThreshold >= 3, "너무 낮으면 정상 사용자를 잡는다");
  assert.ok(FRAUD_RULES.burstWindowSeconds >= 10);
  assert.ok(FRAUD_RULES.replayMaxAgeDays >= 30, "제휴 쿠키 윈도보다 길어야 한다");
});
