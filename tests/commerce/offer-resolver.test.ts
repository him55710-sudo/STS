import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMISSION_RATE_CAP,
  RANK_WEIGHTS,
  resolveOffers,
} from "../../lib/commerce/offer-resolver";
import { merchantById, offersForProduct, resolveOffersFor } from "../../lib/commerce";
import { SEED_OFFERS } from "../../lib/commerce/seed";
import type { Merchant, MerchantOffer } from "../../lib/commerce/types";

/** 테스트용 오퍼/판매처 생성기 */
const offer = (over: Partial<MerchantOffer> & { id: string; merchantId: string }): MerchantOffer => ({
  canonicalProductId: "p-test",
  externalProductId: null,
  title: "테스트 상품",
  price: 100000,
  currency: "KRW",
  stockStatus: "in_stock",
  shippingLabel: null,
  productUrl: "https://example.com",
  affiliateUrl: null,
  commissionRate: null,
  lastSyncedAt: null,
  ...over,
});

const merchants = (list: Array<Partial<Merchant> & { id: string }>) => {
  const map = new Map(
    list.map((m) => [
      m.id,
      {
        name: m.id,
        domain: "example.com",
        logoUrl: null,
        trustScore: 0.8,
        status: "active" as const,
        ...m,
      },
    ])
  );
  return (id: string) => map.get(id);
};

// ── 1. 같은 상품의 복수 오퍼 ─────────────────────────────────────────────────

test("같은 canonical product의 복수 오퍼: best 하나 + 나머지는 alternatives", () => {
  const offers = offersForProduct("pl-polo-oxford"); // 시드: 공식몰+SSG+G마켓+쿠팡 = 4개
  assert.equal(offers.length, 4);
  assert.ok(offers.every((o) => o.canonicalProductId === "pl-polo-oxford"));

  const { best, alternatives, unavailable } = resolveOffersFor("pl-polo-oxford");
  assert.ok(best, "가용 오퍼가 있으면 best가 있어야 한다");
  assert.equal(alternatives.length + unavailable.length + 1, 4);
  // best는 alternatives에 중복 등장하지 않는다
  assert.ok(!alternatives.some((a) => a.offer.id === best.offer.id));
  // 전부 같은 상품의 오퍼다 (다른 상품 오퍼 혼입 금지)
  for (const r of [best, ...alternatives, ...unavailable]) {
    assert.equal(r.offer.canonicalProductId, "pl-polo-oxford");
  }
});

// ── 2. 품절 오퍼는 절대 best가 될 수 없다 ────────────────────────────────────

test("품절 오퍼는 best/alternatives에서 제외되고 unavailable로 분리된다", () => {
  // 시드 실데이터: 쿠팡 501이 최저가+최고 수수료지만 품절이다
  const { best, alternatives, unavailable } = resolveOffersFor("pl-levis-501");
  assert.ok(best);
  assert.notEqual(best.offer.merchantId, "m-coupang");
  assert.ok(!alternatives.some((a) => a.offer.stockStatus === "out_of_stock"));
  assert.equal(unavailable.length, 1);
  assert.equal(unavailable[0].offer.merchantId, "m-coupang");
});

test("모든 오퍼가 품절이면 best는 null이다", () => {
  const lookup = merchants([{ id: "m-a" }]);
  const { best, alternatives, unavailable } = resolveOffers(
    [offer({ id: "o1", merchantId: "m-a", stockStatus: "out_of_stock" })],
    lookup
  );
  assert.equal(best, null);
  assert.equal(alternatives.length, 0);
  assert.equal(unavailable.length, 1);
});

// ── 3. 저렴하고 신뢰도 높은 오퍼 > 고수수료 나쁜 오퍼 ────────────────────────

test("저렴하고 신뢰도 높은 오퍼가 고수수료 나쁜 오퍼를 이긴다", () => {
  const lookup = merchants([
    { id: "m-good", trustScore: 0.92 },
    { id: "m-bad", trustScore: 0.55 },
  ]);
  const cheapTrusted = offer({ id: "o-good", merchantId: "m-good", price: 89000, commissionRate: 0 });
  const expensiveHighCommission = offer({
    id: "o-bad",
    merchantId: "m-bad",
    price: 119000,
    commissionRate: 0.5, // CAP(0.1)를 한참 넘는 수수료 — 그래도 못 이겨야 한다
  });
  const { best } = resolveOffers([expensiveHighCommission, cheapTrusted], lookup);
  assert.ok(best);
  assert.equal(best.offer.id, "o-good");
});

// ── 4. 수수료는 절대 랭킹을 지배할 수 없다 (구조적 상한) ─────────────────────

test("수수료 가중치는 price·trust보다 항상 작다 (설정 불변식)", () => {
  assert.ok(RANK_WEIGHTS.commission < RANK_WEIGHTS.price);
  assert.ok(RANK_WEIGHTS.commission < RANK_WEIGHTS.trust);
});

test("수수료율은 CAP에서 절단된다 — CAP 이상은 추가 이득이 없다", () => {
  const lookup = merchants([{ id: "m-a" }, { id: "m-b" }]);
  const atCap = offer({ id: "o-cap", merchantId: "m-a", commissionRate: COMMISSION_RATE_CAP });
  const wayOverCap = offer({ id: "o-over", merchantId: "m-b", commissionRate: 0.9 });
  const { best, alternatives } = resolveOffers([atCap, wayOverCap], lookup);
  assert.ok(best);
  // 나머지 조건이 동일하므로 점수도 동일해야 한다 (0.9가 0.1을 이기지 못함)
  assert.equal(best.score, alternatives[0].score);
  assert.equal(best.breakdown.commission, alternatives[0].breakdown.commission);
});

test("동일 조건에서 수수료만 다르면 그 차이는 commission 가중치 이하다", () => {
  const lookup = merchants([{ id: "m-a" }, { id: "m-b" }]);
  const zero = offer({ id: "o-zero", merchantId: "m-a", commissionRate: 0 });
  const max = offer({ id: "o-max", merchantId: "m-b", commissionRate: COMMISSION_RATE_CAP });
  const { best, alternatives } = resolveOffers([zero, max], lookup);
  assert.ok(best);
  const delta = Math.abs(best.score - alternatives[0].score);
  assert.ok(delta <= RANK_WEIGHTS.commission + 1e-9, `수수료가 만든 점수 차 ${delta}는 가중치 상한을 넘을 수 없다`);
});

// ── 판매처 상태 ──────────────────────────────────────────────────────────────

test("비활성(paused/delisted) 판매처의 오퍼는 후보에서 제외된다", () => {
  const lookup = merchants([
    { id: "m-live", trustScore: 0.7 },
    { id: "m-dead", trustScore: 0.99, status: "delisted" },
  ]);
  const { best, alternatives, unavailable } = resolveOffers(
    [
      offer({ id: "o-live", merchantId: "m-live", price: 120000 }),
      offer({ id: "o-dead", merchantId: "m-dead", price: 80000 }),
    ],
    lookup
  );
  assert.ok(best);
  assert.equal(best.offer.id, "o-live");
  assert.equal(alternatives.length + unavailable.length, 0);
});

// ── 시드 전수 무결성 ─────────────────────────────────────────────────────────

test("시드 그래프 무결성: 모든 오퍼의 merchant가 존재한다", () => {
  for (const o of SEED_OFFERS) {
    assert.ok(merchantById(o.merchantId), `오퍼 ${o.id}의 판매처 ${o.merchantId}가 없다`);
  }
});
