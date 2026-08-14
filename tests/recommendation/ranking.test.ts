import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMISSION_RATE_CAP,
  RANK_WEIGHTS,
  diversify,
  rankFeed,
  rankFollowingFeed,
  scoreCandidate,
  type RankableCandidate,
  type RankingContext,
} from "../../lib/recommendation/feed-ranker";
import {
  buildTasteProfile,
  colorBucketOf,
  EMPTY_PROFILE,
  priceBandOf,
  SIGNAL_WEIGHTS,
  topPreferences,
  type TasteSignal,
} from "../../lib/recommendation/taste-profile";

const NOW = Date.parse("2026-08-14T00:00:00Z");
const HOUR = 3600_000;
const DAY = 24 * HOUR;

const candidate = (over: Partial<RankableCandidate> & { postId: string }): RankableCandidate => ({
  creatorId: "c-1",
  category: "fashion",
  createdAt: NOW - HOUR,
  brands: [],
  colors: [],
  priceBands: [],
  styles: [],
  objectCount: 0,
  linkedProductCount: 0,
  views: 0,
  likes: 0,
  taps: 0,
  shares: 0,
  comments: 0,
  purchasableRatio: 1,
  maxCommissionRate: 0,
  ...over,
});

const ctx = (over: Partial<RankingContext> = {}): RankingContext => ({
  profile: EMPTY_PROFILE,
  following: new Set(),
  hidden: new Set(),
  seen: new Set(),
  now: NOW,
  ...over,
});

// ── Following 피드 ───────────────────────────────────────────────────────────

test("Following 피드: 팔로우한 크리에이터만, 시간 역순", () => {
  const out = rankFollowingFeed(
    [
      candidate({ postId: "p-old", creatorId: "c-a", createdAt: NOW - 5 * DAY }),
      candidate({ postId: "p-new", creatorId: "c-a", createdAt: NOW - HOUR }),
      candidate({ postId: "p-other", creatorId: "c-z", createdAt: NOW }),
    ],
    { following: new Set(["c-a"]), hidden: new Set() }
  );
  assert.deepEqual(out.map((c) => c.postId), ["p-new", "p-old"]);
});

test("Following 피드: 숨긴 게시물은 제외된다", () => {
  const out = rankFollowingFeed(
    [
      candidate({ postId: "p-1", creatorId: "c-a" }),
      candidate({ postId: "p-2", creatorId: "c-a" }),
    ],
    { following: new Set(["c-a"]), hidden: new Set(["p-1"]) }
  );
  assert.deepEqual(out.map((c) => c.postId), ["p-2"]);
});

test("Following 피드: 팔로우가 없으면 비어 있다", () => {
  const out = rankFollowingFeed([candidate({ postId: "p-1" })], {
    following: new Set(),
    hidden: new Set(),
  });
  assert.equal(out.length, 0);
});

// ── 개인화 랭킹 ──────────────────────────────────────────────────────────────

test("개인화: 취향에 맞는 게시물이 그렇지 않은 것보다 위로 온다", () => {
  const profile = buildTasteProfile(
    [
      { type: "purchase", brand: "Barbour", category: "fashion", color: "#4b4f3d", at: NOW - HOUR },
      { type: "product_save", brand: "Barbour", category: "fashion", at: NOW - HOUR },
      { type: "outbound", brand: "Barbour", category: "fashion", at: NOW - HOUR },
    ],
    NOW
  );
  assert.ok(!profile.isCold);

  const ranked = rankFeed(
    [
      candidate({ postId: "p-match", creatorId: "c-a", brands: ["Barbour"], colors: ["#4b4f3d"] }),
      candidate({ postId: "p-miss", creatorId: "c-b", brands: ["Uniqlo"], colors: ["#f0f0ee"] }),
    ],
    ctx({ profile })
  );
  assert.equal(ranked[0].candidate.postId, "p-match");
  assert.ok(ranked[0].breakdown.taste > ranked[1].breakdown.taste);
});

test("개인화: 팔로우한 크리에이터의 게시물이 가산점을 받는다", () => {
  const ranked = rankFeed(
    [
      candidate({ postId: "p-followed", creatorId: "c-follow" }),
      candidate({ postId: "p-stranger", creatorId: "c-other" }),
    ],
    ctx({ following: new Set(["c-follow"]) })
  );
  assert.equal(ranked[0].candidate.postId, "p-followed");
  assert.ok(ranked[0].reasons.includes("팔로우 중인 크리에이터"));
});

test("랭킹은 결정적이다 — 같은 입력이면 같은 순서", () => {
  const cands = [
    candidate({ postId: "p-a", creatorId: "c-1" }),
    candidate({ postId: "p-b", creatorId: "c-2" }),
    candidate({ postId: "p-c", creatorId: "c-3" }),
  ];
  const first = rankFeed(cands, ctx()).map((r) => r.candidate.postId);
  const second = rankFeed([...cands].reverse(), ctx()).map((r) => r.candidate.postId);
  assert.deepEqual(first, second);
});

// ── hide 페널티 ──────────────────────────────────────────────────────────────

test("hide 페널티: 숨긴 게시물은 결과에서 완전히 제외된다", () => {
  const ranked = rankFeed(
    [candidate({ postId: "p-hidden" }), candidate({ postId: "p-visible", creatorId: "c-2" })],
    ctx({ hidden: new Set(["p-hidden"]) })
  );
  assert.deepEqual(ranked.map((r) => r.candidate.postId), ["p-visible"]);
});

test("hide 신호는 취향 프로필에서 해당 축을 음수로 만든다", () => {
  const profile = buildTasteProfile(
    [
      { type: "hide", brand: "Prada", category: "fashion", at: NOW },
      { type: "product_save", brand: "Uniqlo", category: "fashion", at: NOW },
    ],
    NOW
  );
  assert.ok(profile.brands["Prada"] < 0, "숨긴 브랜드는 음수 선호도");
  assert.ok(profile.brands["Uniqlo"] > 0);

  // 회피 학습이 랭킹에 반영된다
  const ranked = rankFeed(
    [
      candidate({ postId: "p-prada", creatorId: "c-a", brands: ["Prada"] }),
      candidate({ postId: "p-uniqlo", creatorId: "c-b", brands: ["Uniqlo"] }),
    ],
    ctx({ profile })
  );
  assert.equal(ranked[0].candidate.postId, "p-uniqlo");
});

// ── 신규 사용자 폴백 ─────────────────────────────────────────────────────────

test("신규 사용자: 신호가 없으면 콜드 프로필이고 개인화 축이 중립이다", () => {
  const profile = buildTasteProfile([], NOW);
  assert.ok(profile.isCold);
  assert.equal(profile.signalCount, 0);

  const scored = scoreCandidate(candidate({ postId: "p-1" }), ctx({ profile }));
  assert.equal(scored.breakdown.taste, 0.5, "취향 축은 중립");
  assert.equal(scored.breakdown.creator, 0.5, "크리에이터 축도 중립(미팔로우)");
});

test("신규 사용자 폴백: 품질·신선도가 순위를 정한다", () => {
  const ranked = rankFeed(
    [
      candidate({ postId: "p-stale", creatorId: "c-a", createdAt: NOW - 30 * DAY, views: 100, likes: 1 }),
      candidate({ postId: "p-fresh-good", creatorId: "c-b", createdAt: NOW - HOUR, views: 100, likes: 30 }),
    ],
    ctx({ profile: buildTasteProfile([], NOW) })
  );
  assert.equal(ranked[0].candidate.postId, "p-fresh-good");
});

test("약한 신호만 있으면 여전히 콜드 (신뢰 임계값)", () => {
  const profile = buildTasteProfile(
    [
      { type: "view", category: "fashion", at: NOW },
      { type: "view", category: "fashion", at: NOW },
    ],
    NOW
  );
  assert.ok(profile.isCold, "조회 2회로는 개인화를 신뢰하지 않는다");
});

// ── 구매 신호 가중 ───────────────────────────────────────────────────────────

test("구매 신호는 조회보다 100배, 저장보다 3배 이상 무겁다", () => {
  assert.equal(SIGNAL_WEIGHTS.purchase, 10);
  assert.equal(SIGNAL_WEIGHTS.view, 0.1);
  assert.equal(SIGNAL_WEIGHTS.purchase / SIGNAL_WEIGHTS.view, 100);
  assert.ok(SIGNAL_WEIGHTS.purchase > SIGNAL_WEIGHTS.product_save * 3);
  assert.ok(SIGNAL_WEIGHTS.outbound > SIGNAL_WEIGHTS.object_tap);
  assert.ok(SIGNAL_WEIGHTS.hide < 0);
});

test("구매 1회가 조회 수십 회를 이긴다", () => {
  const purchase = buildTasteProfile([{ type: "purchase", brand: "A", at: NOW }], NOW);
  const manyViews = buildTasteProfile(
    Array.from({ length: 50 }, () => ({ type: "view" as const, brand: "B", at: NOW })),
    NOW
  );
  // 정규화 후에도 구매 프로필의 총 가중치가 신뢰 임계를 넘는다
  assert.ok(purchase.totalWeight >= 10);
  assert.ok(!purchase.isCold);
  assert.ok(manyViews.totalWeight < purchase.totalWeight * 1.5);
});

test("구매한 브랜드가 단순 조회한 브랜드보다 높은 선호도를 갖는다", () => {
  const profile = buildTasteProfile(
    [
      { type: "purchase", brand: "Bought", at: NOW },
      ...Array.from({ length: 20 }, () => ({ type: "view" as const, brand: "Viewed", at: NOW })),
    ],
    NOW
  );
  assert.ok(profile.brands["Bought"] > profile.brands["Viewed"]);
  assert.equal(topPreferences(profile, "brands", 1)[0].key, "Bought");
});

test("오래된 신호는 시간 감쇠로 약해진다", () => {
  const recent = buildTasteProfile([{ type: "purchase", brand: "A", at: NOW - HOUR }], NOW);
  const old = buildTasteProfile([{ type: "purchase", brand: "A", at: NOW - 90 * DAY }], NOW);
  assert.ok(recent.totalWeight > old.totalWeight * 3);
});

// ── 수수료가 지배하지 못한다 ─────────────────────────────────────────────────

test("수수료 가중치는 다른 모든 축보다 작다 (설정 불변식)", () => {
  for (const [axis, weight] of Object.entries(RANK_WEIGHTS)) {
    if (axis === "commission") continue;
    assert.ok(RANK_WEIGHTS.commission < weight, `commission < ${axis}`);
  }
});

test("고수수료 게시물이 신선하고 반응 좋은 게시물을 이기지 못한다", () => {
  const ranked = rankFeed(
    [
      candidate({
        postId: "p-greedy",
        creatorId: "c-a",
        maxCommissionRate: 0.9,
        createdAt: NOW - 20 * DAY,
        views: 100,
        likes: 1,
      }),
      candidate({
        postId: "p-good",
        creatorId: "c-b",
        maxCommissionRate: 0,
        createdAt: NOW - HOUR,
        views: 100,
        likes: 25,
      }),
    ],
    ctx()
  );
  assert.equal(ranked[0].candidate.postId, "p-good");
});

test("수수료율은 상한에서 절단된다", () => {
  const atCap = scoreCandidate(candidate({ postId: "a", maxCommissionRate: COMMISSION_RATE_CAP }), ctx());
  const wayOver = scoreCandidate(candidate({ postId: "a", maxCommissionRate: 0.95 }), ctx());
  assert.equal(atCap.breakdown.commission, wayOver.breakdown.commission);
  assert.equal(atCap.score, wayOver.score);
});

// ── 커머스 무결성 / 소셜 균형 ────────────────────────────────────────────────

test("구매 불가 링크가 많으면 감점된다", () => {
  const healthy = scoreCandidate(
    candidate({ postId: "a", linkedProductCount: 4, purchasableRatio: 1 }),
    ctx()
  );
  const broken = scoreCandidate(
    candidate({ postId: "a", linkedProductCount: 4, purchasableRatio: 0 }),
    ctx()
  );
  assert.equal(healthy.breakdown.integrityPenalty, 0);
  assert.ok(broken.breakdown.integrityPenalty > 0);
  assert.ok(broken.score < healthy.score);
  assert.ok(broken.reasons.includes("일부 상품 구매 불가"));
});

test("상품이 없는 순수 콘텐츠도 감점 없이 경쟁한다", () => {
  const pure = scoreCandidate(candidate({ postId: "a", linkedProductCount: 0 }), ctx());
  assert.equal(pure.breakdown.integrityPenalty, 0);
  // 품질 점수는 커머스 밀도를 보지 않는다
  const shoppable = scoreCandidate(
    candidate({ postId: "a", linkedProductCount: 8, views: 0 }),
    ctx()
  );
  assert.equal(pure.breakdown.quality, shoppable.breakdown.quality);
});

test("다양성: 같은 크리에이터가 연속으로 나오지 않는다", () => {
  const ranked = rankFeed(
    [
      candidate({ postId: "p-1", creatorId: "c-a", views: 100, likes: 30 }),
      candidate({ postId: "p-2", creatorId: "c-a", views: 100, likes: 29 }),
      candidate({ postId: "p-3", creatorId: "c-b", views: 100, likes: 10 }),
    ],
    ctx()
  );
  const creators = ranked.map((r) => r.candidate.creatorId);
  for (let i = 1; i < creators.length; i++) {
    assert.notEqual(creators[i], creators[i - 1], "연속 동일 크리에이터 금지");
  }
});

test("다양성: 상품 밀집 게시물이 4개 연속으로 나오지 않는다", () => {
  const dense = Array.from({ length: 6 }, (_, i) =>
    candidate({ postId: `d-${i}`, creatorId: `c-${i}`, linkedProductCount: 5, views: 100, likes: 20 })
  );
  const light = Array.from({ length: 2 }, (_, i) =>
    candidate({ postId: `l-${i}`, creatorId: `cl-${i}`, linkedProductCount: 0, views: 100, likes: 5 })
  );
  const ranked = diversify(rankFeed([...dense, ...light], ctx()));
  let run = 0;
  let maxRun = 0;
  for (const r of ranked) {
    run = r.candidate.linkedProductCount >= 3 ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  assert.ok(maxRun <= 4, `상품 밀집 연속 ${maxRun}개 — 피드가 카탈로그처럼 보이면 안 된다`);
});

// ── 취향 축 유틸 ─────────────────────────────────────────────────────────────

test("가격대 분류", () => {
  assert.equal(priceBandOf(19900), "budget");
  assert.equal(priceBandOf(139000), "mid");
  assert.equal(priceBandOf(450000), "premium");
  assert.equal(priceBandOf(2300000), "luxury");
  assert.equal(priceBandOf(null), undefined);
});

test("색상 버킷 분류", () => {
  assert.equal(colorBucketOf("#0b0c0f"), "neutral-black");
  assert.equal(colorBucketOf("#f4f3ee"), "neutral-white");
  assert.equal(colorBucketOf("#a9c3e2"), "blue");
  assert.equal(colorBucketOf("#4b4f3d"), "green");
  assert.equal(colorBucketOf("bogus"), undefined);
});

test("빈 프로필은 모든 축이 중립이다", () => {
  assert.equal(EMPTY_PROFILE.isCold, true);
  assert.deepEqual(EMPTY_PROFILE.brands, {});
});
