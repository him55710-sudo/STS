# Visual Commerce Platform — 구현 계획 (Plan)

> **See it. Tap it. Shop it.**
> 기준 문서: `Visual Commerce PRD v1.0` + 통합 사업계획서 PDF + 컨셉 영상 (2026-08-12)

## 1. 자료 분석 요약

### 컨셉 영상 (10s)
인스타그램형 피드에서 사용자가 **사진 속 머그컵 자체를 탭** → 상품 태그(상품명·링크) 표시 →
상품 카드(가격 + Buy Now) → 구매 발생 시 **크리에이터 수익 알림**. 핵심 인터랙션 루프:

```
Content view → Object tap → Product card → Outbound purchase → Creator reward
```

### PRD + 사업계획서 핵심 결론
1. **새 SNS를 먼저 만들지 않는다.** Creator tool + Public shoppable page + Affiliate attribution이 MVP.
2. **Object-first**: 상품 버튼이 아니라 화면 속 객체 자체가 인터페이스.
3. **AI assists, Creator confirms**: AI는 후보 제시, exact SKU는 크리에이터가 확정. exact/similar 명확 구분.
4. **Phase 0 = UI 프로토타입 먼저** (mock 좌표), Phase 1 = 이미지 shoppable, 영상은 Phase 2.
5. 초기 KPI: **Object Tap Rate ≥ 4%**, 이미지 1장 태깅 **< 60초**, Card→Outbound ≥ 35%.
6. 기술 아키텍처(§18): 초기에는 **웹/PWA(Next.js) + managed backend**가 가장 빠르다.

## 2. 이번 구현 범위 (MVP — PRD Phase 0 + Phase 1)

사업계획서 §17의 3개 제품 표면을 모두 웹(모바일 우선 반응형)으로 구현:

| Surface | 화면 |
|---|---|
| **Viewer (Public)** | Home Feed(For You/Following), Object Tap + Highlight, Product Bottom Sheet, Discover(검색/카테고리/그리드), Saved(상품/게시물), Creator Profile(Posts/Shop) |
| **Creator Console** | 업로드 → AI 객체 탐지(Gemini) → 객체 편집 → 상품 후보 매칭(exact/similar) → Publish, Analytics 대시보드(views/taps/OTR/outbound/earnings) |
| **Admin (lite)** | 콘텐츠/AI 처리 상태/이벤트 로그 |

**제외 (PRD §9)**: 자체 결제·배송·재고, 브랜드 광고 관리자, Live, AR, DM, 추천 알고리즘.

## 3. 기술 스택

| Layer | 선택 | 근거 |
|---|---|---|
| Web | Next.js (App Router) + TypeScript | PRD §24, 사업계획서 §18 "웹/PWA 최우선" |
| Styling | Tailwind CSS v4 | PRD §24 |
| 상태 | Zustand + localStorage persistence | PRD §23, 서버리스 데모에 적합 |
| AI Detection | Gemini 2.5 Flash (server route, env key) | 세션 제공 키. 키 미설정 시 mock fallback → 데모 항상 동작 |
| 이벤트 | 자체 event taxonomy (asset_view / object_tap / card_open / outbound_click / save) | 사업계획서 §10 |
| 배포 | Vercel | 요구사항 |

> Expo 모바일 앱·Supabase·Mux·pgvector는 PRD의 Phase 2+ 항목으로, 이번 MVP(웹 검증 단계)에서는
> 사업계획서 §22 "90일 동안 하지 않을 것(native 앱부터 만들기)" 원칙에 따라 제외. 웹 앱은 PWA 스타일
> 모바일 뷰포트 중심으로 구현해 추후 Expo 이식 시 UX 스펙을 그대로 재사용한다.

## 4. 디자인 시스템 (PRD §34–45)

- 키워드: **Quiet Luxury × Visual Discovery × AI Native** — 차갑고 정제된, 콘텐츠 중심
- Background `#F5F6F7` / Surface `#FFFFFF` / Secondary Surface `#ECEEF0` / Dark `#151719`
- Secondary text `#6C7075` / Border `#DFE2E5` / Accent(Muted Graphite Violet) `#77727F`
- UI 90% 무채색(채도 0–7%), Accent 채도 8–18%, 콘텐츠 원본색 유지
- 폰트: Pretendard Variable(한글) + Inter 계열 fallback
- Radius: 버튼 10–12 / 카드 12–16 / Bottom Sheet 상단 20–24 / 상품 이미지 8–12
- 모션: Object select 150–180ms, Bottom sheet 220–280ms, 화려한 로딩 금지
- Object highlight: bounding box 금지 → **mask(accent 7–10% opacity) + 1–1.5px outline**
- 참고: Pinterest(디스커버리 그리드), Instagram(피드/스토리 리듬), 에이블리(카테고리 칩·상품 카드·한국형 커머스 톤)

## 5. Object Tap UX 스펙 (PRD §12)

1. **Idle**: 아무 표시 없음 (깨끗한 콘텐츠)
2. **First tap(콘텐츠)**: shoppable object들이 약 2초간 은은하게 하이라이트 + 작은 dot indicator
3. **Object tap**: 좌표(x,y 정규화)가 어느 object 영역 내부인지 판정 → outline 강조 + Bottom Sheet(화면 30–38%)
4. **Bottom Sheet**: 브랜드/상품명/가격/판매처/Affiliate 표시/유사상품/저장/Buy CTA 1개
5. AI 실패는 정상 상황: "AI Detection Failed" 금지 → "We found N products" / 수동 추가 유도

## 6. PDCA 운영

- **Plan**: 본 문서
- **Do**: 스캐폴드 → 코어 UX → 보조 화면 → Creator AI 플로우 순서로 구현
- **Check**: ① `next build` 무결 ② Playwright로 전 화면 스크린샷 → PRD 디자인 원칙 대조
  ③ 코어 플로우(피드 탭→시트→아웃바운드, 업로드→탐지→발행) 동작 검증
- **Act**: 발견된 결함 수정 후 Check 반복. 종료 조건: 빌드 무결 + 전 화면이 디자인 원칙 통과 + 코어 플로우 동작
- 사이클 로그: `docs/PDCA.md`

## 7. 성공 기준 (이번 빌드의 Definition of Done)

- [ ] 피드에서 객체 탭 → Bottom Sheet → 외부 구매 링크 이동이 끊김 없이 동작
- [ ] 크리에이터가 이미지 업로드 → AI 제안 확인 → 상품 연결 → 발행까지 60초 내 완료 가능한 UI
- [ ] exact / similar 라벨이 UI에서 구분됨
- [ ] 이벤트(asset_view, object_tap, card_open, outbound_click)가 기록되고 Analytics에 반영
- [ ] Quiet Luxury 디자인 원칙(무채색 90%, mask+outline, bottom sheet 등) 준수
- [ ] Vercel에 즉시 배포 가능한 상태 (환경변수 GEMINI_API_KEY만 옵션)
