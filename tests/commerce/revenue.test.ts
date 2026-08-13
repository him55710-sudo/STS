import assert from "node:assert/strict";
import { test } from "node:test";
import { mockProvider } from "../../lib/commerce/providers/mock-provider";
import { computeSplit, DEFAULT_CREATOR_SHARE } from "../../lib/commerce/revenue";

// ── 분배 (70/30 · 커스텀 · 합계 불변식) ─────────────────────────────────────

test("기본 분배: 70/30 (설정 미변경 시)", () => {
  const { creatorShare, platformShare } = computeSplit(10000, 0.7);
  assert.equal(creatorShare, 7000);
  assert.equal(platformShare, 3000);
});

test("커스텀 분배율: 0.85", () => {
  const { creatorShare, platformShare } = computeSplit(10000, 0.85);
  assert.equal(creatorShare, 8500);
  assert.equal(platformShare, 1500);
});

test("분배 합계 불변식: 어떤 금액·비율이든 creator + platform = gross", () => {
  for (const gross of [0, 1, 3, 999, 18130, 1234567]) {
    for (const share of [0, 0.3, 0.5, 0.7, 0.85, 1]) {
      const { creatorShare, platformShare } = computeSplit(gross, share);
      assert.equal(creatorShare + platformShare, gross, `${gross} @ ${share}`);
      assert.ok(creatorShare >= 0 && platformShare >= 0);
    }
  }
});

test("잘못된 분배율은 클램프, 음수 수수료는 예외", () => {
  assert.equal(computeSplit(1000, 5).creatorShare, 1000); // >1 → 1로 클램프
  assert.equal(computeSplit(1000, -1).creatorShare, 0); // <0 → 0으로 클램프
  assert.throws(() => computeSplit(-1));
});

test("DEFAULT_CREATOR_SHARE는 유효 범위다", () => {
  assert.ok(DEFAULT_CREATOR_SHARE >= 0 && DEFAULT_CREATOR_SHARE <= 1);
});

// ── postback 페이로드 검증 (전환 생성의 관문) ────────────────────────────────

const valid = {
  conversion_id: "mock-conv-1",
  order_id: "ord-1",
  click_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  order_value: 259000,
  eligible_value: 259000,
  commission: 18130,
  currency: "KRW",
  status: "pending",
  occurred_at: "2026-08-13T12:00:00Z",
};

test("전환 생성: 유효 페이로드가 ParsedConversion으로 정규화된다", () => {
  const r = mockProvider.parseConversion(valid);
  assert.ok(r.ok);
  assert.equal(r.conversion.externalConversionId, "mock-conv-1");
  assert.equal(r.conversion.clickId, valid.click_id);
  assert.equal(r.conversion.grossOrderValue, 259000);
  assert.equal(r.conversion.commissionAmount, 18130);
  assert.equal(r.conversion.status, "pending");
});

test("pending → confirmed 전이 페이로드도 동일 스키마로 파싱된다", () => {
  const r = mockProvider.parseConversion({ ...valid, status: "confirmed" });
  assert.ok(r.ok);
  assert.equal(r.conversion.status, "confirmed");
});

test("reversal 페이로드", () => {
  const r = mockProvider.parseConversion({ ...valid, status: "reversed" });
  assert.ok(r.ok);
  assert.equal(r.conversion.status, "reversed");
});

test("provider 값을 맹신하지 않는다 — 스키마 위반은 전부 거절", () => {
  const bad: Array<[string, unknown]> = [
    ["배열", []],
    ["conversion_id 없음", { ...valid, conversion_id: undefined }],
    ["음수 주문금액", { ...valid, order_value: -1 }],
    ["수수료 > 주문금액", { ...valid, commission: 999999999 }],
    ["eligible > 주문금액", { ...valid, eligible_value: 999999999 }],
    ["이상한 status", { ...valid, status: "paid_out" }],
    ["click_id 형식 위반", { ...valid, click_id: "not-a-uuid" }],
    ["occurred_at 파싱 불가", { ...valid, occurred_at: "어제쯤" }],
    ["통화 코드 위반", { ...valid, currency: "원" }],
  ];
  for (const [label, payload] of bad) {
    const r = mockProvider.parseConversion(payload);
    assert.ok(!r.ok, `거절되어야 함: ${label}`);
  }
});

test("click_id 없는 전환도 유효하다 (미귀속 전환으로 보존)", () => {
  const r = mockProvider.parseConversion({ ...valid, click_id: undefined });
  assert.ok(r.ok);
  assert.equal(r.conversion.clickId, null);
});

test("중복 callback 방어의 1차 키: 같은 페이로드는 같은 external id로 파싱된다", () => {
  const a = mockProvider.parseConversion(valid);
  const b = mockProvider.parseConversion({ ...valid });
  assert.ok(a.ok && b.ok);
  // (provider, external_conversion_id) 유니크 제약이 DB에서 중복 수익을 차단한다 —
  // 같은 콜백은 반드시 같은 키로 수렴해야 그 제약이 동작한다
  assert.equal(a.conversion.externalConversionId, b.conversion.externalConversionId);
});
