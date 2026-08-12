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
