import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_CANONICAL_PRODUCTS } from "../../lib/commerce/seed";
import {
  SEED_PLACEMENTS,
  selectSponsoredSimilar,
  type SponsoredPlacement,
} from "../../lib/commerce/sponsored";
import { buildProductSheetModel } from "../../lib/commerce/sheet-model";
import { LEGACY_PRODUCT_VIEWS } from "../../lib/commerce";
import { RANK_WEIGHTS } from "../../lib/recommendation/feed-ranker";
import {
  assessIntegrity,
  commerceHeavyRatio,
  computeIntegrityMetrics,
  creatorRetention,
  hideRate,
  organicContentRatio,
  type PostShape,
} from "../../lib/metrics/integrity";
import type { ObjectTag, Product } from "../../lib/types";

const lookupLegacy = (id: string | null | undefined) =>
  LEGACY_PRODUCT_VIEWS.find((p) => p.id === id);

const tag = (over: Partial<ObjectTag>): ObjectTag => ({
  id: "o-1",
  label: "아이템",
  x: 0.3,
  y: 0.2,
  w: 0.3,
  h: 0.3,
  productId: "pl-polo-oxford",
  exactness: "exact",
  confidence: 0.95,
  ...over,
});

const DAY = 24 * 60 * 60 * 1000;

// ── 불변식 1: exact 상품은 살 수 없다(광고로 매수 불가) ──────────────────────

test("exact 상품은 절대 sponsored가 될 수 없다 — 자기 자신을 타깃해도 무시", () => {
  const selfTargeting: SponsoredPlacement[] = [
    {
      id: "sp-evil",
      sponsoredProductId: "pl-polo-oxford", // 착용 상품 자신을 광고로 밀어넣으려는 시도
      targetProductIds: ["pl-polo-oxford"],
      targetCategory: null,
      label: "Sponsored",
      status: "active",
    },
  ];
  assert.equal(selectSponsoredSimilar("pl-polo-oxford", [], selfTargeting), null);
});

test("시트 모델에서 광고는 착용 상품/오퍼 섹션과 완전히 분리된다", () => {
  const model = buildProductSheetModel(tag({}), lookupLegacy);
  assert.ok(model && model.kind === "canonical");

  // 광고 슬롯이 존재하더라도 착용 상품이 될 수 없다
  if (model.sponsoredSimilar) {
    assert.notEqual(model.sponsoredSimilar.product.id, model.canonical.id);
    // 오퍼 섹션은 오직 착용 상품의 오퍼만 담는다
    for (const r of [model.bestOffer, ...model.otherOffers, ...model.unavailableOffers]) {
      if (r) assert.equal(r.offer.canonicalProductId, model.canonical.id);
    }
    // 오가닉 similar와도 중복되지 않는다
    assert.ok(!model.similarStyles.some((p) => p.id === model.sponsoredSimilar!.product.id));
  }
});

test("모든 시드 상품에 대해 exact 오염이 발생하지 않는다 (전수 검사)", () => {
  for (const c of SEED_CANONICAL_PRODUCTS) {
    const model = buildProductSheetModel(tag({ productId: c.id }), lookupLegacy);
    if (!model || model.kind !== "canonical") continue;
    if (model.sponsoredSimilar) {
      assert.notEqual(
        model.sponsoredSimilar.product.id,
        model.canonical.id,
        `${c.id}의 광고 슬롯이 착용 상품을 노출했다`
      );
    }
  }
});

// ── 불변식 2: sponsored는 항상 라벨된다 ──────────────────────────────────────

test("모든 광고 지면은 비어 있지 않은 라벨을 갖는다", () => {
  for (const p of SEED_PLACEMENTS) {
    assert.ok(p.label && p.label.trim().length > 0, `${p.id}에 라벨이 없다`);
  }
});

test("라벨이 비어 있어도 기본 Sponsored 라벨로 채워진다 — 무라벨 광고 경로 없음", () => {
  const blank: SponsoredPlacement[] = [
    {
      id: "sp-blank",
      sponsoredProductId: "plw-longchamp",
      targetProductIds: ["plw-celine-bag"],
      targetCategory: null,
      label: "   ",
      status: "active",
    },
  ];
  const s = selectSponsoredSimilar("plw-celine-bag", [], blank);
  assert.ok(s);
  assert.equal(s.label, "Sponsored");
});

test("일시중지된 지면은 노출되지 않는다", () => {
  const paused: SponsoredPlacement[] = [
    { ...SEED_PLACEMENTS[0], id: "sp-paused", status: "paused" },
  ];
  assert.equal(selectSponsoredSimilar("plw-celine-bag", [], paused), null);
});

test("광고는 similar 대안에만 붙는다 — 타깃이 아니면 노출 없음", () => {
  const s = selectSponsoredSimilar("pl-samba", [], SEED_PLACEMENTS);
  assert.equal(s, null, "타깃하지 않은 상품에는 광고가 붙지 않는다");
});

// ── 불변식 3: 수수료가 피드 랭킹을 지배하지 않는다 ───────────────────────────

test("수수료 가중치는 피드 랭킹의 모든 축보다 작다", () => {
  const others = Object.entries(RANK_WEIGHTS).filter(([k]) => k !== "commission");
  for (const [axis, weight] of others) {
    assert.ok(RANK_WEIGHTS.commission < weight, `commission < ${axis} 위반`);
  }
  // 수수료 축의 비중이 전체의 5%를 넘지 않는다
  const total = Object.values(RANK_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(RANK_WEIGHTS.commission / total < 0.05);
});

// ── 불변식 4: 비커머스 일상 콘텐츠가 불이익을 받지 않는다 ────────────────────

test("오가닉 콘텐츠 비율 — 상품 0~1개 게시물의 비중", () => {
  const posts: PostShape[] = [
    { postId: "a", creatorId: "c1", linkedProductCount: 0, publishedAt: 0 },
    { postId: "b", creatorId: "c1", linkedProductCount: 1, publishedAt: 0 },
    { postId: "c", creatorId: "c2", linkedProductCount: 5, publishedAt: 0 },
    { postId: "d", creatorId: "c2", linkedProductCount: 4, publishedAt: 0 },
  ];
  assert.equal(organicContentRatio(posts), 0.5);
  assert.equal(commerceHeavyRatio(posts), 0.5);
});

test("빈 입력에서도 지표는 안전하게 0을 반환한다", () => {
  assert.equal(organicContentRatio([]), 0);
  assert.equal(commerceHeavyRatio([]), 0);
  assert.equal(hideRate(0, 0), 0);
  assert.equal(creatorRetention([], Date.now()), 0);
});

// ── 지표 ─────────────────────────────────────────────────────────────────────

test("숨김률 계산", () => {
  assert.equal(hideRate(5, 100), 0.05);
  assert.equal(hideRate(0, 100), 0);
});

test("크리에이터 유지율 — 이전 기간 발행자 중 이번 기간 재발행 비율", () => {
  const now = Date.now();
  const posts: PostShape[] = [
    // 이전 기간(30~60일 전) 발행: c1, c2
    { postId: "p1", creatorId: "c1", linkedProductCount: 0, publishedAt: now - 45 * DAY },
    { postId: "p2", creatorId: "c2", linkedProductCount: 0, publishedAt: now - 40 * DAY },
    // 이번 기간(0~30일) 발행: c1만 복귀
    { postId: "p3", creatorId: "c1", linkedProductCount: 0, publishedAt: now - 5 * DAY },
    { postId: "p4", creatorId: "c3", linkedProductCount: 0, publishedAt: now - 2 * DAY },
  ];
  assert.equal(creatorRetention(posts, now), 0.5);
});

test("무결성 평가 — 임계를 벗어나면 unhealthy로 표시된다", () => {
  const healthy = assessIntegrity(
    computeIntegrityMetrics({
      posts: [
        { postId: "a", creatorId: "c1", linkedProductCount: 0, publishedAt: Date.now() },
        { postId: "b", creatorId: "c1", linkedProductCount: 1, publishedAt: Date.now() },
      ],
      hides: 1,
      impressions: 100,
    })
  );
  assert.equal(healthy.find((m) => m.key === "organicContentRatio")?.healthy, true);
  assert.equal(healthy.find((m) => m.key === "hideRate")?.healthy, true);

  const unhealthy = assessIntegrity(
    computeIntegrityMetrics({
      posts: [
        { postId: "a", creatorId: "c1", linkedProductCount: 6, publishedAt: Date.now() },
        { postId: "b", creatorId: "c1", linkedProductCount: 8, publishedAt: Date.now() },
      ],
      hides: 30,
      impressions: 100,
    })
  );
  assert.equal(unhealthy.find((m) => m.key === "organicContentRatio")?.healthy, false);
  assert.equal(unhealthy.find((m) => m.key === "commerceHeavyRatio")?.healthy, false);
  assert.equal(unhealthy.find((m) => m.key === "hideRate")?.healthy, false);
});

test("네 가지 지표가 모두 노출된다", () => {
  const keys = assessIntegrity(computeIntegrityMetrics({ posts: [], hides: 0, impressions: 0 })).map(
    (m) => m.key
  );
  assert.deepEqual(keys, [
    "organicContentRatio",
    "commerceHeavyRatio",
    "hideRate",
    "creatorRetention",
  ]);
});

// ── 커스텀 상품 시트에는 광고가 없다 ─────────────────────────────────────────

test("오퍼 그래프 밖 상품(legacy) 시트에는 광고 슬롯 자체가 없다", () => {
  const custom: Product = {
    id: "custom-x",
    brand: "example.com",
    name: "직접 연결한 상품",
    price: 30000,
    currency: "KRW",
    retailer: "example.com",
    url: "https://example.com/p",
    image: "/looks/_custom-link.svg",
    category: "fashion",
    affiliate: false,
    similarIds: [],
  };
  const model = buildProductSheetModel(tag({ productId: "custom-x" }), (id) =>
    id === "custom-x" ? custom : lookupLegacy(id)
  );
  assert.ok(model && model.kind === "legacy");
  assert.ok(!("sponsoredSimilar" in model));
});
