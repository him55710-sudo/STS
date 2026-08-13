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

## Cycle 6 — 온디바이스 AI 객체 탐지 (오픈소스, 키·서버 불필요)
- **Plan**: 업로드 → 객체 인식 → 상품 후보 예측이 키 없는 프로덕션에서도 "진짜로" 동작해야 한다.
  딥러닝 신규 학습 없이 오픈소스 사전학습 모델로 해결하고, 제휴 가능 상품을 우선 추천.
- **Do**:
  - SSDLite MobileNetV2(COCO 80클래스, TensorFlow.js coco-ssd)를 브라우저에서 실행 —
    가중치 18MB를 `public/models/coco-ssd`에 셀프호스팅(외부 CDN 의존 제거)
  - COCO에 패션 세부 클래스가 없는 한계 → person 박스를 착장 존(상의/하의/신발)으로 분할,
    가방·백팩·머그·가구·가전은 클래스 직접 매핑
  - 후보 랭킹 고도화: 실상품 21종 키워드 + 카테고리 + 영역 평균색↔상품 정색 유사도 +
    **제휴 가중치(affiliate +1.5, 수수료율×8)** → 제휴 상품이 자연 1순위
  - 탐지 우선순위: Gemini(서버 키 설정 시) → 온디바이스 → mock 3단 폴백, 병렬 실행
  - 후보에 없으면: 앱 내 상품 검색(제휴 우선 정렬) 또는 URL 직접 연결(상품명·가격 입력) — 기존 흐름 유지·보강
- **Check** (Playwright, 실사 업로드):
  - look1 업로드 → 상의/하의/신발 3존 탐지(신뢰도 90/86/83%) · "온디바이스 AI 탐지" 표기
  - 상의 1순위 후보 = Polo 옥스포드(제휴 7%, AI 추천 배지) — 실제 정답 상품 자동 연결
  - 하의 1순위 = Levi's 501 ✓ · Gemini 키 존재 시엔 Gemini 결과 우선(플리스/카고/백팩/클로그까지 탐지) 확인
  - 브라우저가 Google CDN 모델을 못 받는 환경(프록시) 재현 → 셀프호스팅 전환으로 해결(Act)
- **비고**: SSDLite는 밀착된 소형 오브젝트(크로스백·손목시계)를 놓칠 수 있음 —
  화면 탭으로 수동 추가하는 기존 UX가 보완. 정밀도가 더 필요하면
  Fashionpedia 계열 패션 특화 모델(ONNX 변환 필요) 또는 Vercel 환경변수 `GEMINI_API_KEY` 설정이 다음 단계.

## Cycle 7 — fashion_v2: 실루엣 마스크 파이프라인 (bbox → object shape)
- **Plan**: 탭 하이라이트가 사각형이 아니라 실제 옷/물건의 윤곽을 따라가야 한다.
  GPU·Python 스택 불가 환경(Vercel 서버리스 + 브라우저)에서 instance segmentation 달성.
- **Do**: 상세는 docs/VISION.md.
  Gemini 온톨로지 박스 탐지(시계·주얼리 포함) + MediaPipe 온디바이스 세그멘테이션
  (InteractiveSegmenter 포인트 프롬프트 = SAM 역할, selfie_multiclass = human parsing 역할)
  → mask fusion(클래스별 semantic prior·확장 박스·좌우 분할) → contour→simplify→
  ≤48정점 폴리곤 → SVG 실루엣 하이라이트 + point-in-polygon 히트테스트(액세서리 우선).
- **Check** (실측, tests/vision/benchmark.js):
  - overall recall 55%→**86%**, watch recall 0%→67%, 실루엣률 0%→**96%**
  - look1 기하 검증: 셔츠/청바지/시계 polygon bounds가 실측 GT와 일치, 가방은 스트랩 포함
  - Gemini 네이티브 segmentation은 실증 후 기각(174s+토큰 잘림) — 아키텍처 결정 근거 확보
  - 키 없는 폴백(coco-ssd+마스크), 마스크 실패 시 bbox 강등, mock까지 4단 fallback 전부 동작 확인
- **Act**: 신발 페어 한 짝만 잡히는 문제 → 2-컴포넌트 좌/우 인스턴스 분할로 해결.
  가방 마스크 느슨 → others(착용물체) semantic prior 우선 규칙 추가로 해결.
  남은 이슈는 VISION.md §6 (Gemini 분산, 다인 personId, 영상 트래킹).

## Cycle 8 — 실사 전환 완료: 여성 룩 5종 추가 + 일러스트 자산 전면 제거
- **Plan**: 데모 성격의 일러스트(SVG) 상품·콘텐츠를 전부 걷어내고 실사 사진만 남긴다.
  사용자가 보낸 여성 모델 5컷을 파일 순번(1~5) 기준으로 게시물 6~10으로 추가한다.
- **Do**:
  - 삭제: `public/seed/*.svg` 43종, 가상 브랜드 상품 29종(p-*), 시드 게시물 14종,
    미사용 크리에이터 6명, `next.config` `/seed` rewrite(외부 assets 프로젝트 의존 해제),
    만들기 화면의 SVG 샘플 → 실사 샘플로 교체
  - 추가: 여성 룩 5종(프레피·브리티시 헤리티지·미니멀·아웃도어·프렌치)과 실존 상품 18종(plw-*),
    크리에이터 2명(@edit.eunseo, @rin.heritage), 상품 크롭 18장(사진에서 직접 추출)
  - 좌표: 대형 아이템은 Gemini 실측(look6·7), 나머지는 5% 그리드 오버레이로 직접 검수.
    주얼리(목걸이·귀걸이·팔찌·반지)까지 오브젝트로 등록
  - **실루엣 주입**: 검수된 bbox를 fashion_v2 마스크 엔진에 1:1로 태워
    10개 게시물 전 오브젝트의 폴리곤을 생성 → 카탈로그에 51개 주입
  - 랭킹: `match.ts` 키워드·`product-colors.ts` 정색을 여성 상품 기준으로 교체
- **Check**:
  - 빌드 무결(12 routes) · 전 라우트 200 · 404 리소스 0건(잔여 /seed 참조 없음)
  - 셔츠 탭 → 실루엣 하이라이트 + Polo 옥스포드(동일 상품, 제휴 7%) 시트 정상
  - **귀걸이 탭 → 셔츠가 아니라 귀걸이가 선택**(INTERACTION_PRIORITY 검증) → OST 후프(유사 상품) 시트
  - 폴리곤 생성률 51/54 (미생성 3건은 초소형 주얼리 → bbox 폴백, 의도된 동작)
- **Act**: 발견 화면의 카테고리 칩을 실제 보유 카테고리에서 파생하도록 변경(빈 탭 제거),
  스타일 카드 검색어를 신규 콘텐츠에 맞게 교체.

## Cycle 9 — fashion_v3: 픽셀 정밀 경계 + 상품 검색 파이프라인
- **Plan**: "점 몇 개 직선 연결" 수준의 outline을 실제 픽셀 경계 추종으로, category-level
  상품 매칭을 multi-stage retrieval(속성→쿼리→provider→rerank→tier)로 전면 개선.
- **Do**: 상세는 docs/VISION.md fashion_v3 섹션. 세그 1024px·ε 2px·링당 120정점·Chaikin,
  다중 링(신발 좌/우 독립), 마스크 픽셀 색상 클러스터링, 탐지 동시 속성 추출(브랜드 evidence 강제),
  쿼리 3~5 variants, catalog+Naver provider adapter, composite rerank, EXACT/LIKELY/SIMILAR tier,
  근거(matchReason) UI, ?debugFashion 디버그 뷰, 시드 52객체 55링 재주입.
- **Check** (실측):
  - look10 회귀: 니트 76정점 곡선 추종·신발 2 독립 링·좌우 각각 탭→삼바 시트 ✓
  - Retrieval 벤치마크(54 GT): Recall@1 96% / @3 100% / @5 100% / MRR 0.981
  - 마스크 색상: 크림 니트 #dfd8c8, 블랙진 #0b0c0f (배경·피부 오염 없음)
  - 빌드 무결 · 전 라우트 200
- **Act/남은 것**: Gemini 쿼터 소진으로 속성 추출 실호출은 리셋 후 검증,
  Naver 키 입력 시 웹 검색 활성화, 후보 이미지 임베딩 비교는 다음 단계.

## Cycle 10 — v3.1: 오클루전 강건화 + 웹 상품 검색 provider chain
- 프로덕션 실패 2건 재현·수정: 상세 docs/VISION.md v3.1 섹션.
  closing·폴백 임계 22%·anatomical guard / 쿼터 안내 UI / Naver+Gemini그라운딩 provider.
- 회귀: 니트 80정점·신발 2링·벤치마크 96/100/100 유지. 그라운딩은 무료 쿼터로 실호출 미검증.
