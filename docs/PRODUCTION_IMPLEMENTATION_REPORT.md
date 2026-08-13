# STS Production Implementation Report

> 최신 단계가 위에 온다. Phase 2(상품 그래프)는 [`COMMERCE_GRAPH.md`](./COMMERCE_GRAPH.md) 참조.

---

# Phase 3: Attribution Click Layer + Conversion Ledger

> **Date**: 2026-08-13 · **Branch**: `claude/sts-production-gap-audit-8uhzw5`
> Closes audit Gaps 8 (click router), 9 (conversion attribution), 10 (commission ledger), 11 (creator earnings — display/accounting; payout execution deferred).
> **Deferred by instruction**: real affiliate network integrations (mock provider only), payout execution, TikTok.

## 재무 진실의 단일 출처 (Financial truth source)

돈에 관한 진실은 정확히 두 테이블이다:

| 질문 | 테이블 | 출처 |
|---|---|---|
| "무엇이 팔렸는가" | `conversions` | provider postback → 스키마 검증 → `ingest_conversion` RPC. 원문 payload가 `raw_payload`에 그대로 보존된다 (audit) |
| "누가 얼마를 받는가" | `creator_ledger_entries` | 전환 1건당 정확히 1행 (`UNIQUE(conversion_id)`), `creator_share + platform_share = gross_commission` check 제약 |

이 두 테이블에 없는 수치는 수익이 아니다. `/creator/earnings`와 애널리틱스의 커머스 수치는 여기서만 나오고, 남아 있는 데모 추정(전환율 2.5% × AOV 가정)은 **"데모 추정치 / DEMO ESTIMATE"로 명시 라벨링**되어 실측이 도착하는 순간 대체된다. Phase 1의 B1 버그(0.75 vs 0.70 불일치)는 `lib/commerce/revenue.ts`의 단일 상수(`NEXT_PUBLIC_CREATOR_SHARE`, 기본 0.70)로 소멸 — UI 문자열·분배 계산 전부 이 모듈을 거치고, 70%는 어디에도 하드코딩되어 있지 않다.

## 클릭 레이어 (Phase 3a)

- **`/go/[offerId]`** (route handler, Next 16 Promise-params 컨벤션): 오퍼 검증 → 익명/로그인 식별 → `click_id` 생성 → `commerce_clicks` 저장 → provider 어댑터의 추적 URL로 **303**. 비활성 판매처는 같은 상품의 최적 오퍼로 대체 후 이동(인텐트 보존), 대체 불가면 410, 무효 오퍼는 404. 클릭 저장 실패는 이동을 막지 않는다(유실 로그만).
- **익명 어트리뷰션**: httpOnly·SameSite=lax·1년 `sts_anon_id` 쿠키. 로그인 불필요.
- **모든 상거래 CTA가 /go 경유**: ProductSheet(베스트 오퍼·다른 판매처·비슷한 스타일), 크리에이터 숍, 저장 목록. `window.open(product.url)` 직행은 오퍼 그래프 밖 커스텀 상품(크리에이터가 URL로 직접 연결 — 서버가 목적지를 소유하지 않아 리다이렉터에 태우면 open redirect가 됨)에만 남아 있으며 이는 의도된 경계다. 분석 이벤트(track)와 권위 클릭 행은 별도로 둘 다 기록된다.
- **provider 추상화** (`lib/commerce/providers/`): `createTrackingUrl()` + `parseConversion()` 인터페이스, registry, mock 구현. 시드 provider 문자열(direct/linkprice/coupang-partners)은 전부 mock으로 라우팅 — **실 엔드포인트를 지어내지 않았다**. 실연동은 registry에 어댑터 하나 등록으로 끝난다.

## 전환 + 원장 (Phase 3b)

- **postback**: `POST /api/affiliate/[provider]/postback`. 어댑터 스키마 검증(provider 값 맹신 금지) → `computeSplit`(설정 분배율) → `ingest_conversion` RPC. 검증 실패는 `postback_failures`에 남는다.
- **인증**: `X-Postback-Secret` 헤더 ↔ DB `provider_secrets` 대조(SECURITY DEFINER 내부, RLS 정책 0개 테이블). service-role 키 불필요. mock의 개발 시크릿은 마이그레이션에 있고 운영 전환 시 SQL로 교체한다.
- **멱등성**: `UNIQUE(provider, external_conversion_id)` + `FOR UPDATE` 전이 규칙 — 동일 콜백 재전송은 'duplicate' no-op, pending→confirmed·→reversed만 전이, 다운그레이드는 무시. **중복 webhook이 중복 수익을 만드는 경로는 존재하지 않는다** (유니크 2중 + 전이 게이트).
- **원장 상태기계**: pending → confirmed(+`available_at` = 확정+30일 보류) → payable(`promote_payable_entries()`, 시간 기반·멱등) → paid(지급 단계에서). reversed는 pending/confirmed/payable 어디서든 진입.
- **`/creator/earnings`**: 이번 달 GMV · 구매 건수 · 미확정 · 확정 · 지급 가능 · 누적 지급 + 건별 드릴다운(게시물→오브젝트→상품→판매처→전환→수익). 전부 RLS 통과 실데이터.
- **관리자 뷰** (`/admin`): 클릭 / 전환 / 원장 / 반전 / 실패 postback — `is_admin()` RLS로만 열린다.

## 검증 결과

- **단위 테스트 36/36** (`npm test`): 익명 클릭 / 로그인 클릭 / creator_shop 클릭 / 무효 오퍼 404 / 비활성 판매처 대체·410 / 리다이렉트 URL 생성(stsclick 왕복) + 전환 생성 / 중복 콜백 키 수렴 / 70:30·커스텀 분배·합계 불변식 / 반전·전이 페이로드 / 스키마 위반 9종 거절.
- **SQL 통합 검증** (라이브 DB, PostgREST 역할 시뮬레이션): 익명 클릭 RLS 삽입 → pending 전환 생성(원장 12,691/5,439 분배) → 동일 콜백 재전송 = duplicate·행 수 불변 → confirmed 전이 → 보류 만료 후 payable 승격 → 반전(전환·원장 동시) → 다운그레이드 무시 → 크리에이터 본인 RLS 드릴다운 읽기 → 잘못된 시크릿 28000 거절. 검증 중 **RLS 상관 서브쿼리 스코프 버그 발견·수정**(무한정 `id`가 원장 테이블로 해석 — conversions 정책 재작성).
- **HTTP 검증** (dev 서버): `/go` 303 + `stsclick` 파라미터 + `sts_anon_id` httpOnly 쿠키 발급, 기존 쿠키 재발급 없음, 무효 오퍼 404.
- `tsc --noEmit` · `next build` 클린 (19 routes).

## 남은 지급(payout) 한계 — 정직 보고

1. **지급 실행이 없다**: `paid` 상태와 `paid_at` 컬럼은 존재하지만 그 전이를 만드는 지급 실행(계좌 등록·KYC·이체·`payouts` 배치)은 다음 단계다. 현재 원장의 끝은 `payable`이다.
2. **지급 후 반전(clawback) 미구현**: `paid` 이후 reversed postback이 오면 원장 상태는 기록되지만 회수는 수동 절차다 — 지급 단계에서 음수 조정 행으로 해소해야 한다.
3. **mock provider뿐**: 실 네트워크(쿠팡 파트너스·LinkPrice 등) 어댑터는 공식 자격증명·문서 확보 후 registry 등록 방식으로 추가된다. 그 전까지 전환은 mock postback으로만 들어온다.
4. **시드 크리에이터 귀속은 정산 불가**: `c-minu` 등 시드 크리에이터로 귀속된 전환은 원장에 기록되지만 지급 대상 계정이 아니다(uuid 프로필만 지급 가능). 데모 콘텐츠 클릭의 정직한 처리다.
5. **환율 미처리**: `currency`는 저장되지만 KRW 단일 가정으로 합산한다.

---

# Phase 1: Backend Foundation & Persistence

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
