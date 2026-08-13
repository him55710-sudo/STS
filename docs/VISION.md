# STS Vision Pipeline — fashion_v2

> Shoppable content의 핵심 요구: 사용자가 사진 속 패션 아이템을 탭하면
> **bounding box가 아니라 실제 object silhouette**이 하이라이트되어야 한다.

## 1. Phase 0 감사 — 기존 문제

**기존 파이프라인 (legacy)**
- 모델: Gemini box 탐지(서버, 키 필요) / TF.js coco-ssd(온디바이스) / mock
- 입력: 업로드 이미지 dataURL → 출력: normalized bbox 배열
- 문제:
  1. 최종 shape이 **bounding box** — 상의를 몸 전체처럼 잡고, 실루엣 없음
  2. coco-ssd는 COCO 80클래스라 셔츠/팬츠/신발 클래스 자체가 없음 → person 존 분할 근사
  3. 시계·팔찌·귀걸이 등 소형 액세서리 탐지 불가(coco) 또는 프롬프트 미요구(gemini)
  4. 겹친 객체의 hit test가 "작은 것 우선" 규칙뿐
  5. 마스크·폴리곤 데이터 모델 부재

**실행 환경 감사 결과 (중요)**
- 이 프로젝트는 **Next.js 16 / Vercel 서버리스** — Python 백엔드 없음
- 개발/프로덕션 모두 **GPU 없음** (`nvidia-smi` 없음, PyTorch 미설치)
- 따라서 MMPose(RTMW)·SCHP·SAM/GroundingDINO 같은 **PyTorch GPU 스택은 이
  아키텍처에 탑재 불가** (요구사항과 기존 아키텍처의 근본 충돌 → 본 문서로 보고).
  → 스펙의 각 역할을 **브라우저에서 실행 가능한 동등물**로 매핑해 해결:

| 스펙 요구 | fashion_v2 구현 | 근거 |
|---|---|---|
| Open-vocab detection | Gemini 온톨로지 프롬프트 (박스만, 빠름) | 실측 4~8s |
| SAM refinement | MediaPipe **InteractiveSegmenter**(magic_touch) — 포인트 프롬프트 → 객체 마스크 | 실측 1.0s/객체(CPU wasm) |
| Human parsing (SCHP) | MediaPipe **ImageSegmenter**(selfie_multiclass) — clothes/skin/hair/others | 실측 2.0s/이미지 |
| Pose 기반 소형 객체 ROI | Gemini가 소형 액세서리 tight box 직접 반환 + 확장 박스 crop 융합 | pose 모델 없이 달성 |
| Gemini 네이티브 segmentation | **실증 후 기각**: 마스크 포함 응답 174s + 토큰 잘림(JSON 파싱 실패) | 프로덕션 부적합 |

## 2. 아키텍처

```
IMAGE (create flow, dataURL)
        │
        ├────────────── 병렬 ──────────────┐
        ▼                                  ▼
SERVER /api/detect                CLIENT coco-ssd (키 없을 때 승격)
Gemini 온톨로지 프롬프트            person→착장 존 + COCO 직접 매핑
(의류·신발·가방·시계·주얼리          (셀프호스팅 가중치 18MB)
 tight box, max 10)                        │
        └──────────────┬───────────────────┘
                       ▼
             DETECTION PROPOSALS (bbox+label)
                       │
                       ▼
        CLIENT MASK ENGINE (lib/mask/client-engine.ts)
        ├─ ImageSegmenter multiclass 1회
        │    → clothes(4) / others(5) semantic prior   [human parsing 역할]
        ├─ 객체별 InteractiveSegmenter 포인트 프롬프트
        │    → object mask (극성 자동 판별)             [SAM refinement 역할]
        └─ MASK FUSION
             ├─ 확장 박스 constraint (의류 12% / 소형 35% pad)
             ├─ 의류: ∩ clothes-mask (피부·배경 번짐 차단)
             ├─ 착용 물체(가방·신발·시계…): others-mask 우선 (fill ≥ 6% 시)
             ├─ 실패 시: parsing 단독 → bbox 강등 (fallback graph)
             └─ 신발·귀걸이: 2-컴포넌트면 좌/우 인스턴스 분할
                       │
                       ▼
        POST PROCESSING (lib/mask/geometry.ts)
        majority smoothing → Moore-neighbor contour →
        Douglas-Peucker simplify → ≤48 vertex normalized polygon →
        클래스별 min-area 필터 → 해부학적 밴드 penalty → 클래스 인지 dedupe(IoU)
                       │
                       ▼
        FINAL INSTANCES { bbox, polygon, canonicalClass, confidence, tone }
                       │
                       ├─ PRODUCT RETRIEVAL (lib/match.ts — 제휴 우선 랭킹)
                       └─ UI: SVG path 하이라이트(soft fill + 1~1.5px outline)
                            + point-in-polygon hit test + INTERACTION_PRIORITY
```

**Fallback graph (전부 실측 검증)**
- Gemini 실패/키 없음 → coco-ssd 존 탐지 (여전히 마스크 추출됨)
- multiclass parsing 실패 → 포인트 마스크 단독
- InteractiveSegmenter 실패 → parsing ∩ box
- 마스크 엔진 전체 실패/타임아웃(30s) → bbox 그대로 (기존 legacy와 동일)
- 모두 실패 → mock (데모 흐름 유지)

## 3. 추가/변경 파일

```
lib/vision-config.ts        온톨로지·canonical class·INTERACTION_PRIORITY·
                            클래스별 min confidence/area·해부학 밴드·모든 임계값 (중앙 설정)
lib/mask/geometry.ts        contour tracing·simplify·PIP·IoU·centroid (순수 함수, 서버/클라 공용)
lib/mask/client-engine.ts   MediaPipe 로딩·포인트 세그·mask fusion·좌우 분할·후처리
lib/vision.ts               (기존) coco-ssd 탐지 — 유지
app/api/detect/route.ts     온톨로지 프롬프트 업그레이드·pipelineVersion·VISION_PIPELINE 플래그
components/ObjectLayer.tsx  polygon SVG 렌더·PIP hit test·우선순위 규칙 (bbox 하위호환)
app/create/page.tsx         마스크 스테이지·실루엣 리뷰 오버레이·polygon 발행
lib/types.ts                ObjectTag/DetectedObject에 polygon·canonicalClass (optional, 하위호환)
types/mediapipe-tasks-vision.d.ts  타입 선언
tests/vision/benchmark.js   recall/실루엣률 벤치마크 러너
tests/vision/fixtures/      기대 클래스 ground truth
public/models/mediapipe/    magic_touch.tflite(6MB)·selfie_multiclass.tflite(16MB) 셀프호스팅
public/mediapipe/wasm/      MediaPipe wasm 런타임 셀프호스팅
```

## 4. 사용 모델 & 라이선스

| 모델 | 용도 | 라이선스 | 상용 비고 |
|---|---|---|---|
| MediaPipe InteractiveSegmenter (magic_touch) | 포인트→객체 마스크 | Apache-2.0 | 셀프호스팅, 무료 |
| MediaPipe ImageSegmenter (selfie_multiclass_256x256) | 의류/피부/기타 파싱 | Apache-2.0 | 셀프호스팅, 무료 |
| TF.js coco-ssd (SSDLite MobileNetV2) | 키 없는 탐지 폴백 | Apache-2.0 | 셀프호스팅, 무료 |
| Gemini (`gemini-3.5-flash`) | 주 탐지 엔진 | Google API 약관 | 유료 API, 키는 Vercel 환경변수 |
| @mediapipe/tasks-vision@20230920.0.0 | wasm 런타임 | Apache-2.0 | legacy InteractiveSegmenter API 필요(신버전 1.0.1은 새 .task 번들 요구 — 공개 URL 미존재 확인) |

## 5. 성능 (실측 — 4 vCPU 컨테이너, 헤드리스 Chromium swiftshader)

| 항목 | Before (legacy) | After (fashion_v2) |
|---|---|---|
| overall class recall (5 fixtures, 22 objects) | ~55% (12/22)* | **86% (19/22)** |
| small-object(시계) recall | 0% (클래스 부재) | **67% (2/3)** |
| silhouette rate (polygon 보유) | 0% | **96% (22/23)** |
| 신발 좌/우 분리 | 불가 | 2-컴포넌트 자동 분할 |
| mask IoU | not measured (GT polygon 없음) | not measured — bbox 대비 기하 검증만 수행** |

\* before는 coco-ssd 존 실측(상의/하의/신발만, look1·look4 확인) + gemini 구프롬프트 실측(가방·시계 미요구) 기반 추정 하한.
\** look1 기하 검증: 셔츠 polygon bounds (.334,.177,.291,.416) vs GT (.33,.18,.30,.37) — 거의 일치. 시계 (.534,.438) vs 손목 실위치 일치.

**Stage timing (look1, 스로틀된 CPU 환경 — 실기기는 GPU delegate로 훨씬 빠름)**
```
Detection (gemini)        4~8s   (서버, 병렬)
Engine load (첫 회만)      ~3s   (wasm+모델 22MB, 이후 캐시)
Human parsing (1회)       ~2.0s
Point segmentation        ~1.0s × 객체수
Fusion+contour+simplify   <100ms
전체 분석 (5 objects)     14~16s (2회차부터 모델 캐시로 단축)
```

## 6. Remaining Failures

1. **Gemini 탐지 분산**: 동일 이미지 재분석 시 객체 1~2개 차이 (look1: 5개→4개).
   완화책: 재시도 버튼(있음 — "다시 시작"), 향후 2-pass ensemble.
2. **팔찌·목걸이·귀걸이·반지 미검증**: fixture 사진에 해당 액세서리가 없어 recall 미측정.
   파이프라인은 클래스 지원(온톨로지·임계값·우선순위 완비).
3. **다인(multi-person) 사진**: person별 객체 분리는 탐지 박스 위치로만 암묵 처리 — personId 미구현.
4. **영상**: 미구현 (스펙 지침대로 이미지 안정화 우선). keyframe→tracking 설계는 §7.
5. 마스크 경계가 저해상도(640px 입력)라 초정밀 확대 시 계단 현상 — confidence mask 보간으로 개선 여지.

## 7. Next Recommended Steps

1. **크리에이터 수정 루프 → 학습 데이터**: 리뷰 단계의 수동 박스 추가/삭제를
   `{prediction, correction, pipeline_version}` 스키마로 적재 (스토어 이벤트로 기록 가능).
2. **영상**: keyframe(1~2FPS) 탐지 → mask IoU+클래스 일관성 tracking → scene-cut(히스토그램) 시 재탐지.
3. **정밀 마스크**: 트래픽 증가 시 GPU 마이크로서비스(RF-DETR seg 또는 SAM2)를
   `DetectionBackend/SegmentationBackend` 인터페이스 뒤에 추가 — 현 구조가 어댑터 교체 지원.
4. Gemini 2-pass(전신 → person crop 재탐지)로 소형 액세서리 recall 향상.

## 8. 운영 플래그

```
VISION_PIPELINE=legacy          서버 탐지를 mock으로 강제 (비교용)
NEXT_PUBLIC_VISION_PIPELINE=legacy   클라 마스크 스테이지 비활성 (bbox 모드)
localStorage.VISION_DEBUG=1     콘솔에 stage timing·mask source 출력
GEMINI_API_KEY                  주 탐지 엔진 활성화 (Vercel 환경변수)
```

---

# fashion_v3 — Pixel-Precise Boundary + Product Retrieval Pipeline

## 개선 요약 (v2 → v3)

**Segmentation (Boundary Accuracy)**
| 항목 | v2 | v3 |
|---|---|---|
| 세그 입력 해상도 | 640px | **1024px** |
| Douglas-Peucker ε | 대각선×0.008 (~7px) | **×0.0022 (~2px)** |
| 정점 수 | ≤48 (전체) | **링당 ≤120 + Chaikin smoothing** |
| 링 구조 | 객체당 외곽 1개 | **다중 링 ≤3 (신발 좌/우 독립, M..Z M..Z 렌더)** |
| 히트테스트 | 단일 폴리곤 PIP | **any-ring PIP** |
| 스트로크 | 1/1.5px, fill 9~10% | **1.25/1.75px, fill 3~6%** (얇고 정밀) |
| 실측 (look10 니트) | 21 verts, 직선 다수 | **76 verts, 소매·밑단 곡선 추종** |
| 신발 페어 | 한 링으로 연결/한 짝 누락 | **2 독립 링, 좌·우 각각 탭 가능 (실측 검증)** |

**색상 추출** — LLM 질의가 아니라 **마스크 내부 픽셀의 dominant color 클러스터링**
(4bit/채널 히스토그램 → 인접 bin 병합, 하이라이트·딥섀도 가중 절감).
실측: AMI 니트 #dfd8c8(크림), 블랙진 #0b0c0f — 배경·피부 오염 없음.

**Product Retrieval (multi-stage)**
```
attributes(탐지와 동시 추출: brandCandidates+evidence/logo/pattern/visibleText/features)
→ query generation (3~5 variants: 브랜드+색상, 로고 근거, 특징+명사)
→ providers: catalog(항상) + Naver Shopping OpenAPI(키 설정 시, 서버 전용)
→ normalize (ProductCandidate 공통 스키마)
→ rerank: composite score (visual/brand/logo/attributes/color/text/pageTrust — vision-config 가중치)
→ tier: EXACT("정확 일치 유력") / LIKELY("동일 제품 가능성") / SIMILAR("유사 상품")
→ matchReason (근거 문자열, UI 노출)
```
- **No-hallucination 규칙**: brandCandidates는 시각적 evidence가 있을 때만 채워지도록 스키마에서 강제.
  브랜드 근거 없으면 후보 패널에 "브랜드 근거를 찾지 못했어요" 안내 + tier는 similar 상한.
  웹 후보는 이미지 시각 비교 전이므로 exact 부여 금지(최대 likely).
- 동시 실행 상한 3, 세션 캐시, 쿼리 dedupe.

## Retrieval 벤치마크 (tests/vision/retrieval-benchmark.ts — 실측)
ground truth = 시드 10개 게시물의 54개 객체-상품 연결.
```
Recall@1 : 96%
Recall@3 : 100%
Recall@5 : 100%
MRR      : 0.981
```

## Boundary 지표
GT 마스크가 없어 Mask IoU / Boundary F-score는 **not measured** —
정점 수·링 구조·시각 검수로 대체(위 표). GT 어노테이션 확보 시 측정 예정.

## Debug View
`?debugFashion=true` (development 전용): 객체별 bbox·conf·링/정점 수·tone·
attributes·생성 쿼리·top5 후보 score breakdown.

## 미검증/남은 항목
- **Gemini 속성 추출 실호출**: 무료 티어 일일 쿼터 소진(429 RESOURCE_EXHAUSTED)으로
  금일 폴백 경로만 실측 — 스키마·파싱·랭킹 연동은 구현 완료, 쿼터 리셋 후 검증 필요.
- **Naver Shopping provider**: 키(NAVER_CLIENT_ID/SECRET) 미보유로 실호출 미검증.
  키 없으면 graceful fallback(카탈로그 전용) 동작은 실측 확인.
- 후보 상품 이미지 임베딩 시각 비교(visual score) — 웹 후보는 현재 0 처리.
- 팔–몸 사이 내부 hole 링(evenodd 지원은 렌더에 이미 있음, inner contour 추적 미구현).
