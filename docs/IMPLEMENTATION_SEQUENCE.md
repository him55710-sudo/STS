# STS Implementation Sequence

> Companion to [`docs/PRODUCTION_GAP_AUDIT.md`](./PRODUCTION_GAP_AUDIT.md). Priorities below are fixed:
>
> 1. **P0 persistence**
> 2. **P0 canonical product + merchant offers**
> 3. **P0 click attribution**
> 4. **P0 conversion + ledger**
> 5. **P0 creator earnings**
> 6. **P1 TikTok import**
> 7. **P1 real social backend**
> 8. **P1 feed integrity/recommendation**
> 9. **P2 admin/merchant tools**
>
> **Immutable principle** governing every phase: *commerce must be invisible until intent appears.* No phase adds commerce UI ahead of an object tap; all new machinery (auth, attribution, ledger) sits behind the existing tap → sheet → outbound interaction.

## Ground rules for every phase

**Preserve untouched** (stable, benchmarked — regressions here are release blockers):
- `lib/mask/client-engine.ts`, `lib/mask/geometry.ts` (segmentation)
- `components/ObjectLayer.tsx` (silhouette render + hit test)
- `app/api/detect/route.ts`, `lib/llm/*`, `lib/vision.ts`, `lib/vision-config.ts` (detection chain)
- `lib/retrieval/*` pipeline shape (extend only via its provider interface: `searchCatalog(query, limit) → ProductCandidate[]`)
- Creator exact/similar confirmation UX in `app/create/page.tsx` (swap persistence calls, never the flow)

**Regression gates run at the end of every phase**:
- `npx tsc --noEmit` and `next build` clean
- `tests/vision/retrieval-benchmark.ts`: Recall@1 ≥ 96%, Recall@3 = 100% on the 54-link ground truth
- Manual core loop: feed → object tap → silhouette highlight → sheet → outbound; create → detect → mask → confirm → publish

**Next.js 16 conventions** (bundled docs: `node_modules/next/dist/docs/`):
- Auth/role guards go in root **`proxy.ts`** — the `middleware` file convention is deprecated/renamed.
- `params` in pages and route handlers are **Promises** (`const { id } = await params`; client pages use `use(params)` as `app/post/[id]/page.tsx` already does).
- Route Handlers use Web `Request`/`Response` (`app/**/route.ts`), as the existing API routes do.

**Recommended backing services** (decision, not yet implementation): Supabase (Postgres + Auth + Storage + RLS) — already anticipated by `docs/PLAN.md` §3 ("Supabase·pgvector은 Phase 2+"), fits Vercel serverless, gives OAuth (Google/Kakao via OIDC), signed-URL uploads, and pgvector in one dependency. Any equivalent Postgres+storage+auth stack works; the sequence only assumes Postgres semantics.

---

## Phase 1 — P0 Persistence (auth + database + media + server posts)

Closes: Gaps 1, 2, 3 (and the persistence half of 4's `userPosts`).

**Objective**: A creator signs in for real, publishes a post whose image lives in object storage and whose tags live in Postgres, and any logged-out visitor on any device sees it. localStorage retains only ephemeral UI state.

**Build order inside the phase**
1. **Schema + client**: migrations for `profiles`, `media_assets`, `posts`, `object_tags`, `events`; `lib/db/` server-side query module. Seed migration converts `LOOK_POSTS`/`CREATORS` content (flagged `is_seed`).
2. **Auth**: Google + Kakao OAuth; session cookie; `proxy.ts` guard for `/create`, `/analytics`, `/admin`, `/profile`, `/saved`; 401 + per-user rate limit on `/api/detect`, `/api/product-search`.
3. **Media**: `POST /api/media/upload` → signed URL; `app/create/page.tsx` uploads the downscaled canvas blob at publish; dataURL remains the in-flight preview + vision input (pipeline unchanged).
4. **Posts**: `POST /api/posts` (media_id + tags + caption + exactness), `GET /api/feed` (chronological for now), `GET /api/posts/[id]`; feed/post/creator/discover/saved pages read server data.
5. **Events**: `POST /api/events` batched beacon (`asset_view`, `object_tap`, `card_open`, `outbound_click`, saves); `lib/store.ts.track()` becomes the client buffer that flushes to it.

**Files created**: `proxy.ts`, `lib/db/*`, `supabase/migrations/*`, `app/api/auth/*` (or Supabase callback route), `app/api/media/upload/route.ts`, `app/api/posts/route.ts`, `app/api/posts/[id]/route.ts`, `app/api/feed/route.ts`, `app/api/events/route.ts`.
**Files modified**: `app/login/page.tsx`, `lib/store.ts`, `lib/types.ts` (`SessionUser` → server session type; `Post` gains `mediaId`), `app/create/page.tsx` (publish + upload only), `app/page.tsx`, `app/post/[id]/page.tsx`, `app/creator/[id]/page.tsx`, `app/discover/page.tsx`, `app/saved/page.tsx`, `app/profile/page.tsx`, `app/analytics/page.tsx`, `app/admin/page.tsx` (read server events), `lib/analytics.ts` (drop stale `SEED_STATS` — bug B2), `.env.example`, `next.config.ts` (image loader for storage domain).

**Exit criteria**: cross-browser post visibility; zero image bytes in localStorage; anonymous detect calls rejected; events queryable server-side; regression gates pass.

---

## Phase 2 — P0 Canonical product + merchant offers

Closes: Gaps 5, 6 (+ the schema half of 14's disclosure-from-data).

**Objective**: One canonical node per real-world product; N merchant offers per product carrying URL/price/network/commission; retrieval and the product sheet read from the graph.

**Build order**
1. Migrations: `brands`, `products` (with `canonical_key`), `product_images`, `product_similarity`, `merchants`, `merchant_offers`, `offer_price_history`, `link_checks`. Seed migration ports the 39 products + hand-written `similarIds`/`KEYWORDS`/`PRODUCT_TONES` into rows (keywords → `products.attributes.search_terms`, tones → `products.attributes.tone`).
2. `lib/products/canonicalize.ts`: URL fingerprint + normalized brand/model dedup; `POST /api/products/resolve` used by the create-flow URL tab and web-candidate confirmation.
3. Retrieval provider swap: `lib/retrieval/catalog-provider.ts` queries `GET /api/products/search` (server route hitting Postgres full-text now, pgvector later) — same `ProductCandidate` contract; delete no logic from rerank/tier code.
4. Offer selection: `GET /api/posts/[id]` embeds the chosen offer per tagged product; `components/ProductSheet.tsx` renders brand/price/retailer/CTA/badge from the offer. Affiliate badge becomes derived: `offer.affiliate_network_id != null`.
5. Link-health cron: revalidate offer URLs; stale/dead offers drop out of the Buy CTA.

**Files created**: `lib/products/*`, `lib/offers/*`, `app/api/products/search/route.ts`, `app/api/products/resolve/route.ts`, `app/api/products/[id]/offers/route.ts`, link-check job.
**Files modified**: `lib/retrieval/catalog-provider.ts`, `lib/match.ts` (thin wrappers over server search), `components/ProductSheet.tsx`, `app/create/page.tsx` (URL tab → resolve endpoint), `lib/catalog.ts` (retire from read path after seed migration), delete-from-read-path: `lib/product-colors.ts` keyword/tone maps.

**Exit criteria**: same URL pasted twice = one product; sheet renders from offer rows; retrieval benchmark still ≥ 96/100; no compiled-in product arrays on any read path.

---

## Phase 3 — P0 Click attribution

Closes: Gaps 7, 8.

**Objective**: Every outbound purchase-intent click passes through our server, is recorded with full context (post/object/product/offer/creator), and lands on the merchant with a network deeplink carrying our click id as subid. UX unchanged (invisible-until-intent).

**Build order**
1. Affiliate network onboarding (external, start immediately — weeks of lead time): apply to ADPICK / LinkPrice / Coupang Partners; bind approved programs to `merchant_offers` via `affiliate_networks`.
2. `lib/affiliate/` adapters (`buildDeeplink(offer, clickId)`, later `parsePostback`) — mirror the `lib/llm/*` provider-adapter house pattern.
3. `clicks` migration; `GET /api/r` route handler: validate refs → insert click → 302 to deeplink (or raw offer URL when no network) — with bot/prefetch filtering and rate limit.
4. `components/ProductSheet.tsx`: Buy CTA and similar-product row navigate via the router URL; keep `window.open(..., "noopener,noreferrer")`; keep firing the local `outbound_click` event for optimistic UI.

**Files created**: `lib/affiliate/*`, `app/api/r/route.ts` (or `app/r/[clickId]/route.ts`), migration for `clicks` + `affiliate_networks`.
**Files modified**: `components/ProductSheet.tsx`, `.env.example` (network credentials), offer admin fields.

**Exit criteria**: p95 redirect overhead ≤ 150ms; click row per outbound with correct creator attribution; network dashboard shows our subid on a test click; zero visual change to the tap flow.

---

## Phase 4 — P0 Conversion + ledger

Closes: Gaps 9, 10.

**Objective**: Network postbacks become `conversions` linked to clicks; every confirmed conversion posts balanced double-entry ledger transactions (creator 70 / platform 30); cancellations reverse cleanly.

**Build order**
1. Migrations: `conversions` (+ unique network/order, status history), `ledger_accounts`, `ledger_entries` (append-only, balanced-txn invariant), `payouts` (schema only this phase).
2. `app/api/webhooks/affiliate/[network]/route.ts`: signature verification per adapter, idempotent upsert, click matching by subid; CSV import endpoint for postback-less networks.
3. `lib/ledger/`: posting rules (`conversion confirmed → +creator 70%, +platform 30%, −network receivable`), reversal rules, replay/consistency check; **the 0.70 split becomes one exported constant** — fix bug B1 by deleting the `0.75` path in `lib/analytics.ts`.
4. Analytics funnel's "구매" stage switches from the 2.5% assumption to real conversion counts (estimate retained, labeled, only for creators with no connected network activity).

**Files created**: `app/api/webhooks/affiliate/[network]/route.ts`, `lib/conversions/*`, `lib/ledger/*`, migrations.
**Files modified**: `lib/affiliate/*` (postback parsing), `app/analytics/page.tsx`, `lib/analytics.ts` (remove `estimatedEarnings` 0.75 formula).

**Exit criteria**: replayed postback = zero duplicate rows; ledger sums to zero per txn; cancel produces reversing entries; balance replay test passes.

---

## Phase 5 — P0 Creator earnings

Closes: Gap 11.

**Objective**: Creators see real pending/confirmed/paid earnings from the ledger, broken down per post and per product, and can register a payout account. This flips the BM from story to system.

**Build order**
1. `GET /api/creator/earnings` (+ breakdown by post/product via conversion → click → object join).
2. Analytics "수익" tab + profile earnings card read the API; publish-screen `EarningsSummary` per-sale preview uses network-synced commission × 0.70.
3. Payout onboarding: `payout_accounts` (encrypted), minimal KYC fields, `creator_tax_profiles`; payout execution stays admin-side (Phase 9) — this phase only collects and displays.
4. Copy pass: every remaining projected number is visibly labeled 예상/estimate.

**Files created**: `app/api/creator/earnings/route.ts`, payout-account UI + route, migrations (`payout_accounts`, `creator_tax_profiles`).
**Files modified**: `app/analytics/page.tsx`, `app/profile/page.tsx`, `app/create/page.tsx` (`EarningsSummary`).

**Exit criteria**: displayed earnings ≡ ledger balances; every won drills down to a conversion→click→object chain; payout request blocked without verified account.

---

## Phase 6 — P1 TikTok import

Closes: Gap 12.

**Objective**: A creator connects TikTok (official user-authorized API only — no scraping), imports their own video, and the existing detect → segment → confirm flow turns a keyframe into a shoppable STS post.

**Build order**
1. TikTok developer app + OAuth scopes (external lead time — apply at phase start).
2. `imports` migration; `app/api/import/tiktok/*` (authorize, list videos, start import); worker with ffmpeg for keyframe extraction (Supabase Edge Function / external worker — not a Vercel request handler).
3. Keyframes feed `startAnalysis()`'s existing dataURL path in `app/create/page.tsx`; review/confirm UX unchanged; post stores `import_id` provenance.

**Files created**: `lib/imports/tiktok.ts`, `app/api/import/tiktok/*`, worker, migration.
**Files modified**: `app/create/page.tsx` (new entry point only).

**Exit criteria**: own-video import → draft with detected objects → confirm → publish, with provenance; failures retryable.

---

## Phase 7 — P1 Real social backend

Closes: Gap 4 (rest).

**Objective**: Likes, saves, follows are multi-user server state with honest counts; Following feed is server-computed. (Comments/notifications optional second slice.)

**Build order**: migrations (`likes`, `saves`, `follows` + counters); `app/api/social/*` mutations with optimistic UI in `lib/store.ts`; `PostCard`/creator page/saved page wiring; retire seed follower/like constants (and dead seed follows — bug B3).

**Files modified**: `lib/store.ts`, `components/PostCard.tsx`, `app/creator/[id]/page.tsx`, `app/saved/page.tsx`, `app/page.tsx` (Following via API).

**Exit criteria**: cross-account visibility of social actions; counts equal table counts; two-device consistency.

---

## Phase 8 — P1 Feed integrity / recommendation

Closes: Gaps 13, 14 (enforcement half).

**Objective**: Paginated server feed with an upgradeable ranking function fed by real engagement stats; integrity enforcement so counts, disclosures, and links stay honest.

**Build order**
1. `post_stats` rollup from `events`; `GET /api/feed` cursor pagination + ranker (`recency + follow boost + OTR + shoppability`), feature-logged.
2. Impression logging → real OTR per position (KPI: OTR ≥ 4% now measurable).
3. Integrity: server-side event validation (whitelist, rate caps, bot filters), `reports` + takedown flow, exactness confirmation audit fields (`confirmed_by`, `ai_suggestion` — doubles as the training-data loop from `docs/VISION.md` §7), link-check enforcement in ranking (posts whose only offers are dead rank down / lose CTA).

**Files created**: `lib/feed/ranker.ts`, `lib/integrity/*`, `app/api/reports/route.ts`, migrations (`post_stats`, `reports`, `audit_log`, tag audit fields).
**Files modified**: `app/page.tsx`, `app/discover/page.tsx`, `app/api/events/route.ts`, `app/api/feed/route.ts`.

**Exit criteria**: paginated feed p95 < 300ms; OTR measurable per post/position; creator-facing counts derive only from server events/clicks; no affiliate outbound path without disclosure.

---

## Phase 9 — P2 Admin / merchant tools

Closes: Gap 15.

**Objective**: Role-gated back office for content ops, commerce reconciliation, payout execution, and integrity queue; first merchant-facing surface.

**Build order**: `proxy.ts` matcher + server role checks for `/admin/:path*`; rebuild `app/admin` on server data (content, conversions-vs-ledger reconciliation, offer/link health, reports queue); payout run execution (creates `payouts` + ledger entries); minimal merchant portal (offer upload/CSV, performance view) last.

**Files modified/created**: `app/admin/*` (rebuilt), `app/api/admin/*`, merchant portal routes.

**Exit criteria**: non-admins server-side blocked; takedown + audit log works; reconciliation view matches network statements; payout run executable end-to-end.

---

## Dependency graph

```
Phase 1 (persistence: auth+DB+media+posts+events)
   ├─→ Phase 2 (canonical product + offers)
   │       └─→ Phase 3 (click attribution)  ←─ affiliate network onboarding (external, start at Phase 1)
   │               └─→ Phase 4 (conversion + ledger)
   │                       └─→ Phase 5 (creator earnings)
   ├─→ Phase 6 (TikTok import)          [needs auth+media only]
   ├─→ Phase 7 (social backend)         [needs auth+DB only]
   └─→ Phase 8 (feed integrity/reco)    [needs events+social signals; enforcement parts need 2–3]
                   └─→ Phase 9 (admin/merchant) [needs everything it administers]
```

Phases 6 and 7 can run in parallel with 3–5 if staffing allows; Phase 8 after 7; Phase 9 last. External clocks to start on day one of Phase 1: **affiliate network applications** (blocks 3), **Kakao OAuth business verification** (blocks 1 sign-off), **TikTok developer app review** (blocks 6).
