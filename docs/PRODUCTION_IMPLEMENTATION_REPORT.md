# STS Production Implementation Report

> 최신 단계가 위에 온다. Phase 2(상품 그래프)는 [`COMMERCE_GRAPH.md`](./COMMERCE_GRAPH.md),
> Phase 4(TikTok 온보딩)는 [`TIKTOK_INTEGRATION.md`](./TIKTOK_INTEGRATION.md) 참조.

---

# Phase 7: Business MVP 통합 감사 (최종)

> **Date**: 2026-08-14 · **Branch**: `claude/sts-production-gap-audit-8uhzw5`
> 운영 콘솔 6개 섹션 · 결정적 사기 방지 4종 · 비즈니스 E2E 스모크 · TikTok 아키텍처 별도 검증.

## 1. 기능 분류 — REAL / MOCK / PARTIAL / BLOCKED BY CREDENTIALS

분류 기준:
- **REAL** — 프로덕션 경로가 그대로 동작하고, 실 데이터로 검증됨
- **PARTIAL** — 핵심은 동작하나 일부 구간이 미구현이거나 검증되지 못함
- **MOCK** — 의도적으로 시드/모의 데이터로 동작 (실 데이터 소스 미연결)
- **BLOCKED BY CREDENTIALS** — 코드는 완성됐으나 자격증명이 없어 실 경로를 실행할 수 없음

### 콘텐츠 · 소셜

| 기능 | 분류 | 근거 |
|---|---|---|
| 인증 (Supabase OAuth/이메일) | **PARTIAL** | 라우트·세션·RLS 배선 완료. 이 컨테이너에서는 이그레스 차단으로 브라우저 로그인 왕복 미검증. 프로덕션 모드에서 가짜 로그인은 불가능 |
| 게시물 영속화 (`publish_post`) | **REAL** | 실 DB에서 게시물·오브젝트·exact 링크 생성 검증 |
| 미디어 스토리지 | **REAL** | `post-media` 버킷 + 본인 폴더 정책. 업로드 왕복은 이그레스 차단으로 미검증 |
| 팔로우·좋아요·저장·댓글·공유 | **REAL** | 서버 권위 테이블 + RLS. localStorage는 더 이상 진실이 아님 |
| 게시물 공개 URL (`/post/[id]`) | **REAL** | |
| 관심없음/숨기기 (부정 신호) | **REAL** | `content_feedback` |
| Following 시간순 피드 | **REAL** | |
| For You 결정적 랭킹 v1 | **REAL** | 순수 함수 + 로드 시점 불변식 assert (수수료 가중치 < 모든 다른 축) |
| DM | **미구현 (의도)** | 메시지 컨트롤은 "준비 중" 비활성 상태로 표기 |

### 커머스

| 기능 | 분류 | 근거 |
|---|---|---|
| 커머스 그래프 (canonical/merchant/offer) | **REAL** (데이터는 **MOCK**) | 스키마·조회는 실제. 카탈로그 39상품/48오퍼/32판매처는 **시드 데이터** |
| 오퍼 랭킹 (7축) | **REAL** | 수수료 가중치 상한이 테스트로 강제됨 |
| Product Sheet (exact→CTA→다른 판매처→similar→고지) | **REAL** | 브라우저 스모크 17/17 |
| Sponsored Similar | **REAL** (인벤토리는 **MOCK**) | 라벨 강제·exact 오염 불가. 실 광고주 없음 |
| `/go/[offerId]` 클릭 어트리뷰션 | **REAL** | 303 리다이렉트 + httpOnly 1st-party 쿠키 + 클릭 행 검증 |
| 전환 수신 (`ingest_conversion`) | **REAL** | 멱등성·상태 전이·시크릿 검증 실측 |
| 크리에이터 원장 | **REAL** | 전환 1건당 1행, 합계 불변식 check |
| 제휴 provider 어댑터 | **MOCK** | `mock-provider`만 존재. 추적 URL은 네이버 쇼핑 검색 딥링크 |
| **실 제휴 네트워크 (Coupang/LinkPrice/Gmarket 등)** | **BLOCKED BY CREDENTIALS** | 어댑터 경계(`types`/`registry`/`parseConversion`)만 준비. 엔드포인트를 지어내지 않았음 |
| 지급(payout) 실행 | **미구현** | 원장 `payable`까지. 실제 송금 연동 없음 |

### AI · 통합

| 기능 | 분류 | 근거 |
|---|---|---|
| 객체 탐지 (Letsur/Gemini) | **BLOCKED BY CREDENTIALS** | 키 미설정 → `/api/vision-health`의 `activeChain: []`. `/api/detect`는 `source: "mock"`을 **정직하게 명시**해 반환 |
| 폴리곤 세그멘테이션 | **PARTIAL** | 시드 게시물 폴리곤은 실측 마스크. 신규 업로드는 비전 키 필요 |
| 상품 후보 검색 (네이버) | **BLOCKED BY CREDENTIALS** | 쇼핑 검색 API는 2026-07-31 종료 확인. 이미지 검색은 키 필요 |
| TikTok 임포트 | **BLOCKED BY CREDENTIALS** | 앱 자격증명·심사 미확보. 아키텍처 + mock 모드 검증 완료 (아래 §4) |

### 운영 · 신뢰

| 기능 | 분류 | 근거 |
|---|---|---|
| `/admin` 6개 섹션 | **REAL** | 개요·상품·제휴·정산·연동·신뢰. 관리자 아니면 빈 결과 |
| `admin_overview` RPC | **REAL** | 관리자 전용, 21개 지표 |
| 사기 플래그 4종 | **REAL** | 실 DB에서 self_click·click_burst·duplicate_callback 발생 확인 |
| 무결성 지표 4종 | **REAL** | 표본 없으면 "데이터 없음" (0%로 위장하지 않음) |
| **신고(Report) 기능** | **미구현** | 신뢰 탭에 "미구현"으로 명시. 사기 플래그와 혼동시키지 않음 |
| 제휴 provider 헬스 | **PARTIAL** | mock은 실제 상태, 나머지는 "자격증명 대기"로 표시 |

## 2. 이번 단계에서 고친 진짜 결함

| # | 결함 | 영향 | 수정 |
|---|---|---|---|
| 1 | `record_commerce_click`이 SECURITY INVOKER인데 `fraud_flags`에 INSERT 정책이 없음 | **자기 클릭·버스트가 걸리는 순간 클릭 삽입 전체가 42501로 실패 → 클릭 유실(= 수익 유실)** | SECURITY DEFINER로 전환하되, RLS가 보장하던 신원 불변식(`viewer_id = auth.uid()`)을 함수 안에서 명시 검사 |
| 2 | 같은 함수의 버스트 카운트가 invoker 권한으로 `commerce_clicks`를 조회 | SELECT 정책상 일반 뷰어에게 항상 0 → **버스트 규칙이 아예 동작하지 않음** | #1과 함께 해소 (definer로 정확히 집계) |
| 3 | 모든 구매 CTA가 `window.open()` | 카카오톡·인스타 인앱 브라우저가 차단하면 **"눌렀는데 아무 일도 안 일어남"** — 매출 경로의 가장 비싼 실패 | 전 아웃바운드를 실제 `<a href target=_blank rel=noopener noreferrer>`로 전환 (`/go` 경유는 그대로) |
| 4 | 오퍼 없는 Sponsored 상품이 `href="#"`로 렌더될 수 있었음 | 미귀속 아웃바운드 / 죽은 링크 | 오퍼가 없으면 광고 슬롯 자체를 렌더하지 않음 |
| 5 | 표본 0건일 때 `creatorRetention`이 0으로 계산돼 "주의" 경고 | **데이터 없음을 나쁨으로 표시하는 가짜 신호** | 지표를 `number \| null`로 바꾸고 `status: "no_data"` 추가, UI는 "데이터 없음" 표시 |

`@ts-ignore`·`any`로 덮은 곳은 없다. 타입 체크는 무수정 통과한다.

## 3. 비즈니스 E2E 스모크 결과

| # | 단계 | 결과 | 검증 방식 |
|---|---|---|---|
| 1 | 크리에이터 로그인 | **PARTIAL** | 세션/RLS는 실 DB에서 역할 시뮬레이션으로 검증. 브라우저 OAuth 왕복은 이그레스 차단 |
| 2 | 콘텐츠 업로드/임포트 | ✅ | `publish_post` / TikTok 드래프트 경로 |
| 3 | AI 객체 탐지 | ⚠️ **mock** | 비전 키 없음 → `source: "mock"` 명시 반환 |
| 4 | 크리에이터 exact SKU 확정 | ✅ | 기본값은 `similar`. 확정 없는 exact는 `exact_requires_verifier`로 저장 불가 (실측) |
| 5 | 서버 영속화 | ✅ | post/object/link 생성 확인 |
| 6 | 뷰어 피드 열람 | ✅ | 익명 역할로 발행 게시물 조회 확인 |
| 7 | **기본 상태에 커머스 비노출** | ✅ | 가격 노드 0개, 수수료·구매·상품수 문구 0건 |
| 8 | 오브젝트 탭 | ✅ | idle → 힌트 실루엣 → 오브젝트 선택 |
| 9 | Product Sheet | ✅ | 5개 구획 순서 + 하단 고지 |
| 10 | Buy → `/go` | ✅ | 모든 아웃바운드 앵커가 `/go/` 시작 |
| 11 | 클릭 어트리뷰션 저장 | ✅ | 303 + httpOnly 쿠키 + `commerce_clicks` 행 |
| 12 | mock 전환 콜백 | ✅ | 3회 중복 전송 → 전환 1행 |
| 13 | 원장 생성 | ✅ | creator 8,400 / platform 3,600 (12,000의 0.7) |
| 14 | 크리에이터 수익 갱신 | ✅ | 크리에이터 본인만 조회 가능, 반품분 제외 |
| 15 | 관리자가 클릭/전환/원장 확인 | ✅ | 클릭 9 · 전환 2 · 원장 2 · 플래그 3 |

**역할별 격리 실측**: 뷰어·익명은 원장·전환·클릭·시크릿 **전부 0건**. 크리에이터는 본인 것만.
사기 플래그는 관리자에게만 보인다(회피 학습 방지).

### 사기 방지 실측

| 규칙 | 시나리오 | 결과 |
|---|---|---|
| `self_click` | 크리에이터가 자기 상품 클릭 | 플래그 생성, 클릭은 정상 진행 |
| `click_burst` | 같은 뷰어가 60초 내 같은 오퍼 6회 | 6번째에 플래그 |
| `duplicate_callback` | 동일 전환 재전송 | info 플래그, **중복 수익 없음** |
| `conversion_replay` | 90일 초과 / 금액 변경 | warn / critical (단위 테스트) |
| (신원 위조) | 뷰어가 타인 uid로 클릭 생성 시도 | **42501 거절** |
| (시크릿 위조) | 잘못된 시크릿으로 전환/플래그/연결 저장 | **28000 거절** |

## 4. TikTok 임포트 아키텍처 (별도 검증)

실 TikTok 호출 없이 mock 데이터로 전 구간을 확인했다.

| 검증 | 결과 |
|---|---|
| 연결 저장은 서버 시크릿 필요 | ✅ 잘못된 시크릿 28000 거절 |
| 토큰 테이블 클라이언트 노출 | ✅ RLS on + **정책 0개** → 어떤 역할도 못 읽음 |
| 임포트는 드래프트로만 생성 | ✅ `status='draft'`, `source='import_tiktok'` |
| 드래프트 공개 노출 | ✅ 익명에게 0건 |
| 확정 후 발행 | ✅ `publish_draft_post` → published + `verified_by` 기록 |
| 라우트 4종 인증 | ✅ connect 307→login · videos 401 · import 405(GET) · callback state 불일치 거절 |
| 클라이언트 번들 시크릿 유출 | ✅ `TIKTOK_CLIENT_SECRET`·`POSTBACK_SECRET`·`service_role` 모두 0건 |
| 단위 테스트 | ✅ 14/14 (암복호화·state·"자격증명 없으면 프로덕션 비활성") |

**블로커**: TikTok 앱 자격증명·심사. 확보 전까지 이 통합은 **완료가 아니다.**

## 5. 검증하지 못한 것 (정직한 한계)

이 컨테이너는 `*.supabase.co`·`developers.tiktok.com`·`open.tiktokapis.com` 이그레스가 차단되어 있다.

| 미검증 | 대신 한 것 |
|---|---|
| 브라우저 → Supabase 인증 왕복 | 실 DB에서 역할별 JWT 시뮬레이션으로 RLS 실측 |
| `/api/affiliate/*/postback` HTTP 왕복 | 라우트가 호출하는 `ingest_conversion`·`record_fraud_flag` RPC를 동일 인자로 직접 실행 |
| 미디어 업로드 왕복 | 버킷 정책 SQL 검증 |
| TikTok 실 API 응답 | 공식 문서 대조 + mock 모드 |

이그레스를 우회하지 않았고, 미검증 항목을 "완료"로 적지 않았다.

## 6. 관측된 제품 신호

시드 콘텐츠 기준 **오가닉 콘텐츠 비율 0% · 상품 밀집 비율 100%** 다.
즉 현재 데모 데이터는 **모든 게시물이 상품 3개 이상**인 카탈로그에 가깝다.
지표는 정상 동작 중이고, 문제는 데이터 쪽이다 —
"평범한 일상 콘텐츠를 지킨다"는 원칙을 시드부터 지키려면 상품 0~1개인 게시물이 필요하다.
(§8의 과제 3번)

## 7. 검증 명령 결과

```
npx tsc --noEmit   → 통과 (에러 0)
npm test           → 107/107 통과
npm run build      → 성공 (24개 라우트)
Playwright UI 스모크 → 17/17 통과 (360 / 390 / 430px 가로 오버플로 0px)
```

## 8. 다음 5개 고레버리지 과제

1. **제휴 네트워크 1곳 실연동 (쿠팡 파트너스 또는 LinkPrice).**
   지금 막힌 건 코드가 아니라 계약이다. 어댑터 경계는 이미 있으므로 자격증명이 들어오면
   `parseConversion` 하나만 구현하면 된다. **이것 없이는 매출이 0원이다.**
2. **지급(payout) 파이프라인.** 원장은 `payable`까지 계산하지만 실제로 돈이 나가지 않는다.
   첫 정산일에 송금이 안 되면 크리에이터는 두 번 다시 올리지 않는다.
3. **오가닉 콘텐츠 공급 설계.** 상품 밀집 100%는 제품 원칙과 정면으로 충돌한다.
   시드 재구성 + "상품 없는 게시물"을 자연스럽게 만드는 발행 UX가 필요하다.
4. **비전 키 확보 후 탐지 품질 실측.** 지금 탐지는 mock이다.
   exact 확정률·오탐률을 실제로 재기 전까지 "AI가 인식한다"는 주장은 검증되지 않았다.
5. **신고(Report) + 크리에이터 제재 흐름.** 신뢰 탭에 사기 플래그는 있지만 사용자 신고가 없다.
   공개 플랫폼에서 신고 경로 부재는 규모가 커지는 순간 가장 먼저 터진다.

---

# Phase 4: TikTok 크리에이터 온보딩 가속기

공식 API(Login Kit for Web + Display API v2)만으로 크리에이터가 이미 올려둔 TikTok 영상을
STS 드래프트로 가져온다. 스크래핑 없음, 핵심 피드 재설계 없음, 자동 발행 없음.

- 흐름: 연결 → OAuth → 영상 목록 → 다중 선택 → 드래프트 생성 → 커버 AI 분석 → **크리에이터 상품 확정** → 발행
- Display API가 원본 영상 파일을 주지 않으므로 Phase-1은 **커버 스틸**을 분석하고,
  만료되는 커버 URL은 `/v2/video/query/`로 최신화한 뒤 우리 스토리지에 복사해 보존한다.
- 토큰은 RLS 정책이 0개인 `external_connections`에 AES-256-GCM 암호문으로 저장되고,
  서버 시크릿을 요구하는 SECURITY DEFINER RPC로만 접근된다. 클라이언트는 연결 여부만 볼 수 있다.
- **블로커**: TikTok 앱 자격증명·심사 미확보 → mock 모드로 아키텍처만 검증됨(프로덕션에서는 자동 비활성).

상세 스펙 근거·검증 결과·한계는 [`TIKTOK_INTEGRATION.md`](./TIKTOK_INTEGRATION.md)에 있다.

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
