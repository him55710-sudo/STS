# PDCA Log — Visual Commerce Platform

## Cycle 1
- **Plan**: `docs/PLAN.md` — PRD Phase 0+1 범위, Quiet Luxury 디자인 시스템, Object Tap UX 스펙 정의
- **Do**:
  - Next.js 16 + TS + Tailwind v4 스캐폴드, 디자인 토큰(PRD §36–45) 구축
  - 데모 콘텐츠 전략 전환: 외부 사진 CDN이 환경에서 차단 + Gemini 이미지 생성 쿼터 0 →
    **에디토리얼 SVG 일러스트 43종 자체 제작** (파이썬 생성기, 객체 좌표를 프로그램적으로 산출해 hotspot 정확도 보장)
  - Feed / ObjectLayer(hint 850ms, mask+1px outline) / ProductSheet(exact·similar 배지, 제휴 표시) /
    Discover(마소너리) / Saved / Creator Profile / Creator Console / Analytics(퍼널) / Admin(lite)
  - `/api/detect`: Gemini 비전 실탐지 + mock fallback, Create 플로우(업로드→탐지→후보 매칭→확정→발행)
- **Check** (프로덕션 빌드 + Playwright 16개 화면·플로우 스크린샷):
  - ✅ `next build` 무결 (11 routes)
  - ✅ 코어 루프: 피드 → 화면 탭(힌트) → 객체 탭 → Bottom Sheet → 구매 CTA 동작
  - ✅ Create 플로우 **라이브 Gemini 탐지**로 5개 객체 검출·자동 후보 매칭, 발행 6초 (<60s 목표)
  - ✅ 이벤트 수집 → Analytics 퍼널/OTR, Admin 로그 반영
  - ⚠️ 자산 품질: 로퍼/스니커즈 실루엣 불명확, 후디 비율, 체인백 스트랩 → 수정 완료
  - ⚠️ Discover 카드 링크 기본색 우려 → `a { color: inherit }` 추가
  - ⚠️ Bottom Sheet 높이 PRD(30–38%) 대비 큼 → 유사상품 76px·여백 축소
- **Act**: 위 수정 반영 후 재빌드

## Cycle 2
- **Check**:
  - ✅ 재빌드 무결, CSS/링크 색 계산값 `#151719` 확인 (푸른 기운은 스크린샷 안티앨리어싱)
  - ✅ Bottom Sheet 높이 개선 확인
  - 참고: 로컬 프록시가 Pretendard CDN을 차단해 폰트는 fallback으로 검수 (배포 환경에서는 정상)
- **Act**: 완료 기준 충족 → 커밋/배포 단계로 이동

## Definition of Done 대조 (docs/PLAN.md §7)
- [x] 피드에서 객체 탭 → Bottom Sheet → 외부 구매 링크 이동
- [x] 업로드 → AI 제안 → 상품 연결 → 발행 (실측 6초 < 60초)
- [x] exact / similar 라벨 UI 구분 (동일 상품 / 유사 상품 배지)
- [x] 이벤트(asset_view, object_tap, card_open, outbound_click) 기록 → Analytics 반영
- [x] Quiet Luxury 디자인 원칙 준수 (무채색 90%, mask+outline, bottom sheet)
- [x] Vercel 즉시 배포 가능 (환경변수 GEMINI_API_KEY만 옵션)

## Cycle 3 — Vercel 배포
- **Do**: Vercel MCP로 배포. 페이로드 크기 제약 대응을 위해 2-프로젝트 구성:
  - `objet-assets` (정적): seed SVG 43종 → https://objet-assets-mongben.vercel.app
  - `objet` (Next.js): 앱 전체, `/seed/*`를 assets 프로젝트로 rewrite → https://objet-mongben.vercel.app
- **Check**: 빌드 READY, 홈 200 OK(피드 SSR 정상), seed 이미지 200(image/svg+xml).
  Deployment Protection이 이미지 요청을 SSO로 막는 문제 발견 → 두 프로젝트 보호 해제(Act) 후 재검증 통과.
- **참고**: Vercel 환경변수는 MCP로 설정 불가 → AI 탐지는 mock 모드로 동작.
  실탐지 활성화: Vercel 대시보드 → objet → Settings → Environment Variables → `GEMINI_API_KEY` 추가 후 Redeploy.

## Cycle 4 — STS v2 (실사 콘텐츠 + 토스 UI + 수익 셰어)
- **Do**: OBJET→STS 리브랜딩(로고·아이콘), 실사 룩 5종 게시물(Gemini 실측 좌표 + 실사 상품 크롭 21종),
  실제 상품 딥링크(정확 상품명 검색 결과 직행), 인스타형 크리에이터 프로필(@minu.archive: 스토리 링·인증 배지·하이라이트),
  토스풍 인터랙션(프라이머리 블루 CTA, press/heart-pop/card-in/스프링 시트), Google·Kakao 데모 로그인,
  수수료 셰어 UX(제휴 배지·70% 배분·발행 시 "1회 판매당 ₩X" 표시), docs/BUSINESS.md(Pinterest 차별화 + 수익 아이템 6종)
- **Check**: 빌드 무결(12 routes) · 실사진 객체 탭(크로스백/신발) → 시트 정상 · 프로필/로그인 렌더 검증
- **비고**: 실사진(~1MB)은 인라인 배포 페이로드 한도 초과 → Vercel-GitHub 연동으로 배포하는 것이 정석

## Cycle 5 — STS v3 (SEEIT 디자인 시스템 + 웹 레이아웃 + 배포 파이프라인)
- **Plan**: 사용자가 제공한 SEEIT 디자인 시스템 레퍼런스 3장을 모바일·웹에 철저히 적용.
  그래파이트 바이올렛(#5B556E) 액센트, 뉴트럴 토큰(bg #F7F7F6 / surface #FFF / ink #111214 / line #E7E9EC),
  데스크톱 사이드바 레이아웃, 디자인 시스템 산출물(HTML 스펙 카드) 정리, Figma·Claude Design 연동, 영구 배포 파이프라인 구축.
- **Do**:
  - 토큰 전면 교체(globals.css @theme) + 라디우스 체계(버튼 11 / 카드 14 / 시트 22 / 상품 10)
  - 데스크톱 웹: `lg:` 사이드바 내비(홈/발견/저장됨/만들기/애널리틱스/운영) + 본문 660px + 3열 masonry, 모바일은 기존 탭바 유지
  - 피드 카드: 이미지 위 액션 레일(좋아요/저장/공유 오버레이), 카드 스태거 진입 애니메이션
  - 제품 시트: 컬러 스와치 행, 바이올렛 CTA "구매하러 가기 ↗" + 아웃라인 위시리스트, 수수료 70% 고지 푸터
  - 애널리틱스: 오버뷰 탭 스트립 + 5-KPI 그리드(크리에이터 수익 하이라이트 카드)
  - `design-system/` 9종 스펙 카드(@dsCard) 작성 → Claude Design 프로젝트 "STS Design System"에 publish
  - Figma 파일 생성(GqMW4W9WfkRKFI1rfeoHcs) + "STS Colors" 변수 컬렉션 9토큰(scope 지정) 생성
  - **배포 영구화**: Vercel `create_git_project`로 GitHub 연동 프로젝트 `sts` 생성
    (production branch = 작업 브랜치, 푸시마다 자동 배포) → 인라인 페이로드 한도 문제 해소
- **Check**:
  - ✅ 로컬 빌드 무결(12 routes) + 모바일(390×844)/데스크톱(1280×800) 스크린샷 검수
  - ✅ CSS 레이어 버그 수정: unlayered `a{color:inherit}`가 유틸리티를 이겨 사이드바 CTA가 흑배경·흑텍스트
    → `@layer base`로 이동 후 계산값 rgb(255,255,255) 확인
  - ✅ masonry 3열 미디어쿼리가 기본 규칙보다 앞에 있던 순서 문제 수정
  - ✅ git 연동 첫 배포 READY 확인(dpl_6k7dEy…, production) + https://sts-mongben.vercel.app 스모크 테스트
    (피드 SSR, /looks 실사진, 룩 게시물·크리에이터 렌더 확인)
- **Act**: README 리브랜딩(STS)·라이브 URL 갱신. Figma 콘텐츠 프레임(파운데이션/컴포넌트)은
  MCP 세션 재연결 후 이어서 생성 예정. 실 AI 탐지는 Vercel 대시보드에 `GEMINI_API_KEY` 추가 시 활성화.
