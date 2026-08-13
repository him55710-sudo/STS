# STS Commerce Product Graph — Phase 2

> **Date**: 2026-08-13 · **Branch**: `claude/sts-production-gap-audit-8uhzw5`
> Closes audit Gaps 5 (canonical product graph) + 6 (merchant offers) from [`PRODUCTION_GAP_AUDIT.md`](./PRODUCTION_GAP_AUDIT.md).
> **Deferred by instruction**: conversion webhooks, TikTok import, real affiliate network integration.

## The separation

The old `Product` model fused two different questions into one row. Phase 2 splits them:

| Question | Owner | Answered by |
|---|---|---|
| **"이게 무슨 상품인가?"** | `canonical_products` | Retrieval pipeline (`lib/retrieval`, `lib/match`) — **unchanged** |
| **"어디서 살 수 있는가?"** | `merchant_offers` (1:N per product) | **OfferResolver** (`lib/commerce/offer-resolver.ts`) — new |

Example, live in the seed: *Polo Oxford Shirt* (`pl-polo-oxford`) → 폴로 공식몰 ₩259,000 · SSG닷컴 ₩259,000 · G마켓 ₩231,000 · 쿠팡 ₩228,900 (로켓배송, 품절 임박).

## Schema (migrations `0004_commerce_graph` + `0005_commerce_seed`, applied to project `rtyarqmospdmiemknucq`)

```
canonical_products              merchants
  id text PK ─────────┐           id text PK ──────┬──────────────┐
  brand               │           name, domain     │              │
  model_name          │           logo_url         │              │
  sku, gtin (null)    │           trust_score 0~1  │              │
  category, color     │           status            │              │
  attributes jsonb    │                             │              │
  primary_image       │         affiliate_programs  │              │
  created_at          │           id text PK        │              │
                      │           merchant_id FK ───┘              │
                      │           provider ("direct"|"linkprice"|…)│
                      │           commission_type, default_rate    │
                      │           cookie_window_hours, status      │
                      │                                            │
                      │         merchant_offers                    │
                      └──────────── canonical_product_id FK        │
                                    merchant_id FK ────────────────┘
                                    external_product_id (null — 실연동 전)
                                    title, price, currency
                                    stock_status (in|low|out_of_stock)
                                    shipping_label, product_url
                                    affiliate_url (null — 가짜 딥링크 금지)
                                    commission_rate, last_synced_at
                                    UNIQUE (canonical_product_id, merchant_id)
```

Key decisions:
- **`id` is text**, not uuid: seed canonical ids inherit the legacy product ids (`pl-polo-oxford`), so `object_product_links.product_id`, saved products, `KEYWORDS`, and `PRODUCT_TONES` all remain valid with zero data migration. New rows default to `gen_random_uuid()::text`.
- **RLS read-only**: all four tables are publicly readable; there are **no client write policies**. The graph is seed/operator data until merchant tooling (P2 phase) adds role-gated writes.
- **No invented integrations**: `affiliate_url` and `external_product_id` are null everywhere; `provider` strings (`direct`, `linkprice`, `coupang-partners`) are placeholders for the click-attribution phase; `last_synced_at` is null because no sync pipeline exists yet. Marketplace offer URLs are the merchant's own search deeplinks — same honest pattern the seed already used (no fabricated product-page URLs).

## OfferResolver ranking policy

`resolveOffers()` scores each available offer on six normalized axes and returns `{ best, alternatives, unavailable }`:

| Axis | Weight | Signal |
|---|---|---|
| price | 0.30 | min available price / offer price |
| trust | 0.26 | `merchants.trust_score` |
| value | 0.14 | savings vs median price (user value) |
| availability | 0.12 | in_stock 1.0 / low_stock 0.6 |
| shipping | 0.10 | 무료/로켓/당일 label |
| **commission** | **0.08** | rate **capped at 10%** before normalizing |

Hard rules, all covered by tests (`npm test`, 14 passing):
- `out_of_stock` offers can never be `best` and never appear in alternatives — they're returned separately and rendered strikethrough/품절 only.
- Non-`active` merchants are excluded entirely.
- **Commission can never dominate**: its input is truncated at `COMMISSION_RATE_CAP` (0.10) and its weight is strictly below price and trust — enforced by a load-time assertion in the module, a config test, and a behavioral test (cheaper trusted offer beats an expensive low-trust offer carrying 50% commission). The maximum score swing commission can produce is 0.08, which a single-axis lead in price, trust, or shipping erases.
- Deterministic tie-breaking (price → trust → id).

## ProductSheet data flow (top to bottom)

1. **착용 상품** — the exact canonical product (brand, model name, color chip, exact/similar badge from the creator's confirmation).
2. **Primary CTA** — `"{best merchant}에서 구매하기"` from the resolver's best offer (price, shipping label, bounded affiliate badge shown).
3. **다른 판매처** — remaining available offers of the *same* product (+ sold-out offers flagged 품절).
4. **비슷한 스타일** — similar products, in their own section.

The assembly is a pure function (`lib/commerce/sheet-model.ts`) so the **exact/similar separation is a tested invariant**, not a styling convention: offer sections may only contain the worn product's offers; `similarStyles` may never contain the worn product; the sets never intersect. Products outside the graph (creator URL-linked customs, cross-device snapshots) fall back to the legacy single-URL sheet unchanged.

The fake three-swatch color row from the old sheet was removed — the sheet now shows the canonical product's actual `color` value or nothing.

## Migration strategy (how the old model maps to the new one)

1. **One source of truth**: the 39 legacy `Product` literals moved from `lib/catalog.ts` into `lib/commerce/seed.ts` as the base data. Canonical products, one official-store offer each, and hand-authored multi-merchant offers for five flagship products are derived from it. Merchants (27 official + 5 marketplaces) and affiliate programs are generated alongside.
2. **DB seed is generated, never hand-written**: `scripts/generate-commerce-seed.ts` emits `supabase/migrations/20260813000005_commerce_seed.sql` from the TS seed (idempotent `on conflict do nothing`). Code seed and DB seed cannot drift; to change seed data, edit `seed.ts` and regenerate.
3. **Legacy compat view keeps the whole UI working**: `lib/commerce/index.ts` flattens canonical + best offer into the old `Product` shape (`LEGACY_PRODUCT_VIEWS`), which `lib/catalog.ts` re-exports as `PRODUCTS`. Every consumer (match, retrieval provider, saved, creator shop, candidate panels) is untouched — but prices/retailers/links they display now come from the OfferResolver, so a DB-side offer change is one regeneration away from the UI.
4. **Retrieval untouched, contract verified**: retrieval benchmark after the swap — Recall@1 96%, Recall@3 100%, Recall@5 100%, MRR 0.981 (identical to baseline).
5. **Next step (later phase)**: point `lib/commerce/index.ts` reads at the DB tables instead of the static seed once offers become dynamic (price/stock sync), and route custom URL products through canonicalization (`POST /api/products/resolve` per the implementation sequence). The read API is already shaped for that swap.

## Validation summary

- `npm test`: 14/14 — multi-offer resolution, unavailable-offer exclusion (synthetic + real seed data), cheaper-trusted-beats-high-commission, commission cap/bound invariants, merchant status filtering, exact/similar separation, legacy fallback, compat-view/best-offer consistency, seed referential integrity.
- `tsc --noEmit` clean · `next build` clean (17 routes).
- DB: 39 canonical products / 32 merchants / 21 programs / 48 offers seeded and RLS-verified read-only.
- Browser (Playwright, demo mode): tapping the look1 oxford shirt renders the full new sheet — exact header with 동일 상품 badge, 폴로 공식몰 CTA, 다른 판매처 (SSG · 쿠팡 품절 임박 · G마켓), 비슷한 스타일 — with zero page errors. Object-tap priority (bag over shirt in overlapping regions) confirmed still intact.
