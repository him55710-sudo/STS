# STS × TikTok — 크리에이터 온보딩 가속기 (Phase 4)

> **Date**: 2026-08-14 · **Branch**: `claude/sts-production-gap-audit-8uhzw5`
> 감사 문서 Gap 12(TikTok import)를 닫는다. **핵심 STS 피드는 재설계하지 않았다** —
> TikTok은 콘텐츠 유입 경로 하나가 추가된 것이고, 탐지·실루엣·상품 확정·발행은 기존 파이프라인 그대로다.
>
> **공식 API만 사용한다. 스크래핑은 하지 않는다.**

## 확인한 공식 스펙 (구현 전 조사)

이 컨테이너의 egress 정책이 `developers.tiktok.com`을 차단해 문서에 직접 접근하지 못했고,
**우회하지 않았다.** 대신 검색으로 공식 문서 본문을 확보해 아래 사실을 확정하고 코드에 반영했다.

| 항목 | 확인된 스펙 |
|---|---|
| 인증 | `GET https://www.tiktok.com/v2/auth/authorize/` — `client_key`, `scope`, `response_type=code`, `redirect_uri`, `state` |
| PKCE | **web에는 적용되지 않는다** (desktop/iOS/Android 대상). web은 state(CSRF) + 서버 보관 client_secret의 confidential client 모델 |
| 토큰 | `POST https://open.tiktokapis.com/v2/oauth/token/` → `access_token`, `expires_in`, `open_id`, `refresh_expires_in`, `refresh_token`, `scope`, `token_type` |
| 갱신 | 동일 엔드포인트, `grant_type=refresh_token` |
| 영상 목록 | `POST /v2/video/list/` — `create_time` 내림차순, `max_count`·`cursor`·`has_more` 커서 페이지네이션 |
| 영상 조회 | `POST /v2/video/query/` — **커버 이미지 URL TTL 갱신 경로** |
| 사용자 | `GET /v2/user/info/` |
| 필드 | `id`, `title`, `video_description`, `duration`, `cover_image_url`, `share_url`, `embed_link`, `width`, `height`, `create_time` |
| 스코프 | `user.info.basic`(계정 식별), `video.list`(본인 영상 목록) — 그 이상 요구하지 않는다 |

> ⚠️ **Display API는 원본 영상 파일을 제공하지 않는다.** 재생은 `embed_link`/`share_url`로만 가능하고,
> 우리가 분석할 수 있는 정지 이미지는 커버뿐이다. 이 사실이 Phase-1 가져오기 설계를 결정했다.

## 흐름

```
크리에이터 → [TikTok 연결하기] → /api/integrations/tiktok/connect
   state 발급(httpOnly 쿠키) → 공식 인증 화면
      → /api/integrations/tiktok/callback  (state 상수시간 검증 → 서버에서 code↔token 교환)
         → 토큰 AES-256-GCM 암호화 → external_connections (RLS 정책 0개)
   → /create/tiktok : 영상 그리드(다중 선택) → "선택한 N개 가져오기"
      → /api/integrations/tiktok/import
         · /v2/video/query/로 커버 URL 최신화 (만료 대응)
         · 커버 이미지를 우리 스토리지로 복사 (영구 보존)
         · posts.status='draft' 생성 — 자동 발행 절대 없음
   → /create 드래프트 목록 → 커버를 기존 AI 파이프라인에 투입
      → 크리에이터가 exact 상품 확정 → publish_draft_post() → 발행
```

## 파일

| 경로 | 역할 |
|---|---|
| `lib/integrations/tiktok/types.ts` | 공식 엔드포인트·스코프·필드 상수 + 응답 타입 |
| `lib/integrations/tiktok/oauth-core.ts` | 순수 로직: state 생성/상수시간 검증, 인증 URL 조립, 토큰 암복호화, 모드 게이팅 (테스트 대상) |
| `lib/integrations/tiktok/oauth.ts` | `server-only` 진입점 — core 재노출 + 토큰 교환/갱신 네트워크 호출 |
| `lib/integrations/tiktok/client.ts` | `server-only` — Display API 호출(list/query/user info), 연결 저장·조회, 만료 시 자동 refresh, mock 데이터 |
| `lib/integrations/tiktok/providers`… | (없음 — 제휴 provider와 무관) |
| `app/api/integrations/tiktok/{connect,callback,videos,import}/route.ts` | 라우트 4종 |
| `app/create/tiktok/page.tsx` | 연결 안내 → 영상 그리드 다중 선택 → 가져오기 |
| `lib/backend/drafts.ts` | 드래프트 조회/발행/삭제, 커버 URL→dataURL, 연결 상태 조회 |

## 보안 — 토큰이 클라이언트로 가지 않는 방법

1. **`external_connections`는 RLS 활성 + 정책 0개** → PostgREST 경로로는 어떤 역할도 읽거나 쓸 수 없다.
   (SQL 실측: `rows_visible_via_rls = 0`)
2. 접근은 **서버 시크릿을 요구하는 SECURITY DEFINER RPC**뿐 (`upsert/get/delete_external_connection`).
   잘못된 시크릿은 `28000`으로 거절된다 (실측 확인).
3. 토큰 값 자체가 **AES-256-GCM 암호문**으로 저장된다 (`TIKTOK_TOKEN_ENC_KEY`, 서버 전용).
   자격증명이 설정됐는데 키가 없으면 **기동을 거부**한다.
4. 클라이언트가 볼 수 있는 것은 `my_connection_status()` RPC가 주는 **연결 여부·스코프·만료시각뿐** —
   토큰 필드가 응답 스키마에 존재하지 않는다 (실측 확인).
5. `client_secret`은 인증 URL에 실리지 않고 서버 토큰 교환에만 쓰인다 (테스트로 강제).
6. 모든 TikTok 환경변수는 `NEXT_PUBLIC_` 접두사가 없어 클라이언트 번들에 포함될 수 없다.

## 커버 이미지 만료 처리

TikTok의 `cover_image_url`은 만료되는 서명 URL이다. 우리는 두 겹으로 대응한다:

1. 가져오기 직전에 **공식 `/v2/video/query/`로 최신 URL을 재조회**한다 (문서가 안내하는 지원 경로 —
   URL을 추측하거나 조작하지 않는다).
2. 받은 커버를 **우리 스토리지(`post-media`)로 복사**하고 `post_media.storage_url`에 기록한다.
   발행된 콘텐츠는 TikTok URL 만료와 무관하게 계속 렌더된다.
   원본 `cover_image_url`은 `tiktok_video_imports`에 audit용으로 남는다.

## 스키마

```
external_connections            tiktok_video_imports
  user_id → profiles              user_id, post_id → posts
  provider ('tiktok')             provider_video_id (user별 unique)
  provider_user_id (open_id)      title, video_description
  access_token_encrypted          share_url, embed_link
  refresh_token_encrypted         cover_image_url (원본·만료됨)
  expires_at,                     cover_stored_path (우리 복사본)
  refresh_expires_at              duration, width, height, create_time
  scopes text[]                   imported_at
  ── RLS 정책 0개 ──              ── 본인 행만 RLS 허용 ──
```

영상 메타데이터는 기존 스키마와도 맞물린다: `post_media.external_embed_url`(embed_link),
`width`/`height`/`duration`, `posts.source='import_tiktok'`, `posts.source_external_id`(영상 id).

## 검증 결과

- **단위 테스트 15개 추가 (전체 50/50 통과)**: 공식 엔드포인트/스코프 상수 일치, 인증 URL 파라미터,
  **client_secret 미노출**, 원본 영상 다운로드 필드를 요청하지 않음, state 랜덤성·불일치/길이차 거절,
  토큰 암복호화 왕복·평문 미포함·IV 랜덤화·GCM 변조 감지·형식 오류 거절, 키 누락 시 기동 거부,
  **실 자격증명이 있으면 mock이 가로채지 못함**, 프로덕션에서 자격증명 없으면 통합 비활성.
- **SQL 실측**: 잘못된 서버 시크릿 거절 · 연결 저장 성공 · `external_connections` RLS 노출 0행 ·
  상태 RPC에 토큰 없음 · 드래프트가 익명에게 안 보임(자동 발행 없음) · `publish_draft_post`로
  draft→published 전이(폴리곤 보존, `exact` + `verified_by` 스탬프) · **남의 드래프트 발행 거절**.
- **HTTP 실측**: `videos` GET 미로그인 401 · `import` 401 · `connect` 미로그인 → `/login?next=/create/tiktok` ·
  `/create`, `/create/tiktok` 200.
- `tsc --noEmit` · `next build` 클린 (23 routes).

## 블로커 — 정직 보고

**TikTok 앱 자격증명이 없어 실연동은 미검증이다.** 구조는 프로덕션 준비 상태이고, 아래가 채워지면
어댑터 수정 없이 즉시 활성화된다.

1. **TikTok for Developers 앱 등록 + 심사** (외부 소요, 수일~수주)
   - Login Kit + Display API 제품 추가, `user.info.basic`·`video.list` 스코프 승인
   - 리다이렉트 URI 등록: `https://sts-mongben.vercel.app/api/integrations/tiktok/callback`
   - 심사 전에는 sandbox 계정으로만 호출 가능
2. **환경변수 설정** (전부 서버 전용):
   `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`,
   `TIKTOK_TOKEN_ENC_KEY`(`openssl rand -hex 32`), `TIKTOK_SERVER_SECRET`
3. **DB 서버 시크릿 교체**: `update provider_secrets set secret='<값>' where provider='tiktok-server';`
4. **egress**: 이 개발 컨테이너는 `developers.tiktok.com`·`open.tiktokapis.com`을 차단한다.
   실호출 검증은 배포 환경에서만 가능하다.

그때까지는 **mock 모드**(`TIKTOK_MOCK_MODE=true` 또는 데모 모드)로 전체 아키텍처가 동작한다.
mock은 시드 사진을 커버로 쓰는 가짜 영상 6건을 제공하며, **UI에 "데모 모드" 배지가 항상 표시**되고
**프로덕션(데모 off)에서는 자동으로 비활성**된다 — 가짜 성공을 프로덕션인 척하지 않는다.

## 남은 한계

- **커버 스틸 1장만 분석한다.** 영상 중간에만 등장하는 상품은 놓친다. 원본 영상 분석이 필요하면
  UI가 크리에이터에게 직접 업로드를 안내한다(구현됨). keyframe 추출은 ffmpeg 워커가 필요해
  Next.js 요청 핸들러 밖의 인프라를 요구하며, 다음 단계로 남긴다.
- 가져온 드래프트의 카테고리는 `fashion` 기본값이다 (확정 시 첫 객체 카테고리로 갱신).
- 영상 재게시가 아니라 **커버 이미지 기반 STS 콘텐츠 생성**이다. `embed_link`는 보존되어 있어
  향후 원본 임베드 표시에 쓸 수 있다.
