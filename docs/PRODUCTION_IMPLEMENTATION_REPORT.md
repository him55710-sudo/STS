# STS Production Implementation Report — Phase 1: Backend Foundation & Persistence

> **Date**: 2026-08-13 · **Branch**: `claude/sts-production-gap-audit-8uhzw5`
> **Scope**: Gap 1 (auth), Gap 2 (database persistence), Gap 3 (media storage), and the persistence half of Gap 4 (social) from [`PRODUCTION_GAP_AUDIT.md`](./PRODUCTION_GAP_AUDIT.md).
> **Explicitly deferred per instructions**: TikTok import, affiliate attribution, click router, conversion/ledger, feed recommendation.

## What exists now

STS has a real persistent backend: **Supabase project `sts`** (`rtyarqmospdmiemknucq`, region `ap-northeast-2`, Postgres 17). The app talks to it exclusively with the **anon/publishable key + Row Level Security** — no service-role key exists anywhere in the codebase, client or server.

```
Browser (Next.js client)
  ├─ Supabase Auth  (OAuth Google/Kakao + email/password, PKCE)
  ├─ Storage upload (post-media bucket, own-folder RLS)  ← creator images
  ├─ publish_post RPC (atomic post+media+objects+links, SECURITY INVOKER)
  └─ PostgREST reads/writes under RLS (feed, likes, saves, follows)
proxy.ts (Next 16 proxy convention) — session token refresh per request
app/auth/callback — PKCE code → session cookie exchange
```

**Two independent mode axes** (`lib/config.ts`):
- **Backend configured** (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set): real auth, real persistence.
- **Demo mode** (`NEXT_PUBLIC_DEMO_MODE=true`, or backend unconfigured): seed content visible, demo login allowed, localStorage behavior preserved. **In production mode (flag off + backend configured), fake login success is impossible** — the demo sign-in path is not rendered and posts cannot be published without a real session.

## Database schema (all RLS-enabled)

Migrations in `supabase/migrations/`, applied to the live project:

| Migration | Contents |
|---|---|
| `20260813000001_foundation.sql` | `profiles`, `posts`, `post_media`, `objects`, `object_product_links`, `follows`, `post_likes`, `post_saves`, `product_saves`, `comments` + all RLS policies + `handle_new_user` trigger (auto-provision profile per auth user) + indexes |
| `20260813000002_storage.sql` | `post-media` bucket (public read, 10MB, image mime types) + own-folder upload/delete policies |
| `20260813000003_publish_rpc.sql` | `publish_post(caption, category, media jsonb, objects jsonb) → uuid` — atomic, SECURITY INVOKER (runs under caller's RLS) |

Key invariants enforced **in the schema**, not just the UI:
- `object_product_links.relationship='exact'` requires `verified_by IS NOT NULL` (check constraint `exact_requires_verifier`) — AI alone can structurally never mark a link exact; the RPC stamps `verified_by = auth.uid()` because the creator confirmed each link in the review UI.
- All writes constrained to `auth.uid()` (RLS `with check`); anon can only read published content; post/product saves are private to their owner (likes/follows are public for counts).
- Profile self-update cannot escalate `role` to `admin`.
- Vision geometry (`bbox` jsonb, `polygon`, `polygons` multi-ring, `canonical_class`, `pipeline_version`) is stored verbatim — the detection/segmentation pipeline is untouched.

Note: `object_product_links.product_id` is a **text id** (catalog namespace) and off-catalog products travel as a self-contained `product_snapshot` jsonb on the link. This is deliberate — the canonical product graph is Phase 2 (`IMPLEMENTATION_SEQUENCE.md`), and the snapshot keeps cross-device product sheets working until then.

## App changes

**New**: `lib/config.ts` (mode flags), `lib/supabase/client.ts` + `server.ts`, `proxy.ts` (session refresh; Next 16 renamed `middleware`→`proxy`), `app/auth/callback/route.ts`, `lib/backend/{types,posts,social}.ts` (row↔app-type mapping, upload+publish, social mutations/hydration), `components/AuthProvider.tsx` (session→store sync + feed load).

**Refactored**:
- `lib/store.ts` — Zustand persists **only** demo/local state (`partialize`); server state (`session`, `remotePosts`, `remoteCreators`, `remoteProducts`) is never written to localStorage. Social toggles are optimistic with server sync for uuid ids and revert on failure; sign-out strips server-backed ids. Seed ids (`post-look1`, `c-minu`) are never written to the server.
- `app/create/page.tsx` — publish is now: storage upload (`{userId}/{uuid}.jpg`) → `publish_post` RPC. **Creator-uploaded base64 images no longer enter localStorage in backend mode.** Demo-mode local publish survives only when demo login is allowed; production mode redirects unauthenticated publishers to login. Detection → mask → candidate → exact/similar confirmation flow unchanged.
- `app/login/page.tsx` — real `signInWithOAuth` (Google/Kakao) + email/password fallback with honest "확인 메일" state; demo session button only in demo mode, clearly labeled "저장되지 않음".
- Feed / post / creator / discover / saved / profile / analytics / admin pages — server posts first, seed content only in demo mode; `useCreatorLookup()` resolves seed + server creators without crashing on unknown ids (previous `creatorById(...)!` would have thrown).

## Validation performed (results, not intentions)

Environment constraint: this dev container's egress proxy blocks `*.supabase.co`, so HTTP-level validation ran through the Supabase MCP (SQL layer, simulating PostgREST roles/JWT claims exactly), plus a real browser test of the app in demo mode.

| Check | Method | Result |
|---|---|---|
| Create profile | Insert 2 auth users → trigger | ✅ profiles auto-created (handle, display_name from metadata) |
| Save post + media + objects + links | `publish_post` RPC as `authenticated` role with JWT claims | ✅ 1 post, 1 media, 2 objects, 2 links in one transaction |
| Geometry round-trip | Multi-ring polygons in → select back | ✅ 2 rings preserved, bbox intact |
| Exact requires creator confirmation | Direct insert `exact` with `verified_by=null` | ✅ rejected (`exact_requires_verifier`) |
| Post survives "refresh"/other device | Fresh anon session select | ✅ published post + objects + links visible logged-out |
| Like/save/follow persist | Insert as user B, re-read | ✅ all persisted; follower count = 1 |
| Impersonation blocked | User B likes as user A | ✅ RLS rejection |
| Anon write blocked | Anon post insert | ✅ RLS rejection |
| Cross-user delete blocked | B deletes A's post | ✅ 0 rows affected |
| Saves privacy | Anon reads post/product saves | ✅ 0 visible (owner-only) |
| Storage bucket + policies | Catalog inspection | ✅ bucket, 10MB limit, image mimes, 3 policies |
| Security advisor | Supabase linter | ✅ clean after locking `handle_new_user` out of RPC (see below) |
| Typecheck + build | `tsc --noEmit`, `next build` | ✅ clean, 17 routes, proxy registered |
| Demo mode intact | Playwright vs `next dev` | ✅ 10 seed cards, object tap → product sheet, all routes 200, 0 page errors |

Test data was fully cleaned up afterwards (0 rows in all tables; cascades verified in the process).

### Real defects found and fixed during validation
1. **jsonb null geometry** — JSON `null` payload values stored as jsonb-`null` scalars instead of SQL NULL; fixed with `nullif(...)` in the RPC (`publish_rpc_null_geometry_fix`).
2. **Account deletion deadlock** — `verified_by on delete set null` collided with `exact_requires_verifier`, making it impossible to delete a user who had verified exact links. Changed to `on delete cascade` (verifier = post creator today, whose posts cascade anyway) — `verified_by_cascade_fix`.
3. **Trigger function exposed via RPC** — advisor flagged `handle_new_user` (SECURITY DEFINER) callable through `/rest/v1/rpc/`; execute revoked from `public/anon/authenticated` (`lock_down_trigger_function`).

These three fixes are folded into the repo migration files, so a fresh environment gets the corrected schema directly; the live project carries them as follow-up migrations.

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | `https://rtyarqmospdmiemknucq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | publishable key (`sb_publishable_...`) — safe client-side, RLS enforces authz |
| `NEXT_PUBLIC_DEMO_MODE` | Vercel | `true` = seed content + demo login; unset/`false` = production mode |
| (absent by design) `SUPABASE_SERVICE_ROLE_KEY` | — | **not used anywhere**; if a future server-only admin job needs it, it must live server-side without the `NEXT_PUBLIC_` prefix |

`.env.local` (gitignored) is populated in this workspace; **Vercel needs the three vars set in the dashboard before the next deploy** for production persistence to activate.

## Blockers (honest status)

1. **OAuth provider credentials absent** — Google/Kakao are wired (`signInWithOAuth` + PKCE callback) but the providers are not configured in the Supabase dashboard (client id/secret required; Kakao needs a Kakao Developers app, Google a GCP OAuth client with redirect `https://rtyarqmospdmiemknucq.supabase.co/auth/v1/callback`). Until then those buttons surface the provider error honestly. **Email/password works today as the real-auth path** (enabled by default on Supabase); if the project's "Confirm email" setting is on, the UI shows the check-your-inbox state rather than faking a session — that setting couldn't be verified from this container (see 2).
2. **Container egress blocks `*.supabase.co`** — storage byte-upload and the live auth handshake could not be exercised from this dev environment (DB-level equivalents were validated instead, and bucket/policies are confirmed). First deploy to Vercel (or a local run on an unrestricted network) should re-run the 8-step validation list from the task; the app-side code paths are the same ones validated at the SQL layer.
3. **Known cosmetic issue** — for server posts, the like-count display can be off by one right after re-login (server count already includes your like while the +1 optimistic offset also applies). Real fix lands with the social phase's count denormalization.

## Not done (by instruction), unchanged from audit

TikTok import; affiliate deeplinks/click router; conversion attribution; commission ledger; creator earnings backend (analytics still shows labeled estimates from local events); feed recommendation; admin server data; comments UI (schema + RLS shipped, no UI yet); canonical product graph (Phase 2 — `product_id` remains a text id with snapshot fallback).

## Post-deploy checklist

1. Vercel → Environment Variables: set the three `NEXT_PUBLIC_*` vars above → redeploy.
2. Supabase dashboard → Auth → Providers: add Google + Kakao credentials; confirm "Confirm email" policy choice.
3. Supabase dashboard → Auth → URL Configuration: set site URL `https://sts-mongben.vercel.app` and add it to redirect allowlist (required for OAuth + email links).
4. Run the validation loop on the deployed app: sign up (email), upload → publish, refresh, open in second browser, like/save/follow, verify persistence.
5. Decide `NEXT_PUBLIC_DEMO_MODE` for production (`true` keeps seed lookbook content alongside real posts).
