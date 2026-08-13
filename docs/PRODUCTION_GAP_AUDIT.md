# STS Production Gap Audit

> **Date**: 2026-08-13 · **Branch**: `claude/sts-production-gap-audit-8uhzw5`
> **Scope**: Every subsystem required to take STS from demo to production.
> **Method**: Full source read (`app/`, `components/`, `lib/`, `docs/`, `.env.example`, `package.json`). Code is the source of truth where docs disagree.
> **Stack context**: Next.js 16.3 (App Router), React 19, Zustand 5 (localStorage persist), Tailwind v4. **No database client, no storage client, no auth library exists in `package.json`.**

## Immutable principle

> **"Commerce must be invisible until intent appears."**

Every gap fix below must preserve this: no new commerce UI before an object tap. Attribution, click routing, and ledger work happen *behind* the existing tap → sheet → outbound interaction, never in front of it.

## Preserve list (do NOT rework in gap fixes)

These are genuinely implemented and benchmarked. Gap work must treat them as stable interfaces:

| Subsystem | Files | Status |
|---|---|---|
| Vision detection (LLM provider chain + on-device + mock fallback) | `app/api/detect/route.ts`, `lib/llm/*`, `lib/vision.ts`, `lib/vision-config.ts` | **Real** (needs API key in prod) |
| Polygon / multi-ring segmentation | `lib/mask/client-engine.ts`, `lib/mask/geometry.ts` | **Real** (86% recall, 96% silhouette rate, measured) |
| ObjectLayer (silhouette render, any-ring PIP hit test, interaction priority) | `components/ObjectLayer.tsx` | **Real** |
| Product retrieval / reranking (multi-stage, composite score, tier calibration) | `lib/retrieval/*`, `app/api/product-search/route.ts`, `lib/naver/*` | **Real pipeline** — but see Gap 5: its catalog provider reads a hardcoded array |
| Creator exact/similar confirmation flow | `app/create/page.tsx` (CandidatePanel, exactness toggle) | **Real UX** — but publishes to localStorage (Gap 2/3) |

## Verdict summary

| # | Subsystem | Verdict |
|---|---|---|
| 1 | Auth | **Demo-only** (fake session object in localStorage) |
| 2 | Database persistence | **Absent** (100% localStorage) |
| 3 | Media storage | **Demo-only** (base64 dataURL inside localStorage) |
| 4 | Social persistence | **Demo-only** (single-browser; no other user can see anything) |
| 5 | Canonical product graph | **Demo-only** (39 hardcoded products + hand-written keyword/similar maps) |
| 6 | Merchant offers | **Absent** (one search-deeplink URL per product, no offer model) |
| 7 | Affiliate integration | **Demo-only** (hardcoded `affiliate` flags; zero network integration) |
| 8 | Click router | **Absent** (`window.open` direct to retailer) |
| 9 | Conversion attribution | **Absent** (purchases = outbound × 2.5% assumption) |
| 10 | Commission ledger | **Absent** (display-only arithmetic) |
| 11 | Creator earnings | **Demo-only** (estimate formula; internally inconsistent — see bug B1) |
| 12 | TikTok import | **Absent** (zero code) |
| 13 | Feed recommendation | **Demo-only** (static array, client-side following filter) |
| 14 | Commerce integrity | **Partial UI, no enforcement** (disclosure badges render, but all data is client-declared) |
| 15 | Admin operations | **Demo-only** (admin page reads the admin's own localStorage) |

---

## Gap 1 — Auth

**Current state**
`app/login/page.tsx:16-19` calls `signIn({ provider, name })` which writes a `SessionUser { name, provider }` object into the Zustand store (localStorage). No OAuth round-trip, no server session, no cookie, no user ID. The login page's own footnote admits it: "데모 로그인이에요." `lib/types.ts:84-88` shows `SessionUser` has no `id`. Every API route (`/api/detect`, `/api/product-search`, `/api/vision-health`) is unauthenticated and rate-unlimited.

**Missing capability**
Real Google/Kakao OAuth, server-side session (httpOnly cookie), a stable `user_id` to own posts/saves/earnings, route protection, and per-user rate limiting on the LLM-backed API routes (each `/api/detect` call spends paid tokens — currently anyone can drain the quota anonymously).

**Files affected**
`app/login/page.tsx`, `lib/store.ts` (drop `SessionUser`, keep only UI state), `lib/types.ts`, new `proxy.ts` at repo root (Next.js 16: the `middleware` convention is deprecated and renamed to `proxy` — see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`), new `app/api/auth/*` (or Supabase Auth client + callback route), `app/profile/page.tsx`, `components/Sidebar.tsx`, `components/TabBar.tsx`.

**DB changes**
`profiles` (id = auth user id, handle unique, display_name, avatar_media_id, role enum `user|creator|admin`, created_at). Provider identities handled by the auth layer (Supabase `auth.users` or NextAuth `accounts`).

**API changes**
OAuth callback routes; session read in Server Components; `proxy.ts` guard for `/create`, `/analytics`, `/admin`, `/saved`, `/profile`; all mutating API routes reject anonymous callers; per-user rate limit on `/api/detect` and `/api/product-search`.

**Risk**
🔴 Highest-leverage blocker: nothing user-owned can be persisted without identity. Open LLM endpoints are an active cost/abuse hole *today*. Kakao OAuth requires business verification for real-name/email scopes — lead time.

**Acceptance criteria**
- Google and Kakao OAuth complete a real round-trip in production; session survives browser restart via httpOnly cookie, not localStorage.
- `useApp` no longer stores any user object; identity comes from the server session.
- Anonymous `POST /api/detect` is rejected (401) or throttled to a demo quota.
- An authenticated user keeps the same `user_id` across devices.

**Priority**: **P0** (inside "P0 persistence" — prerequisite for every other P0)

---

## Gap 2 — Database persistence

**Current state**
`lib/store.ts:91-95`: the entire application state — saves, likes, follows, events, published posts, custom products, session — persists via `zustand/middleware` `createJSONStorage(() => localStorage)` under key `objet-store-v1`. Seed content is compiled into the bundle (`lib/catalog.ts`). `package.json` contains no database driver of any kind. The event log is capped at the most recent 500 entries (`lib/store.ts:80-83`), so the funnel silently forgets.

**Missing capability**
A server database as the system of record: posts, object tags, products, offers, users, social edges, events, clicks, conversions, ledger. Migrations, backups, RLS/authorization.

**Files affected**
New `lib/db/` (client + queries) and `supabase/migrations/*` (or equivalent); `lib/store.ts` (shrinks to ephemeral UI state + optimistic cache); `app/create/page.tsx:240-272` (`publish()` must POST to server); `app/page.tsx`, `app/post/[id]/page.tsx`, `app/creator/[id]/page.tsx`, `app/discover/page.tsx`, `app/saved/page.tsx`, `app/profile/page.tsx`, `app/analytics/page.tsx`, `app/admin/page.tsx` (all read from hardcoded `POSTS`/localStorage today); `lib/analytics.ts` (server aggregation replaces `SEED_STATS`).

**DB changes**
Foundational schema (Postgres):
- `profiles`, `creator_profiles` (bio, verified, follower_count cache)
- `media_assets` (id, owner_id, storage_path, width, height, ratio, mime, status)
- `posts` (id, creator_id, media_id, caption, category, status `draft|published|removed`, published_at)
- `object_tags` (id, post_id, label, label_ko, x, y, w, h, polygons jsonb, canonical_class, confidence, product_id nullable FK, exactness `exact|similar`, source `ai|manual`)
- `events` (append-only: id, ts, session_id, user_id nullable, type, post_id, object_id, product_id, props jsonb) — indexed by (post_id, type, ts)
- `saves`, `likes`, `follows` (see Gap 4)

**API changes**
`POST /api/posts` (publish draft: media_id + tags + caption), `GET /api/feed`, `GET /api/posts/[id]`, `POST /api/events` (batched beacon via `navigator.sendBeacon`), `GET /api/creator/stats`. Next.js 16 note: dynamic route handlers receive `params` as a **Promise** (`const { id } = await params`) — the existing pages already follow this convention (`app/post/[id]/page.tsx:10-11` uses `use(params)`).

**Risk**
🔴 Data loss is guaranteed today: clearing the browser deletes a creator's entire "published" catalog and all analytics. Nothing is shared between users, so every KPI in `docs/PLAN.md` (OTR, Card→Outbound) is unmeasurable in aggregate. Also bug **B2**: `lib/analytics.ts:15-22` `SEED_STATS` keys (`post-ootd`, `post-mug`, …) reference posts deleted in PDCA Cycle 8 — the seed metrics silently no longer join to any live post, so the analytics page's non-zero numbers come only from the viewer's own local events.

**Acceptance criteria**
- Publishing a post from browser A makes it visible in browser B (logged out) within seconds.
- Deleting site data in the browser loses nothing that was published.
- Events survive past 500 entries and are queryable server-side by post/creator/time range.
- Seed demo content is either migrated into the DB or clearly flagged `is_seed` — no compiled-in content array on the read path.

**Priority**: **P0** (persistence)

---

## Gap 3 — Media storage

**Current state**
`app/create/page.tsx:71-96`: uploads are downscaled to ≤1280px on a canvas and kept as a **base64 JPEG dataURL in React state**, then embedded verbatim inside the `Post` object written to localStorage (`publish()` at `app/create/page.tsx:240-272`). Seed images are static files in `public/looks/`. There is no upload endpoint, no object storage, no CDN strategy beyond Vercel static assets.

**Missing capability**
Real media pipeline: direct-to-storage upload (signed URL), server-generated renditions/thumbnails, CDN delivery, ownership + lifecycle (orphan cleanup), size/type validation, EXIF stripping.

**Files affected**
New `app/api/media/upload/route.ts` (issue signed upload URL + register `media_assets` row); `app/create/page.tsx` (upload the canvas blob before/at publish; keep the dataURL only as the in-flight preview and vision-pipeline input — the detection/mask pipeline correctly consumes dataURLs and must not change); `components/PostCard.tsx`, `next.config.ts` (`images.unoptimized: true` should be revisited once images come from storage — enable the optimizer or CDN loader).

**DB changes**
`media_assets` as in Gap 2, plus `status` (`uploading|ready|failed`) and `width/height/ratio` recorded server-side.

**API changes**
`POST /api/media/upload` → `{ uploadUrl, mediaId }`; storage webhook or confirm call flips `status=ready`; `POST /api/posts` accepts `media_id` (never raw base64).

**Risk**
🔴 localStorage quota is ~5–10MB; a 1280px JPEG dataURL is ~200–500KB, so a creator hits the ceiling after roughly a dozen posts and **`persist` begins throwing/silently dropping writes — the store can wedge**. Base64 in state also breaks share links (post images unreachable from any other device). Legal risk: no content ownership trail for user uploads.

**Acceptance criteria**
- Publish stores a storage URL/path in the DB; localStorage contains zero image payload bytes.
- A published post's image loads on a device that never saw the upload.
- Upload of a 10MB HEIC either converts or fails with a clear message; non-images rejected server-side.
- Orphaned uploads (no post after N hours) are garbage-collected.

**Priority**: **P0** (persistence)

---

## Gap 4 — Social persistence

**Current state**
Likes, saves, follows: arrays in localStorage (`lib/store.ts:9-13`), seeded with two follow IDs (one of which, `c-seoul`/`c-daily`, doesn't even exist in `CREATORS` — dead seed). `Post.likes` is a hardcoded seed integer; `toggleLike` never changes another user's view. Follower counts are static numbers in `lib/catalog.ts:78-81`. No comments feature at all. The feed's "Following" tab filters the static array client-side (`app/page.tsx:19-21`).

**Missing capability**
Multi-user social graph: server-persisted likes/saves/follows with counts, optimistic UI, and (eventually) comments + notifications. Creator follower counts derived from data.

**Files affected**
`lib/store.ts` (toggle actions become API mutations with optimistic update), `components/PostCard.tsx`, `app/creator/[id]/page.tsx` (follow button, follower count), `app/saved/page.tsx`, `app/page.tsx` (Following tab queries server), new `app/api/social/*` routes.

**DB changes**
- `follows` (follower_id, creator_id, created_at; PK both)
- `likes` (user_id, post_id, created_at; PK both)
- `saves` (user_id, ref_type `post|product`, ref_id, created_at)
- Denormalized counters (`posts.like_count`, `creator_profiles.follower_count`) maintained by trigger or transactional update.

**API changes**
`PUT/DELETE /api/posts/[id]/like`, `PUT/DELETE /api/creators/[id]/follow`, `PUT/DELETE /api/saves`, `GET /api/me/saves`. All require auth (Gap 1).

**Risk**
🟠 Without this, STS is a single-player brochure — the flywheel in `docs/BUSINESS.md` §1 (viewer → purchase → creator reward → more creators) cannot start. Lower technical risk than P0 items; blocked by Gaps 1–2.

**Acceptance criteria**
- Like/save/follow from account A is visible to account B and survives logout.
- Follower and like counts shown anywhere equal `COUNT(*)` of the underlying tables (±cache lag ≤ 1min).
- Saved page shows the same list on two devices for the same account.

**Priority**: **P1** (real social backend)

---

## Gap 5 — Canonical product graph

**Current state**
The "catalog" is 39 hardcoded `Product` literals in `lib/catalog.ts:15-73`. Product identity is a hand-picked string id (`pl-polo-oxford`). Similarity is a hand-written `similarIds` array. Retrieval keywords are a hand-maintained map per product (`lib/match.ts:12-54`), and representative colors live in a third parallel map (`lib/product-colors.ts`). Creator "URL products" become `customProducts` in localStorage with no dedup — the same SKU pasted twice becomes two products (`app/create/page.tsx:721-742`). The retrieval pipeline (preserved) calls `searchCatalog()` over this array (`lib/retrieval/catalog-provider.ts`).

**Missing capability**
A canonical product entity in the DB: brand + product + attributes + images, a canonicalization step (dedup by brand/model/normalized name/URL fingerprint) so AI-suggested web candidates and creator URL submissions resolve to ONE node, embedding-based similarity to replace hand-written `similarIds`/`KEYWORDS`, and a growth path (every creator confirmation enriches the graph — this is the "object-level purchase-intent graph" data asset from `docs/BUSINESS.md` §2).

**Files affected**
New `lib/products/` (canonicalization + queries); `lib/retrieval/catalog-provider.ts` (swap `PRODUCTS` array for DB/search query — **interface stays identical**: `searchCatalog(query, limit)` returning `ProductCandidate[]`); `lib/match.ts` (`candidatesFor`/`searchProducts` re-point to server search); `lib/catalog.ts` (becomes a seed migration, then deleted from the read path); `app/create/page.tsx` (URL submit → `POST /api/products/resolve`); `components/ProductSheet.tsx` (similar products from graph query).

**DB changes**
- `brands` (id, name, aliases text[])
- `products` (id, brand_id, name, name_ko, category, canonical_key unique — normalized brand+model fingerprint, attributes jsonb, status `active|merged|retired`, merged_into_id)
- `product_images` (product_id, media/url, role)
- `product_similarity` (product_id, similar_id, score, source `manual|embedding|copurchase`)
- Optional from day one, required for scale: pgvector column `products.embedding` for text/visual similarity (PRD already anticipates pgvector — `docs/PLAN.md` §3).

**API changes**
`GET /api/products/search?q=` (backs both creator search tab and viewer "비슷한 상품 찾기"), `POST /api/products/resolve` (input: URL or candidate payload → returns existing canonical id or creates one), `GET /api/products/[id]/similar`.

**Risk**
🔴 Without canonical identity, attribution (Gap 8–10) aggregates by arbitrary string ids and the same real-world SKU splits into N rows — commissions, analytics, and the intent graph all corrupt. This gap gates the entire commerce chain.

**Acceptance criteria**
- Pasting the same product URL twice (or confirming the same AI web candidate twice) yields one product row.
- `similarIds`, `KEYWORDS`, `PRODUCT_TONES` maps are gone from the bundle; equivalent signals live on product rows.
- Retrieval benchmark (`tests/vision/retrieval-benchmark.ts`, 54 GT links) still reports Recall@1 ≥ 96% after the provider swap.
- A new product created by a creator is immediately searchable by other creators.

**Priority**: **P0** (canonical product + merchant offers)

---

## Gap 6 — Merchant offers

**Current state**
Each product has exactly one `url` (a Naver Shopping **search-results deeplink**, not a product page — `lib/catalog.ts:12`), one static `price`, one `retailer` string. Prices are "공개 정가 기준의 참고값" (list-price guesses). No stock, no price refresh, no multiple sellers, no merchant entity.

**Missing capability**
Offer layer separated from product identity: N merchant offers per canonical product, each with its own URL, price, availability, affiliate network binding and commission rate; staleness tracking; selection logic (which offer backs the Buy CTA — highest trust/commission/lowest price policy).

**Files affected**
`components/ProductSheet.tsx` (price/retailer/CTA read from selected offer; affiliate badge from offer), `lib/retrieval/*` (candidates may carry offer info), new `lib/offers/`, `app/api/products/[id]/offers`.

**DB changes**
- `merchants` (id, name, domain, trust_score)
- `merchant_offers` (id, product_id, merchant_id, url, price, currency, availability `in_stock|oos|unknown`, affiliate_network_id nullable, commission_rate, is_primary, last_checked_at, status)
- `offer_price_history` (offer_id, price, checked_at) — needed later for integrity ("was the displayed price honest").

**API changes**
`GET /api/products/[id]/offers`; internal refresh job (cron/queue) re-validating offer URLs and prices; offer selection embedded in `GET /api/posts/[id]` payload so the sheet renders without extra round-trips.

**Risk**
🟠 Displayed prices are already fictional relative to retail reality; once real money flows (Gap 9) a wrong price/commission pair becomes a trust and legal problem. Search-deeplinks (current URLs) also convert worse than product-page deeplinks and many affiliate networks won't attribute them.

**Acceptance criteria**
- Product sheet renders brand/price/retailer/CTA from an offer row; changing the offer in DB changes the UI without redeploy.
- Every affiliate-flagged offer carries a machine-readable network + commission rate sourced from that network, not hand-typed.
- Offers unchecked for > N days are flagged and excluded from the Buy CTA.

**Priority**: **P0** (canonical product + merchant offers)

---

## Gap 7 — Affiliate integration

**Current state**
`affiliate: boolean` and `commissionRate` are hardcoded per product in `lib/catalog.ts`. Outbound URLs contain **no affiliate parameters whatsoever** — they are plain Naver search links. `docs/BUSINESS.md` §5 confirms: "제휴 네트워크 실연동 (ADPICK BIZ directlink 등) → 클릭/주문 attribution" is an unchecked box. No network SDK/API, no deeplink generation, no subid convention.

**Missing capability**
Integration with at least one real network (ADPICK, LinkPrice, Coupang Partners, or direct brand programs): deeplink/directlink generation per offer, a `subid` convention that encodes our click id, commission schedules synced from the network, and compliance with each network's link and disclosure rules.

**Files affected**
New `lib/affiliate/` (per-network adapter: `buildDeeplink(offer, clickId)`, `parsePostback(req)` — same adapter pattern as `lib/llm/*`, which is the house style); `merchant_offers` rows get network binding; click router (Gap 8) calls `buildDeeplink`; `.env.example` gains network credentials.

**DB changes**
- `affiliate_networks` (id, name, deeplink_template, subid_param, postback_secret, commission_sync config)
- `merchant_offers.affiliate_network_id`, `merchant_offers.network_offer_ref`
- Commission rates move from hand-typed to synced-with-audit (`commission_rate_source`, `synced_at`).

**API changes**
None public. Internal: deeplink builder used by `/r/[clickId]`; nightly commission-schedule sync job; postback receiver lands in Gap 9.

**Risk**
🔴 The entire revenue model (70/30 split) is fictional until this exists. External dependency risk: network onboarding/approval takes weeks — start applications early. Naver Shopping search links may violate some networks' deeplink policies (must link to merchant product pages).

**Acceptance criteria**
- Clicking Buy on an affiliate offer lands on the merchant page with the network's tracking parameters present, carrying our click id as subid.
- A test order placed through that link appears in the network dashboard attributed to our subid.
- Commission rates shown in UI equal the network-synced value for that offer.

**Priority**: **P0** (click attribution)

---

## Gap 8 — Click router

**Current state**
`components/ProductSheet.tsx:34-37`: `openOutbound()` fires a localStorage event and `window.open(p.url)` **directly from the client**. No server sees the click. No click id exists. The event log (capped at 500, local-only) is the only record. The similar-products row (`ProductSheet.tsx:96`) does the same.

**Missing capability**
A server-side redirect endpoint — the single point where intent becomes attributable: create click record → build affiliate deeplink with subid=click_id → 302. Must add **zero visible UI** (immutable principle: the tap experience is unchanged; the URL just goes through `/r/…`).

**Files affected**
New `app/r/[clickId]/route.ts` **or** `app/api/click/route.ts` (POST returns redirect URL; GET 302 pattern preferred so plain `<a href>` works). `components/ProductSheet.tsx` (both CTA and similar-row build `/r/...` URLs; keep `window.open` + `noopener`). Next.js 16: route handler receives `params` as `Promise` — `const { clickId } = await params`.

**DB changes**
- `clicks` (id uuid = subid, ts, session_id, user_id nullable, post_id, object_id, product_id, offer_id, creator_id, dest_url, ua_hash, referer, ip_hash) — append-only, indexed by (creator_id, ts) and (offer_id, ts).

**API changes**
`GET /r/[clickId]` is pre-minted (client POSTs `/api/clicks` on sheet open to get the id, so redirect adds ~0ms at tap time) **or** minted inline (`GET /api/r?offer=…&post=…&obj=…` creates + redirects in one hop; simpler, chosen default). Rate limiting + bot filtering (UA heuristics) at this endpoint.

**Risk**
🔴 Every outbound click today is unattributable and unrecoverable — the core BM has no data spine. Latency risk is minimal (one insert + 302). Privacy: store hashes, not raw IP/UA; document retention.

**Acceptance criteria**
- Tapping Buy goes browser → our `/r/…` → merchant, adding ≤ 150ms p95.
- Each outbound lands a `clicks` row with post, object, product, offer, creator, and timestamp; the subid delivered to the network equals the click row id.
- The object-tap UX is pixel-identical (no interstitial, no new UI).
- Bot/prefetch clicks are flagged and excluded from creator-facing counts.

**Priority**: **P0** (click attribution)

---

## Gap 9 — Conversion attribution

**Current state**
None. `app/analytics/page.tsx:20` computes `purchases = Math.round(t.outbound * 0.025)` — an assumption, labeled as such in the UI ("전환 2.5% 가정"). No postback endpoint, no conversion table, no reconciliation.

**Missing capability**
Network postback/webhook receiver mapping `subid → click`, a `conversions` table with status lifecycle (`pending → confirmed → cancelled` respecting networks' return windows), idempotent ingestion (dedup on network+order id), and CSV import for networks without postbacks.

**Files affected**
New `app/api/webhooks/affiliate/[network]/route.ts` (signature check per network adapter in `lib/affiliate/`), new `lib/conversions/`; `app/analytics/page.tsx` (replace assumption with real data + keep an "estimated" fallback state for creators with no conversions yet); `app/admin/*` (reconciliation view, Gap 15).

**DB changes**
- `conversions` (id, click_id FK nullable — some networks attribute loosely, network_id, network_order_ref, order_amount, commission_amount, currency, status, occurred_at, confirmed_at, raw jsonb, UNIQUE(network_id, network_order_ref))
- Status transitions audited (`conversion_status_history`).

**API changes**
Webhook route above (must be exempt from auth but signature-verified; must be idempotent — networks retry). Admin `POST /api/admin/conversions/import` (CSV). Aggregates exposed through creator stats endpoint.

**Risk**
🔴 Without it, "purchases attributed back to the creator" — the product's one-line promise — is false. Fraud surface opens here (fake postbacks → fake earnings): signature verification and click-match validation are mandatory at v1, not later.

**Acceptance criteria**
- A sandbox/test order posted by the network creates exactly one `pending` conversion linked to the originating click; replaying the postback creates zero additional rows.
- Cancelled orders transition the conversion and reverse downstream ledger entries (Gap 10).
- Analytics "구매(추정)" is replaced by real conversion counts once ≥1 network is live; the 2.5% assumption no longer renders for connected creators.

**Priority**: **P0** (conversion + ledger)

---

## Gap 10 — Commission ledger

**Current state**
None. The only money math in the codebase is display arithmetic: `lib/analytics.ts:59-61` (`estimatedEarnings`) and `app/create/page.tsx:590-592` (per-sale preview). **Bug B1**: `estimatedEarnings` multiplies by `0.75` while every UI string, `docs/BUSINESS.md`, and the create-flow preview use **70%** — the two "earnings" numbers on screen are computed with different splits.

**Missing capability**
Double-entry ledger as the single source of financial truth: every confirmed conversion posts balanced entries (creator 70% / platform 30%), reversals on cancellation, immutability (append-only, corrections as new entries), balance queries, and payout accounting.

**Files affected**
New `lib/ledger/` (posting rules, invariant checks); conversion status transitions (Gap 9) trigger postings; `app/analytics/page.tsx` and `app/profile/page.tsx` earnings read ledger balances; delete `estimatedEarnings` or clearly demote it to a "projection" helper with the correct 0.70 constant.

**DB changes**
- `ledger_accounts` (id, type `creator|platform|reserve|network_receivable`, owner_id nullable)
- `ledger_entries` (id, txn_id, account_id, amount signed, currency, conversion_id nullable, payout_id nullable, memo, created_at; append-only; CHECK sum(txn)=0 enforced at posting layer)
- `payouts` (id, creator_id, period_start/end, amount, status `pending|paid|failed`, method, external_ref, executed_at)

**API changes**
Internal posting service (invoked by conversion transitions); `GET /api/creator/earnings` (balance = confirmed, pending, paid-out); admin payout endpoints (Gap 15).

**Risk**
🔴 Paying creators from ad-hoc queries instead of a ledger ends in double-pays and untraceable balances; retrofitting a ledger after money moved is far costlier than building it first. The 70 vs 75% inconsistency (B1) shows why one constant in one module must own the split.

**Acceptance criteria**
- For any conversion: sum of ledger entries = 0; creator entry = round(commission × 0.70); platform entry = remainder.
- Cancelling a confirmed conversion produces reversing entries, never mutations/deletes.
- A creator's displayed earnings equal their ledger balance exactly, and the 70% constant exists in exactly one place in the codebase.
- Ledger passes a replay test: rebuilding balances from entries matches stored balances.

**Priority**: **P0** (conversion + ledger)

---

## Gap 11 — Creator earnings

**Current state**
Display-only estimates: analytics KPI card "크리에이터 수익" = `estimatedEarnings(outbound)` (assumption chain: 2.5% conversion × ₩70,000 AOV × 5% commission × 0.75 split — with bug B1 above). Publish-success screen promises "정산 내역은 애널리틱스에서 확인됩니다" — nothing behind it. No payout identity (bank/KYC), no statements, no tax handling.

**Missing capability**
Real earnings surface backed by the ledger: pending vs confirmed vs paid balances, per-post and per-product breakdown (which object earned what — the core creator motivator per `docs/BUSINESS.md` §4), payout onboarding (bank account, minimal KYC, tax info for KR 사업소득/기타소득 withholding), statements.

**Files affected**
`app/analytics/page.tsx` (수익 tab becomes real; funnel's 구매 stage from conversions), `app/profile/page.tsx`, new `app/earnings/*` or extend analytics, new payout-onboarding UI, `app/create/page.tsx` `EarningsSummary` (per-sale preview reads network-synced rates).

**DB changes**
Reads from Gap 10 tables; adds `payout_accounts` (creator_id, bank info tokenized/encrypted, verified_at) and `creator_tax_profiles` (residency, withholding class).

**API changes**
`GET /api/creator/earnings` (balances + time series), `GET /api/creator/earnings/breakdown?by=post|product`, `POST /api/creator/payout-account`.

**Risk**
🟠 Trust risk more than technical: showing fabricated earnings to real creators would be worse than showing nothing — this must flip from "estimate" to "real" atomically with Gaps 9–10, with pre-launch copy clearly marking estimates. Payout compliance (KYC, withholding) has legal lead time.

**Acceptance criteria**
- Earnings page shows pending/confirmed/paid from ledger; totals reconcile with Gap 10 acceptance checks.
- Per-post breakdown attributes every won to a conversion → click → object chain.
- A creator cannot request payout without a verified payout account; payouts appear in `payouts` with external reference.
- All remaining estimate figures are visually labeled as estimates and use the 70% constant.

**Priority**: **P0** (creator earnings)

---

## Gap 12 — TikTok import

**Current state**
Zero code. No route, no lib, no UI, no mention outside vision docs' video-future notes. (Verified by repo-wide search for `tiktok`.)

**Missing capability**
Creator-initiated import of their own TikTok content: OAuth via TikTok's official **Display API / Content Posting API counterpart (user-authorized "List Videos"/"Query Videos")**, video → keyframe extraction, keyframes through the existing detection + segmentation pipeline, creator confirms SKUs as usual, publish as STS post (initially image-keyframe posts; video playback is a later concern). Scraping is not an option (ToS + legal risk — same policy stance the repo already takes with Naver in `lib/naver/api-hub.ts`).

**Files affected**
New `app/api/import/tiktok/*` (OAuth + fetch + job status), new `lib/imports/tiktok.ts`, `app/create/page.tsx` (new entry point "TikTok에서 가져오기" feeding the existing `startAnalysis` path with extracted frames — the analysis/confirm flow itself is preserved), background job runner for video processing (Vercel cron/queue or Supabase Edge Function).

**DB changes**
- `imports` (id, creator_id, source `tiktok`, source_video_id, source_url, status `queued|fetching|processing|ready|failed`, media_id nullable, error, created_at)
- `posts.import_id` nullable (provenance).

**API changes**
`GET /api/import/tiktok/authorize` → OAuth; `POST /api/import/tiktok` (video selection) → job; `GET /api/import/[id]` (status polling). Keyframe extraction needs ffmpeg-capable compute — not a Vercel serverless default; plan an edge function/worker with ffmpeg or a media API.

**Risk**
🟠 External approval risk: TikTok developer app review takes time and scopes are restrictive (user's own videos only — which matches the product need). Video processing infra is the first thing in the codebase that can't run inside Next.js request handlers.

**Acceptance criteria**
- A creator connects TikTok, picks one of their own videos, and gets an STS draft with detected objects on ≥1 keyframe, then confirms SKUs through the unchanged review UI.
- Import provenance (source video id/url) stored on the post.
- Failed imports surface a retryable status, never a dead end.

**Priority**: **P1** (TikTok import)

---

## Gap 13 — Feed recommendation

**Current state**
`app/page.tsx:15-23`: feed = `[...userPosts, ...POSTS]` sorted by `createdAt` descending. "For You" is everything; "Following" is a client-side filter. Discover (`app/discover/page.tsx`) is client-side text/category filtering of the same static array. No ranking signal is used — not even the locally-tracked events.

**Missing capability**
Server-side feed endpoint with a ranking function that starts simple (recency + follow boost + engagement rate + shoppability signal e.g. tagged-object CTR) and is *upgradeable* (feature-logged so a learned ranker can come later). Pagination (the current app renders the entire corpus). Integrity hooks (Gap 14: dedupe, quality/moderation filters, disclosure requirements at rank time).

**Files affected**
`app/page.tsx` (fetch `/api/feed?tab=foryou|following&cursor=`), new `lib/feed/ranker.ts`, `app/discover/page.tsx` (server search), reuse `events` aggregates from Gap 2.

**DB changes**
- Materialized per-post engagement stats (`post_stats`: views, taps, card_opens, outbound, ctr fields refreshed periodically from `events`)
- `feed_impressions` (or reuse `events` type=asset_view with dedupe) to avoid re-showing and to measure OTR properly.

**API changes**
`GET /api/feed` (cursor-paginated, tab param), `GET /api/discover/search`. Ranking runs server-side; client keeps zero ranking logic.

**Risk**
🟡 Low technical risk, high product risk if skipped after social launch: a chronological global feed collapses once content volume grows, and OTR (the north-star KPI, target ≥ 4%) is unmeasurable without impression logging.

**Acceptance criteria**
- Feed paginates (no full-corpus render); p95 feed API < 300ms at seed scale.
- Ranker is a pure function over logged features; changing weights requires no client deploy.
- Impression → tap events allow computing real OTR per post and per feed position.
- Following tab shows only followed creators' posts, server-verified.

**Priority**: **P1** (feed integrity/recommendation)

---

## Gap 14 — Commerce integrity

**Current state**
Good instincts, all client-side and unenforced: affiliate badge + "수수료의 70%가 크리에이터에게" disclosure in the sheet (`components/ProductSheet.tsx:76-81,149-154`), exact/similar badges everywhere, no-hallucination rules in retrieval (brand requires visual evidence, web candidates capped below "exact" — `lib/retrieval/index.ts:135-137`), model-generated URLs never trusted (`app/api/product-search/route.ts:137-138`). But: any client can write any event into its own analytics; commission rates are self-declared; links are never re-validated; no moderation, no report flow, no audit trail; and displayed prices are static guesses (Gap 6).

**Missing capability**
Server-side enforcement of what the UI already promises: (a) disclosure guaranteed by data — affiliate flag comes from the offer's network binding, not a hand flag; (b) price/link honesty — periodic revalidation, stale offers pulled from CTA; (c) event integrity — funnel counted from server-received events with bot filtering, click counts from `clicks` not client logs; (d) exactness integrity — `exactness=exact` requires creator confirmation recorded with attribution (who, when, from which AI suggestion) for dispute handling; (e) moderation minimum — report content/link, admin takedown, blocklist for merchant domains.

**Files affected**
Server routes from Gaps 2/6/8 (validation lives there), new `lib/integrity/` (link checker job, event sanity rules), `app/admin/*` (Gap 15 surfaces), `object_tags` gains confirmation audit fields.

**DB changes**
- `object_tags.confirmed_by`, `confirmed_at`, `ai_suggestion jsonb` (what AI proposed vs what creator chose — also the training-data loop `docs/VISION.md` §7 asks for)
- `link_checks` (offer_id, http_status, ok, checked_at)
- `reports` (id, reporter_id, ref_type, ref_id, reason, status)
- `audit_log` (actor, action, ref, before/after jsonb, ts)

**API changes**
`POST /api/reports`; link-check cron; event ingestion validation (type whitelist, rate caps per session, server timestamps); admin takedown endpoints.

**Risk**
🟠 Regulatory: KR 표시광고법/공정위 추천·보증 심사지침 require clear ad disclosure for compensated links — currently the badge renders only if a hand-set boolean is true. One mislabeled offer at scale is a fine + trust incident. Fraud: self-reported client events will be gamed the moment earnings are real.

**Acceptance criteria**
- Every offer with a network binding renders disclosure; there is no code path to an affiliate outbound without the badge.
- Dead/changed links (HTTP ≥ 400 or redirect off-domain) are auto-pulled from Buy CTA within 24h.
- Creator-facing counts (taps, outbound) are computed exclusively from server-side `events`/`clicks`, with documented bot filters.
- Every exact-confirmation stores who confirmed and what the AI suggested.

**Priority**: **P1** (feed integrity) — with the disclosure-from-data portion landing earlier as part of Gap 6/7 (P0), since it's schema-shaped.

---

## Gap 15 — Admin operations

**Current state**
`app/admin/page.tsx` is a client page reading the **viewer's own localStorage** (`useApp` at line 23) — an "admin" sees their own browser's demo events and everyone sees the same hardcoded posts. No role check (any visitor can open `/admin`), no server data, no actions (nothing can be taken down, refunded, or reconciled). Merchant side: nothing exists at all.

**Missing capability**
Real back office: role-gated access (Gap 1 `role=admin` + `proxy.ts` guard), content ops (search/take down posts, ban users), commerce ops (conversion reconciliation, payout runs, offer/link health, commission-rate sync status), integrity queue (reports from Gap 14), and later a merchant/brand portal (offer feed upload, performance view — the B2B surface from `docs/BUSINESS.md` §3.5).

**Files affected**
`app/admin/page.tsx` (rebuild on server data; split into sections: content / commerce / integrity), new `app/admin/*` subpages, new `app/api/admin/*` routes (all role-checked server-side — client-side gating is not acceptable), `proxy.ts` matcher for `/admin/:path*`.

**DB changes**
None beyond prior gaps; adds `audit_log` usage everywhere admin actions mutate state.

**API changes**
`GET/POST /api/admin/posts|users|conversions|payouts|reports|offers` with server-side `role=admin` enforcement and audit logging on every mutation.

**Risk**
🟡 Low until real users/money exist — then instantly critical (payout runs and takedowns are manual SQL without it). The current page is also a minor embarrassment risk: `/admin` is publicly routable today (harmless only because it shows the visitor's own local data).

**Acceptance criteria**
- `/admin` returns 404/redirect for non-admin sessions (verified server-side, not CSS).
- An admin can take down a post and the feed reflects it within seconds; action lands in `audit_log`.
- Conversion reconciliation view shows network totals vs ledger totals per period with drill-down.
- Payout run can be executed and produces `payouts` rows + ledger entries.

**Priority**: **P2** (admin/merchant tools)

---

## Cross-cutting bugs & discrepancies found during audit

| ID | Finding | Where | Impact |
|---|---|---|---|
| B1 | Creator split constant inconsistency: earnings estimate uses **75%**, all UI/docs/preview use **70%** | `lib/analytics.ts:61` (`* 0.75`) vs `app/create/page.tsx:591` (`* 0.7`), `components/ProductSheet.tsx:152`, `docs/BUSINESS.md` | Two different "earnings" figures on screen; fix when ledger lands (single constant) |
| B2 | `SEED_STATS` keys reference posts deleted in PDCA Cycle 8 (`post-ootd`, `post-mug`, …) — seed metrics never join to any current post | `lib/analytics.ts:15-22` | Analytics/admin numbers are purely the viewer's local events; seed "non-empty dashboard" intent silently broken |
| B3 | Default `following` seeds `["c-seoul", "c-daily"]` — neither creator id exists in `CREATORS` | `lib/store.ts:43` vs `lib/catalog.ts:77-82` | Following tab starts effectively empty; dead seed data |
| B4 | Event log hard-capped at 500 entries | `lib/store.ts:80-83` | Funnel silently loses history even within the demo |
| B5 | `docs/BUSINESS.md` §5 marks "Google/Kakao 로그인" as done — it is a fake session (docs vs code) | `docs/BUSINESS.md:56`, `app/login/page.tsx` | Docs overstate; code is source of truth (this audit) |
| B6 | localStorage quota vs base64 post images — store writes will start failing after ~a dozen uploads | `app/create/page.tsx:240-272`, `lib/store.ts:93` | Publish appears to succeed then state wedges; strongest single argument for Gap 3 |

## Environment/ops gaps (not a numbered subsystem, still production-relevant)

- **No tests beyond vision benchmarks** (`tests/vision/*`); no CI workflow in the repo; `npm run build`/`tsc` discipline is manual (PDCA logs show it being run by hand).
- **No error tracking / structured logging** — server routes `console.warn` only.
- **Secrets posture is good** (server-only keys, masked in health endpoint) — keep it.
- **`images.unoptimized: true`** (`next.config.ts:5`) is right for repo-bundled seed photos, wrong once media comes from storage (Gap 3).
- **Next.js 16 conventions to respect in all new work**: `proxy.ts` (root) instead of deprecated `middleware`; `params` are Promises in pages/routes; Route Handlers use Web `Request`/`Response`. Bundled docs: `node_modules/next/dist/docs/`.
