# STS 컨퍼런스 X배너 (600 × 1800 mm)

컨퍼런스 부스용 프로젝트 소개 X배너. 표준 X배너 규격 **가로 600 × 세로 1800 mm** 에 맞춰 제작.

구성 흐름: 01 프로젝트 주제·목표 → 02 방향 설정 과정(애드온 vs 플랫폼 → 20대 초 여성·패션 → 뷰티 → K-뷰티 × 동남아 → 제휴·유입 → 확장) → 03 개발 진행 과정(PDCA 타임라인) → 04 변화·발전(Before/After) → 05 기술 프로세스·차별점 → 06 최종 결과물·로드맵(데모 목업 + QR).

디자인 시스템: 크림 캔버스, 코랄→와인 그라데이션 밴드(시작·끝), 흰 카드(선 0.5mm, 라운드 10mm), 구조색은 코랄·와인 두 가지. 형광 라임(#D9FF3D)은 'AI가 인식한 물건' 하이라이트(After 실루엣, 폰 목업 핀) 한 용도에만 사용. 본문 최소 7.5mm, 키워드 10mm 이상. 배너에는 정량 수치를 넣지 않았다(근거가 필요한 수치는 제외). 개발 과정 출처는 `docs/PDCA.md`, `docs/VISION.md`; 방향 설정 과정은 팀 인터뷰 내용.

## 파일

| 파일 | 용도 |
|---|---|
| `sts-x-banner-600x1800.pdf` | **인쇄소 전달용.** 페이지 크기 600×1800mm, 텍스트 벡터 |
| `sts-x-banner-600x1800@150dpi.png` | 래스터 출력용 (3543 × 10630 px, 150dpi) |
| `preview.png` | 검수용 미리보기 (800 × 2400 px) |
| `sts-x-banner-600x1800.html` | 디자인 원본. 모든 치수는 mm 단위 |
| `render.mjs` | HTML → PDF/PNG 렌더 스크립트 |

## 수정 후 다시 렌더

```bash
node marketing/x-banner/render.mjs
```

요구 사항: Playwright + Chromium, Pretendard 폰트(시스템 설치 또는 CDN 접근).

## 인쇄 가이드

- 좌우 안전 여백 44mm. 하단 110mm는 거치대 포켓에 가려지는 구역이라 로고 라인만 배치.
- 재단 여백(bleed)이 필요하면 인쇄소 요청 규격에 따라 `@page`와 `html, body` 크기를 606×1806mm 등으로 조정 후 재렌더.
- 사진(`public/looks/look6.jpg`, 900px)은 Before/After 컷(240mm)과 폰 목업(176mm 폭)에 사용. 대형 출력 전 크리에이터에게 고해상 원본을 받아 교체하는 것을 권장.
- QR 코드는 `https://sts-mongben.vercel.app` 로 연결. 도메인이 바뀌면 QR SVG를 다시 생성해 교체.

## 데이터 주입

Before/After 실루엣 폴리곤은 `lib/catalog.ts`의 look6 오브젝트(`l6-shirt`, `l6-bag`, `l6-jeans`) 좌표를 그대로 SVG `<polygon>`에 넣은 것. QR SVG는 `qrcode` 패키지로 생성해 인라인 삽입.
