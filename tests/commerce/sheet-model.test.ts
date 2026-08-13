import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGACY_PRODUCT_VIEWS } from "../../lib/commerce";
import { buildProductSheetModel } from "../../lib/commerce/sheet-model";
import type { ObjectTag, Product } from "../../lib/types";

const lookupLegacy = (id: string | null | undefined) =>
  LEGACY_PRODUCT_VIEWS.find((p) => p.id === id);

const tag = (over: Partial<ObjectTag>): ObjectTag => ({
  id: "o-1",
  label: "옥스포드 셔츠",
  x: 0.3,
  y: 0.2,
  w: 0.3,
  h: 0.3,
  productId: "pl-polo-oxford",
  exactness: "exact",
  confidence: 0.95,
  ...over,
});

// ── Exact / Similar 분리 불변식 ──────────────────────────────────────────────

test("오퍼 섹션에는 착용 상품의 오퍼만, similar에는 착용 상품이 절대 없다", () => {
  const model = buildProductSheetModel(tag({}), lookupLegacy);
  assert.ok(model && model.kind === "canonical");

  // 오퍼 섹션 = 전부 exact canonical의 오퍼
  const offerProductIds = new Set(
    [model.bestOffer, ...model.otherOffers, ...model.unavailableOffers]
      .filter((r) => r != null)
      .map((r) => r.offer.canonicalProductId)
  );
  assert.deepEqual([...offerProductIds], [model.canonical.id]);

  // similar 섹션 = 착용 상품 미포함 + 오퍼 섹션과 교집합 없음
  assert.ok(model.similarStyles.length > 0);
  const similarIds = model.similarStyles.map((p) => p.id);
  assert.ok(!similarIds.includes(model.canonical.id));
  for (const sid of similarIds) {
    assert.ok(!offerProductIds.has(sid), `similar ${sid}가 오퍼 섹션에 섞였다`);
  }
});

test("exactness 배지는 오브젝트의 크리에이터 확정값을 그대로 따른다", () => {
  const exact = buildProductSheetModel(tag({ exactness: "exact" }), lookupLegacy);
  const similar = buildProductSheetModel(tag({ exactness: "similar" }), lookupLegacy);
  assert.equal(exact?.exactness, "exact");
  assert.equal(similar?.exactness, "similar");
});

// ── 폴백 경로 ────────────────────────────────────────────────────────────────

test("오퍼 그래프 밖 상품(커스텀/스냅샷)은 legacy 모델로 폴백한다", () => {
  const custom: Product = {
    id: "custom-abc",
    brand: "example.com",
    name: "직접 연결한 상품",
    price: 30000,
    currency: "KRW",
    retailer: "example.com",
    url: "https://example.com/p/1",
    image: "/looks/_custom-link.svg",
    category: "fashion",
    affiliate: false,
    similarIds: [],
  };
  const model = buildProductSheetModel(
    tag({ productId: "custom-abc" }),
    (id) => (id === "custom-abc" ? custom : lookupLegacy(id))
  );
  assert.ok(model && model.kind === "legacy");
  assert.equal(model.product.id, "custom-abc");
});

test("productId가 없으면 모델은 null (미연결 오브젝트 UI)", () => {
  assert.equal(buildProductSheetModel(tag({ productId: null }), lookupLegacy), null);
});

// ── legacy 호환 뷰 정합성 ────────────────────────────────────────────────────

test("legacy Product 뷰의 가격·판매처는 best offer와 일치한다", () => {
  // pl-samba: G마켓 126,000이 최저가지만 신뢰도가 낮다 — 뷰의 가격은 resolver의 best를 따른다
  const model = buildProductSheetModel(tag({ productId: "pl-samba" }), lookupLegacy);
  assert.ok(model && model.kind === "canonical" && model.bestOffer);
  const view = lookupLegacy("pl-samba")!;
  assert.equal(view.price, model.bestOffer.offer.price);
  assert.equal(view.retailer, model.bestOffer.merchant.name);
});
