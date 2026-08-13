import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGoUrl, bestOfferIdFor, parseSurface, prepareClick } from "../../lib/commerce/click";
import { mockProvider } from "../../lib/commerce/providers/mock-provider";

const CLICK_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const ctx = (over: Partial<Parameters<typeof prepareClick>[1]> = {}) => ({
  viewerId: null,
  anonymousId: "anon-123",
  creatorId: "c-minu",
  postId: "post-look1",
  objectId: "l1-shirt",
  surface: "feed" as const,
  ...over,
});

// ── 익명 클릭 ────────────────────────────────────────────────────────────────

test("익명 클릭: 로그인 없이 anonymous_id로 어트리뷰션된다", () => {
  const r = prepareClick("of-pl-polo-oxford--m-polo", ctx(), CLICK_ID);
  assert.ok(r.ok);
  assert.equal(r.click.row.viewer_id, null);
  assert.equal(r.click.row.anonymous_id, "anon-123");
  // 컨텍스트가 있는 한 크리에이터/게시물/오브젝트/상품 어트리뷰션은 유지된다
  assert.equal(r.click.row.creator_id, "c-minu");
  assert.equal(r.click.row.post_id, "post-look1");
  assert.equal(r.click.row.object_id, "l1-shirt");
  assert.equal(r.click.row.canonical_product_id, "pl-polo-oxford");
  assert.equal(r.click.row.merchant_id, "m-polo");
});

// ── 로그인 클릭 ──────────────────────────────────────────────────────────────

test("로그인 클릭: viewer_id가 함께 기록된다", () => {
  const viewer = "11111111-1111-4111-8111-111111111111";
  const r = prepareClick("of-pl-polo-oxford--m-polo", ctx({ viewerId: viewer }), CLICK_ID);
  assert.ok(r.ok);
  assert.equal(r.click.row.viewer_id, viewer);
  assert.equal(r.click.row.anonymous_id, "anon-123");
});

// ── creator_shop 클릭 ────────────────────────────────────────────────────────

test("creator_shop 클릭: 게시물 없이도 크리에이터 어트리뷰션이 성립한다", () => {
  const r = prepareClick(
    "of-pl-samba--m-adidas",
    ctx({ postId: null, objectId: null, creatorId: "c-rin", surface: "creator_shop" }),
    CLICK_ID
  );
  assert.ok(r.ok);
  assert.equal(r.click.row.source_surface, "creator_shop");
  assert.equal(r.click.row.creator_id, "c-rin");
  assert.equal(r.click.row.post_id, null);
});

// ── 무효 오퍼 ────────────────────────────────────────────────────────────────

test("무효 오퍼는 404", () => {
  const r = prepareClick("of-does-not-exist", ctx(), CLICK_ID);
  assert.ok(!r.ok);
  assert.equal(r.status, 404);
  assert.equal(r.reason, "unknown_offer");
});

// ── 비활성 판매처 ────────────────────────────────────────────────────────────

const pausedOffer = {
  id: "of-x--m-paused",
  canonicalProductId: "pl-polo-oxford",
  merchantId: "m-paused",
  externalProductId: null,
  title: "t",
  price: 100000,
  currency: "KRW" as const,
  stockStatus: "in_stock" as const,
  shippingLabel: null,
  productUrl: "https://example.com/x",
  affiliateUrl: null,
  commissionRate: null,
  lastSyncedAt: null,
};

test("비활성 판매처: 같은 상품의 최적 오퍼로 대체 후 리다이렉트", async () => {
  const real = await import("../../lib/commerce");
  const r = prepareClick("of-x--m-paused", ctx(), CLICK_ID, {
    findOffer: (id) => (id === "of-x--m-paused" ? pausedOffer : undefined),
    merchantById: (id) =>
      id === "m-paused"
        ? { id, name: "정지된 몰", domain: "x.com", logoUrl: null, trustScore: 0.9, status: "paused" }
        : real.merchantById(id),
    resolveOffersFor: real.resolveOffersFor,
    programsForMerchant: real.programsForMerchant,
  });
  assert.ok(r.ok);
  assert.ok(r.click.substituted);
  // 대체 오퍼(같은 상품)로 클릭이 기록된다 — 인텐트를 죽은 링크에 버리지 않는다
  assert.equal(r.click.row.canonical_product_id, "pl-polo-oxford");
  assert.notEqual(r.click.row.merchant_id, "m-paused");
});

test("비활성 판매처 + 대체 오퍼 없음 → 410", async () => {
  const real = await import("../../lib/commerce");
  const orphan = { ...pausedOffer, id: "of-orphan", canonicalProductId: "p-no-offers" };
  const r = prepareClick("of-orphan", ctx(), CLICK_ID, {
    findOffer: () => orphan,
    merchantById: () => undefined,
    resolveOffersFor: () => ({ best: null, alternatives: [], unavailable: [] }),
    programsForMerchant: real.programsForMerchant,
  });
  assert.ok(!r.ok);
  assert.equal(r.status, 410);
  assert.equal(r.reason, "no_available_offer");
});

// ── 리다이렉트 URL 생성 ──────────────────────────────────────────────────────

test("리다이렉트 URL: mock provider가 클릭 id를 stsclick 파라미터로 싣는다", () => {
  const r = prepareClick("of-pl-polo-oxford--m-polo", ctx(), CLICK_ID);
  assert.ok(r.ok);
  const url = new URL(r.click.redirectUrl);
  assert.equal(url.searchParams.get("stsclick"), CLICK_ID);
  // 원 판매처 URL 기반이다 — 가짜 네트워크 도메인을 만들지 않는다
  assert.equal(url.hostname, "search.shopping.naver.com");
});

test("mock createTrackingUrl은 기존 쿼리를 보존한다", () => {
  const url = new URL(
    mockProvider.createTrackingUrl({
      offer: {
        id: "o-t",
        canonicalProductId: "p",
        merchantId: "m",
        externalProductId: null,
        title: "t",
        price: 1000,
        currency: "KRW",
        stockStatus: "in_stock",
        shippingLabel: null,
        productUrl: "https://example.com/search?q=%ED%8F%B4%EB%A1%9C",
        affiliateUrl: null,
        commissionRate: null,
        lastSyncedAt: null,
      },
      merchant: { id: "m", name: "m", domain: "example.com", logoUrl: null, trustScore: 0.8, status: "active" },
      program: null,
      clickId: CLICK_ID,
    })
  );
  assert.equal(url.searchParams.get("q"), "폴로");
  assert.equal(url.searchParams.get("stsclick"), CLICK_ID);
});

// ── /go URL 헬퍼 ─────────────────────────────────────────────────────────────

test("buildGoUrl: 컨텍스트가 쿼리로 실린다", () => {
  const u = buildGoUrl("of-pl-samba--m-adidas", {
    postId: "post-look5",
    objectId: "l5-shoes",
    creatorId: "c-minu",
    surface: "post",
  });
  assert.ok(u.startsWith("/go/of-pl-samba--m-adidas?"));
  const q = new URLSearchParams(u.split("?")[1]);
  assert.equal(q.get("sf"), "post");
  assert.equal(q.get("post"), "post-look5");
  assert.equal(q.get("obj"), "l5-shoes");
  assert.equal(q.get("creator"), "c-minu");
});

test("bestOfferIdFor: 그래프 상품은 오퍼 id, 커스텀 상품은 null", () => {
  assert.ok(bestOfferIdFor("pl-polo-oxford"));
  assert.equal(bestOfferIdFor("custom-abc123"), null);
  assert.equal(bestOfferIdFor(null), null);
});

test("parseSurface: 화이트리스트 밖 값은 feed로 강등", () => {
  assert.equal(parseSurface("creator_shop"), "creator_shop");
  assert.equal(parseSurface("javascript:alert(1)"), "feed");
  assert.equal(parseSurface(null), "feed");
});
