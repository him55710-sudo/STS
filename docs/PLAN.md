# STS — 구현 계획 (Plan)

> **Commerce must be invisible until intent appears.**
> 기준: `Visual Commerce PRD v1.0` + 통합 사업계획서(2026-08) + 이후 7개 구현 단계의 실측 결과.
>
> 이 문서는 **현재 계획**이다. 초기 Phase 0(목업 프로토타입) 계획은 §8에 이력으로만 남긴다.

## 1. 제품 정의

```
콘텐츠 감상 → (사고 싶을 때) 오브젝트 탭 → Product Sheet → 구매 → 크리에이터 수익 귀속
```

세 가지가 동시에 참이어야 한다:

1. **소셜 플랫폼이다** — 사람들은 스타일을 공유하러 온다. 팔러 오는 게 아니다.
2. **Object-first** — 상품 버튼이 아니라 화면 속 객체 자체가 인터페이스다.
3. **AI assists, Creator confirms** — AI는 후보를 제시하고, exact SKU는 크리에이터가 확정한다.

## 2. 제품 표면

| Surface | 화면 | 상태 |
|---|---|---|
| **Viewer (공개)** | Home Feed(For You/Following), Object Tap, Product Sheet, Discover, Saved, Creator Profile(Posts/Shop), Post permalink | 구현됨 |
| **Creator (비공개)** | 업로드 / TikTok 임포트 → AI 탐지 → 후보 매칭 → exact/similar 확정 → 발행, Studio, 수익 | 구현됨 |
| **운영 `/admin`** | 개요 · 상품 · 제휴 · 정산 · 연동 · 신뢰 6개 섹션 | 구현됨 |

**제외**: 자체 결제·배송·재고, DM, Live, AR.

## 3. 기술 스택 (현재)

| Layer | 선택 | 근거 |
|---|---|---|
| Web | Next.js 16 App Router + TypeScript | `proxy.ts`(middleware 대체), async `params` |
| Styling | Tailwind CSS v4 | 디자인 토큰 CSS 변수 |
| DB | Supabase Postgres, 전 테이블 RLS | 서버리스 친화 + 행 단위 권한 |
| 권한 | **anon 키 + RLS만.** service_role 키 없음 | 유출 표면 자체를 만들지 않는다 |
| 서버 권한 작업 | `provider_secrets` 대조 SECURITY DEFINER RPC | webhook·토큰 저장 등 |
| 상태 | Zustand — UI/데모만 persist | 금전·소셜 진실은 서버에서 읽는다 |
| AI 탐지 | Letsur → Gemini → mock 3단 폴백 | 키 없으면 정직하게 `source: "mock"` |
| 랭킹 | 결정적 v1 (taste-profile + feed-ranker) | 재현 가능·설명 가능 |
| 테스트 | `tsx --test` + Playwright | 107 단위 + 17 UI 스모크 |
| 배포 | Vercel | |

> 초기 계획에서 "Phase 2+"로 미뤘던 Supabase·추천은 이미 들어왔다.
> 여전히 하지 않는 것: 네이티브 앱 우선 개발, ML 사기 탐지, 자체 결제.

## 4. 디자인 시스템

- 키워드: **Quiet Luxury × Visual Discovery × AI Native**
- Background `#F5F6F7` / Surface `#FFFFFF` / Secondary Surface `#ECEEF0` / Ink `#151719`
- Secondary text `#6C7075` / Border `#DFE2E5` / Accent `#77727F`
- UI 90% 무채색, 콘텐츠 원본색 유지
- 폰트: Pretendard Variable(한글) + Inter fallback
- Radius: 버튼 10–12 / 카드 12–16 / Bottom Sheet 상단 20–24 / 상품 이미지 8–12
- 모션: Object select 150–180ms, Bottom sheet 220–280ms, 화려한 로딩 금지
- Object highlight: **탐지 박스 금지** → 실루엣 마스크(5–6% opacity) + 1.25–1.75px 아웃라인
- 기준 뷰포트: 모바일 360–430px (가로 오버플로 0px)

## 5. Object Tap UX 스펙

1. **Idle** — 아무 표시 없음. 가격도, 배지도, 상품 수도 없다.
2. **콘텐츠 탭** — shoppable object가 ~850ms 은은하게 하이라이트되고 사라진다.
3. **오브젝트 탭** — 폴리곤 히트테스트 → 선택 아웃라인 + Product Sheet.
4. **Product Sheet** — 착용 상품 → 대표 판매처 CTA → 다른 판매처 → 비슷한 스타일 → 제휴 고지.
5. AI 실패는 정상 상황 — "AI Detection Failed" 대신 수동 추가를 유도한다.

## 6. 불변 규칙 (구현 시 양보 불가)

전문은 [`COMMERCE_INTEGRITY.md`](COMMERCE_INTEGRITY.md). 요약:

1. 공개 기본 표면에 가격·수수료·구매 CTA·상품 수 배지를 두지 않는다.
2. exact 상품은 **절대** 광고가 될 수 없다. 광고는 similar 슬롯 + "Sponsored" 라벨만.
3. 크리에이터 확정 없이 exact 링크를 저장하지 않는다 (DB 제약으로 강제).
4. 모든 아웃바운드는 `/go/[offerId]`를 경유한다. 판매처 직행 링크를 만들지 않는다.
5. 표본이 없으면 0%가 아니라 "데이터 없음"이다. 가짜 수치를 만들지 않는다.
6. service_role 키·제휴 시크릿·TikTok 토큰은 클라이언트로 나가지 않는다.
7. 수수료는 랭킹의 주요 축이 될 수 없다 (로드 시점 불변식 assert로 강제).

## 7. 검증 방식 (PDCA)

- **Check** = ① `npx tsc --noEmit` ② `npm test` ③ `npm run build`
  ④ Supabase에서 역할별(anon/creator/viewer/admin) RLS 실측
  ⑤ Playwright로 360–430px 실기 검수
- 이그레스 제한으로 HTTP 왕복이 불가한 구간은 **SQL 계층에서 동일 RPC를 직접 호출해** 검증하고,
  무엇을 검증하지 못했는지 리포트에 남긴다. 검증하지 못한 것을 "완료"로 쓰지 않는다.
- 사이클 로그: [`PDCA.md`](PDCA.md)

## 8. 이력 — 초기 Phase 0 계획 (완료·대체됨)

초기 MVP는 "목업 좌표 기반 UI 프로토타입 + localStorage 상태 + Admin lite"였고,
Supabase·추천·제휴 어트리뷰션은 Phase 2+로 미뤄져 있었다. 그 단계는 종료되었으며
현재 아키텍처가 이를 대체한다. 초기 KPI 목표(OTR ≥ 4%, 태깅 < 60초, Card→Outbound ≥ 35%)는
여전히 유효한 관찰 지표이나, **실 트래픽 전에는 추정치를 만들어 채우지 않는다.**

## 9. 다음 단계

[`PRODUCTION_IMPLEMENTATION_REPORT.md`](PRODUCTION_IMPLEMENTATION_REPORT.md) 마지막 절의
"다음 5개 고레버리지 과제" 참조.
