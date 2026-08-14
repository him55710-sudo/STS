# STS — Commerce-Native Social Platform

**Live**: https://sts-mongben.vercel.app (GitHub 연동 자동 배포)

> **Commerce must be invisible until intent appears.**
> 사람들이 스타일을 공유하러 오는 소셜 플랫폼. 사고 싶어졌을 때만 상거래가 나타난다.
> AI가 사진 속 물건을 탐지하고, **크리에이터가 정확한 SKU를 확정**하며, 뷰어가 물건을 탭하면
> 구매 경로가 열리고, 그 구매는 크리에이터에게 귀속된다.

상세 계획 [`docs/PLAN.md`](docs/PLAN.md) · 사업 구조 [`docs/BUSINESS.md`](docs/BUSINESS.md) ·
제품 원칙 [`docs/COMMERCE_INTEGRITY.md`](docs/COMMERCE_INTEGRITY.md) ·
구현 현황 [`docs/PRODUCTION_IMPLEMENTATION_REPORT.md`](docs/PRODUCTION_IMPLEMENTATION_REPORT.md)

## 핵심 경험

```
콘텐츠 감상 → (사고 싶을 때) 오브젝트 탭 → Product Sheet → 구매 → 크리에이터 수익 귀속
```

기본 피드에는 가격도, 수수료도, 구매 버튼도, "상품 N개" 배지도 없다. 상거래는
**의도가 나타난 뒤에만** 등장한다. 이 규칙은 [`docs/COMMERCE_INTEGRITY.md`](docs/COMMERCE_INTEGRITY.md)의
5개 불변 규칙으로 고정되어 있고, 테스트가 이를 강제한다.

- **Feed** — 깨끗한 콘텐츠가 기본. 탭하면 shoppable object가 ~850ms 은은하게 하이라이트되고,
  물건을 직접 탭해야 Product Sheet가 열린다 (실루엣 마스크 + 1~1.5px 아웃라인, 탐지 박스 금지).
- **Product Sheet** — 착용 상품(exact) → 대표 판매처 CTA → 다른 판매처 → 비슷한 스타일 → 제휴 고지.
  **exact와 similar는 절대 섞이지 않고, exact는 절대 광고가 될 수 없다.**
- **Create** — 업로드/TikTok 임포트 → AI 객체 탐지 → 후보 검색 → **크리에이터가 exact/similar 확정** → 발행.
  확정 없이는 exact 링크가 DB 제약(`exact_requires_verifier`)에 의해 저장되지 않는다.
- **Creator Studio (비공개)** — GMV·전환·수익·정산. 공개 프로필에는 수익 정보가 노출되지 않는다.
- **운영 콘솔 `/admin`** — 개요 / 상품 / 제휴 / 정산 / 연동 / 신뢰 6개 섹션.

## 아키텍처

| Layer | 구현 |
|---|---|
| Web | Next.js 16 App Router + TypeScript + Tailwind CSS v4 (`proxy.ts`, async `params`) |
| DB | Supabase Postgres — **모든 테이블 RLS**, 20+ 테이블, 10개 마이그레이션 |
| 권한 | **anon/publishable 키 + RLS만 사용. service_role 키는 코드 어디에도 없다.** |
| 서버 권한 작업 | `provider_secrets`(RLS on·정책 0개) 대조를 통과한 SECURITY DEFINER RPC |
| 상태 | Zustand — UI/데모 상태만 persist. 금전·소셜 진실은 항상 서버에서 읽는다 |
| 어트리뷰션 | `/go/[offerId]` 서버 라우트 단일 관문 + 1st-party `sts_anon_id` 쿠키 |
| 정산 | `conversions` → `creator_ledger_entries`, 멱등 `ingest_conversion` RPC |
| 랭킹 | 결정적 v1 — `taste-profile.ts` + `feed-ranker.ts` (수수료는 주요 축이 아니다) |
| 사기 방지 | 결정적 규칙 4종 (`lib/integrity/fraud.ts`) — ML 없음 |
| 테스트 | `tsx --test` 107개 + Playwright UI 스모크 17개 |

### 절대 규칙

1. **service_role 키를 클라이언트에 두지 않는다.** 전 구간 anon + RLS.
2. **TikTok 토큰·제휴 시크릿은 클라이언트로 나가지 않는다.** `external_connections`는 RLS on + 정책 0개라 어떤 클라이언트 역할도 읽지 못한다.
3. **중복 webhook은 중복 수익을 만들 수 없다.** `(provider, external_conversion_id)` 유니크 + 전이 규칙.
4. **exact 상품은 광고가 될 수 없다.** 광고는 similar 슬롯에만, "Sponsored" 라벨과 함께.
5. **가짜 수치를 만들지 않는다.** 표본이 없으면 0%가 아니라 "데이터 없음"으로 표시한다.

## 실행

```bash
npm install
cp .env.example .env.local   # 값을 채운다
npm run dev
```

백엔드 환경변수가 없으면 앱은 **데모 모드**(`NEXT_PUBLIC_DEMO_MODE=true`)로 완전히 동작한다.
단, 백엔드가 설정된 프로덕션에서는 **가짜 로그인 성공이 절대 허용되지 않는다**.

```bash
npm test          # 단위 테스트 107개
npx tsc --noEmit  # 타입 체크
npm run build     # 프로덕션 빌드
```

### DB 마이그레이션

`supabase/migrations/` 를 순서대로 적용한다 (Supabase CLI 또는 대시보드 SQL 에디터).
적용 후 운영 시크릿 교체는 [`.env.example`](.env.example)의 "운영 전환 전 반드시 교체" 항목 참조.

## 현재 상태 (2026-08-14)

| 영역 | 상태 |
|---|---|
| 콘텐츠 영속화 · 소셜 · 랭킹 | **REAL** — 서버 권위, RLS 검증 완료 |
| 커머스 그래프 · 오퍼 랭킹 | **REAL** (시드 카탈로그 39개 상품 / 48개 오퍼) |
| 클릭 어트리뷰션 · 전환 · 정산 원장 | **REAL** — 단, 실 제휴사 연동은 mock provider |
| 제휴 provider (Coupang/LinkPrice 등) | **BLOCKED BY CREDENTIALS** — 어댑터 경계만 준비됨 |
| TikTok 임포트 | **BLOCKED BY CREDENTIALS** — 아키텍처 완성 + mock 모드 검증 |
| AI 객체 탐지 | **BLOCKED BY CREDENTIALS** — 비전 키 없으면 정직하게 `source: "mock"` 반환 |

전체 분류는 [`docs/PRODUCTION_IMPLEMENTATION_REPORT.md`](docs/PRODUCTION_IMPLEMENTATION_REPORT.md).

## 데모 데이터 안내

- 콘텐츠는 전부 실사 사진, 상품은 전부 실존 제품이다.
- 룩 게시물 10종 (남성 5 · 여성 5), 시드 카탈로그 39개 canonical 상품 / 48개 오퍼 / 32개 판매처.
- 시드 팔로워 수는 UI 시연용 가정값이다. **수익·전환 수치는 가정하지 않는다** —
  실 데이터가 없으면 "데이터 없음"으로 표시한다.

## 디자인 시스템

- **Quiet Luxury × Visual Discovery × AI Native** — UI의 90%는 무채색, 가장 화려한 것은 콘텐츠
- Background `#F5F6F7` · Ink `#151719` · Secondary `#6C7075` · Border `#DFE2E5` · Accent `#77727F`
- Object highlight: 마스크 5~6% opacity + 1.25~1.75px 아웃라인, 화려한 로딩 애니메이션 금지
- 모바일 360–430px 기준 설계 (가로 오버플로 0px 검증됨)
