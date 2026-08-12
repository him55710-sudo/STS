# OBJET — AI Visual Commerce Platform

> **See it. Tap it. Shop it.**
> 사진과 영상 속 **물건 자체를 탭하면** AI가 상품을 인식해 상품 정보·유사상품·구매 링크를 즉시 제공하는 Visual Commerce 플랫폼의 MVP 웹앱.

PRD v1.0 + 통합 사업계획서(2026-08) 기반 구현. 상세 계획은 [`docs/PLAN.md`](docs/PLAN.md), 개발 로그는 [`docs/PDCA.md`](docs/PDCA.md) 참고.

## 핵심 경험

```
Content view → Object tap → Product card → Outbound purchase → Creator reward
```

- **Feed**: 깨끗한 콘텐츠가 기본. 화면을 탭하면 shoppable object가 850ms 은은하게 하이라이트되고, 물건을 직접 탭하면 Product Bottom Sheet가 열립니다 (mask + 1px outline, bounding box 금지 — PRD §39).
- **Product Sheet**: 브랜드·가격·판매처·제휴 표시·**동일/유사 상품 구분 배지**·유사 상품·저장·구매 CTA 하나.
- **Create (AI 태깅)**: 업로드 → Gemini 비전 모델이 상품 객체 탐지 → AI 후보 자동 매칭 → 크리에이터가 검색/URL로 확정(exact/similar) → 발행. 목표 60초 이내.
- **Analytics**: `조회 → 오브젝트 탭 → 상품 카드 → 구매처 이동 → 구매(추정)` 퍼널, OTR(Object Tap Rate) 최상단 배치.
- **Admin(lite)**: 콘텐츠/AI 처리 상태, 이벤트 로그.

## 기술 스택

| Layer | Tech |
|---|---|
| Web | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| 상태 | Zustand (localStorage persist) |
| AI 탐지 | Gemini (`/api/detect`, 서버 라우트) — 키 없으면 mock fallback |
| 이벤트 | 자체 event taxonomy (asset_view / object_tap / card_open / outbound_click …) |
| 배포 | Vercel |

## 실행

```bash
npm install
npm run dev
```

AI 탐지를 실제로 사용하려면:

```bash
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY 입력
```

키가 없어도 앱은 데모 탐지 모드로 완전히 동작합니다 (AI 실패는 정상 상황 — PRD §56).

## Vercel 배포

1. 이 저장소를 GitHub에 push
2. [vercel.com/new](https://vercel.com/new)에서 저장소 import (기본 Next.js 설정 그대로)
3. Environment Variables에 `GEMINI_API_KEY` 추가 (선택)
4. Deploy

## 데모 데이터 안내

콘텐츠 이미지·상품 이미지는 저장소에 포함된 **에디토리얼 SVG 일러스트**이고, 브랜드·상품·가격·크리에이터는 모두 **가상의 데모 데이터**입니다. 판매처 링크는 시연을 위해 각 커머스 홈으로 연결됩니다. 시드 애널리틱스 수치는 UI 시연용 가정값입니다.

## 디자인 시스템 (PRD §34–45)

- **Quiet Luxury × Visual Discovery × AI Native** — UI의 90%는 무채색, 가장 화려한 것은 콘텐츠
- Background `#F5F6F7` · Ink `#151719` · Secondary `#6C7075` · Border `#DFE2E5` · Accent `#77727F`
- Object highlight: mask 7–10% opacity + 1–1.5px outline, 화려한 로딩 애니메이션 금지
- Bottom sheet 220–280ms, object select 150–180ms
