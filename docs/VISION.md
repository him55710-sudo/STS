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
   ⚠️ 쇼핑 검색 API는 2026-07-31 종료 — v3.3에서 제거됨. 아래 fashion_v3.3 섹션 참조.
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

---

# fashion_v3.1 — 오클루전 강건화 + 실제 웹 상품 검색

## 프로덕션 피드백 재현 → 원인
1. **뒷모습+머리카락 사진에서 마스크 붕괴 / 모자·가방 미탐지 / 바닥 blob**
   → 근본 원인: 프로덕션 Gemini 키가 **무료 티어 일일 쿼터 소진(429)** → coco-ssd 존 폴백
   (상의/하의/신발만 존재, 모자·가방 클래스 없음) + 포인트 세그가 머리카락/바닥에 빠짐.
2. **후보 상품이 색상·모델 불일치** → 검색 소스가 로컬 카탈로그뿐이라 흰 폴로셔츠 → 파란 옥스포드로 매칭.

## 수정 (실측 검증)
- **의류 마스크 closing**: 머리카락·스트랩이 만든 좁은 틈을 morphological closing으로 연결
  (실제 옷 곡률 유지, gap만 브리지)
- **parsing 폴백 임계값 5%→22%**: 포인트 세그가 옷 일부만 잡으면 clothes∩box 폴백이 즉시 개입
- **Anatomical guard**: 마스크 중심이 탐지 박스(±30%)를 벗어나면 폴리곤 폐기 → bbox 강등
  (신발 존이 바닥 카펫을 잡는 실패 차단)
- **쿼터 상태 표시**: /api/detect가 429를 `source:"quota"`로 구분 반환 → 리뷰 화면에
  "AI 정밀 탐지 쿼터 초과 — 기본 탐지로 진행" 안내
- 회귀 확인: look10 니트 80정점·신발 2링 유지, retrieval 벤치마크 96/100/100 유지

## 실제 웹 상품 검색 (provider chain)
```
1) Naver Shopping OpenAPI   NAVER_CLIENT_ID/SECRET 설정 시 (무료 25,000건/일)
   → 실판매 상품명·가격·이미지·몰 링크 반환 (가장 권장)
   ⚠️ 무효 — 2026-07-31 종료. v3.3에서 코드 제거. 아래 fashion_v3.3 참조.
2) Gemini + Google Search grounding   GEMINI_API_KEY만으로 동작
   → 웹에서 실판매 상품 조사, 링크는 정확 상품명 검색 딥링크로 안전 연결
3) 없음 → 카탈로그 전용 (기존 동작)
```
- 구현·graceful 폴백 실측 확인. **그라운딩 실호출은 무료 티어 쿼터로 미검증**
  (`429 RESOURCE_EXHAUSTED` — 그라운딩은 별도 소량 쿼터). 유료 전환 시 즉시 활성.
- 웹 후보는 이미지 시각 비교 전이므로 tier 상한 likely, 모델 생성 URL은 신뢰하지 않고
  검색 딥링크로 대체(출처는 sourceUrl 보존).

## 운영 권장사항
1. **Gemini 유료 티어 전환** — 탐지 정확도 문제의 대부분이 쿼터 폴백에서 발생.
2. ~~Naver Developers 앱 등록 → 쇼핑 검색~~ **폐기** (쇼핑 검색 API 종료).
   대체안은 fashion_v3.3 섹션 참조.

---

# fashion_v3.2 — LLM Provider 추상화 (Letsur 전환)

## 구조
```
app/api/detect, app/api/product-search
        │  (provider 중립 JSON 계약)
        ▼
lib/llm/index.ts   providerChain(): Letsur → Gemini  (LLM_PROVIDER 로 강제 지정 가능)
        ├─ lib/llm/letsur.ts   OpenAI 호환 /chat/completions (image_url 멀티모달)
        │                      base URL: LETSUR_BASE_URL, 없으면 표준 후보 자동 probe + 메모리 캐시
        └─ lib/llm/gemini.ts   기존 Gemini (폴백으로 유지)
```
- Gemini `responseSchema` 의존을 제거하고 **프롬프트 기반 JSON 계약**으로 교체 →
  어떤 OpenAI 호환 provider든 동일 파이프라인에서 동작. 파서는 배열/`{objects:[]}` 양쪽 수용.
- 실패 분류(`ok/quota/auth/unavailable/error`)로 폴백 판단 → 한 provider가 죽어도 흐름 유지.
- 시크릿은 서버 라우트에서만 사용, 응답에는 마스킹된 접두사만 노출.

## 검증 상태 (정직 보고)
- **Letsur 실호출 미검증**: 개발 컨테이너의 egress 정책이 `letsur.ai` 를 차단
  (`403 Host not in allowlist`, `/api/vision-health` 로 재현 확인). 공개 문서도 웹 색인에 없음.
  → 정확한 base URL·모델 ID를 **추측해 하드코딩하지 않고**, 환경변수 + 자동 probe + 진단
  엔드포인트로 설계했다. 키 형식(`sk-…`)에 근거해 OpenAI 호환 규약을 가정했으며,
  실제 규약이 다르면 `lib/llm/letsur.ts` 어댑터만 교체하면 된다.
- **폴백 체인 실측 확인**: Letsur 차단 → Gemini 승격 → look6에서 6객체 탐지,
  브랜드 근거 추출 정상(`"small embroidered pony logo on left chest"` → Polo 0.9).
- 회귀: 실루엣 82~84정점, 신발 2링, 후보 랭킹(라이트워시 진 → Levi's 501) 정상.

## 확인 방법 (배포 후 5초)
```
https://sts-mongben.vercel.app/api/vision-health        → baseUrlWorking / availableModels
https://sts-mongben.vercel.app/api/vision-health?vision=1 → 실제 비전 호출 왕복 검증
```
`baseUrlWorking` 이 나오면 그 값을 `LETSUR_BASE_URL`, 비전 지원 모델을 `LETSUR_MODEL` 로 고정.

---

# fashion_v3.3 — NAVER API HUB 이관 대응 + visual 축 활성화

## 정정 사항 (이전 문서의 오류)
v3.1/v3.2 문서와 코드는 네이버 상품 검색을 **쇼핑 검색 API(`/v1/search/shop.json`)**로
설계했다. 이는 현재 **동작하지 않으며 키를 바꿔도 되살아나지 않는다.**

> 네이버 개발자센터 이용약관 부칙 제2조 ③ (시행 2026-07-31)
> "'Search API' 중 '쇼핑', '책', '학술정보' 데이터 제공 서비스는
>  2026년 7월 31일 24:00부로 종료됩니다."

또한 검색 API 자체가 **NAVER API HUB(네이버클라우드플랫폼)**로 이관되었고,
호스트·경로·인증 헤더가 **전부 바뀌었다**. "엔드포인트는 그대로"라는 이전 판단은 틀렸다.

| | legacy (구 개발자센터) | apihub (신규) |
|---|---|---|
| Host | `openapi.naver.com` | `naverapihub.apigw.ntruss.com` |
| Path | `/v1/search/{type}.json` | `/search/v1/{type}` |
| 인증 | `X-Naver-Client-Id` / `X-Naver-Client-Secret` | `X-NCP-APIGW-API-KEY-ID` / `X-NCP-APIGW-API-KEY` |
| 발급 | developers.naver.com | NCP 콘솔 → API HUB |
| 수명 | 2027-06-30 종료 예정 | 현행 |
| shop/book/doc | **종료됨** | **항목 없음** |

## 구현 — `lib/naver/api-hub.ts`
- 두 계약을 모두 지원하고 **자동 판별**한다. 성공한 계약을 프로세스 메모리에 캐시해
  이후 호출은 1회 요청으로 끝난다. `NAVER_API_CONTRACT=apihub|legacy` 로 강제 가능.
- 오류 응답이 두 층에서 서로 다른 형태로 온다
  (`{error:{errorCode,message}}` = 게이트웨이, `{errorCode,errorMessage}` = 검색 레이어)
  → `parseError()` 로 하나의 스키마로 정규화.
- `RETIRED_SEARCH_TYPES = ["shop","book","doc"]` 를 상수로 박아 **호출 자체를 금지**한다.
  종료된 API를 재시도하는 코드는 남기지 않는다.
- 크롤링은 하지 않는다(약관·법적 리스크). 공식 API만 사용.

## 죽어 있던 visual 축을 채웠다 — `lib/naver/visual-score.ts`
v3까지 웹 후보의 재랭킹은 `visual = 0` 이었다(`RANK_WEIGHTS.visual * 0`).
가장 큰 가중치 축이 통째로 비어 있어 "색이 전혀 다른 후보"가 상위로 올라오던 원인이다.

```
후보 상품명 → 네이버 이미지 검색 → 썸네일 대표색 서버 계산
            → 업로드 사진 마스크 색(tone)과 RGB 거리 비교 → visual 0~1
```
- 상위 4개 후보만 보강(응답 지연 방지), 30분 캐시.
- **저작권**: 검색된 이미지는 제3자 저작물이고 이미지 검색 응답에 출처 페이지 URL 필드가 없다.
  따라서 **점수 계산에만 쓰고 화면에 노출하지 않는다.**
- 근거 문자열은 남긴다: `"이미지 색상 유사 (78%)"`.

## 진단 — `/api/vision-health`
`checkNaver()` 가 죽은 쇼핑 API 대신 **이미지 검색**을 실제로 찔러 본다. 보고 항목:
`contract`(어느 계약이 통했는지) · `httpStatus` · `errorCode` · 한글 원인 해설 ·
`shoppingSearchApi: "종료됨 (2026-07-31 …)"`.

자주 나오는 `errorCode`:
| 코드 | 뜻 | 조치 |
|---|---|---|
| `024` | Authentication failed | 키/시크릿 값 또는 환경변수 **key·value가 뒤바뀜** |
| `010` | 등록되지 않은 서비스 | 콘솔에서 해당 검색 API(이미지 등)를 **신청/활성화** |
| `012` | 호출 권한 없음 | 앱에 그 API가 추가되지 않음 |
| `101` | 잘못된 검색 API | 종료된 타입(shop/book/doc) 호출 |

## 검증 상태 (정직 보고)
- 코드: `tsc --noEmit` 무오류, `next build` 성공.
- **실호출 미검증**: 이 개발 컨테이너의 egress 정책이 `openapi.naver.com`,
  `naverapihub.apigw.ntruss.com`, `ncloud.com`, `developers.naver.com` 을 모두 차단한다
  (`403 CONNECT ... Host not in allowlist`). 우회하지 않는다.
  → 프로덕션 `/api/vision-health` 응답으로만 판정 가능하다.
- 회귀: 카탈로그 retrieval 벤치마크 Recall@1 96% / @3 100% / @5 100% / MRR 0.981 유지
  (네이버 미설정 시 graceful fallback = 카탈로그 전용, 기존 동작과 동일).

---

# Letsur 연동 — 실측 판정 (미해결, 원인 확정)

## 실측 결과 (프로덕션 `/api/vision-health`)
호출 조건을 10가지로 바꿔 `api.letsur.ai` 를 때렸다. **전부 동일한 응답**이다.

| 조건 | 결과 |
|---|---|
| `/v1/models` + Bearer(서비스 키 `sk-…`) | 403 `ForbiddenException` |
| `/v1/models` + `x-api-key` | 403 `ForbiddenException` |
| `/v1/chat/completions` + Bearer / `x-api-key` | 403 `ForbiddenException` |
| `/v1/models` + **관리 키 `mk_…`** | 403 `ForbiddenException` |
| `/v1/models` + **가짜 키** | 403 `ForbiddenException` |
| `/v1/models` + **인증 헤더 없음** | 403 `ForbiddenException` |
| `/v1/__no_such_route__` (없는 경로) | 403 `ForbiddenException` |
| `/`, `/models`, `/api/v1/models`, `/openai/v1/models`, `/serving/v1/models` | 403 `ForbiddenException` |

## 판정
**키 문제가 아니다.** 근거:
1. 서로 다른 두 개의 실제 키, 가짜 키, 무인증이 **모두 같은 응답**을 받는다.
   키가 검증 단계까지 도달하지 못한다는 뜻이다.
2. **존재하지 않는 경로**도 같은 응답이다. AWS API Gateway는 없는 경로에
   `MissingAuthenticationTokenException` 을 주는 것이 정상이므로,
   요청이 라우팅 이전 단계에서 잘리고 있다.
3. **루트 `/` 까지** 동일하다. 경로를 바꿔 해결될 문제가 아니다.

→ 남은 가능성은 세 가지이고, 전부 **Letsur 측 정보/설정**이 있어야 풀린다:
   (a) 호출 IP 허용목록 — Vercel 서버리스 IP가 등록되지 않음
   (b) `api.letsur.ai` 가 이 계정의 API 호스트가 아님 (주소 자체가 다름)
   (c) 키가 이 게이트웨이의 사용 계획에 연결되지 않음

`https://api.letsur.ai/v1` 은 **내가 probe 결과로 추론한 값**이지 Letsur 문서로 확인한
값이 아니다. 위 실측으로 그 추론은 근거를 잃었다. 다른 주소를 **추측해서 넣지 않는다.**

## 필요한 정보 (Letsur 콘솔/문서에서)
1. Chat/Completions **엔드포인트 전체 URL**
2. **인증 헤더 이름**과 형식
3. 사용 가능한 **모델 ID** (현재 기본값 `gpt-4o` 는 자리표시자다)
4. 호출 IP 허용목록 등록이 필요한지

이 셋이 오면 `lib/llm/letsur.ts` 어댑터의 상수만 교체하면 된다. 나머지 파이프라인은 그대로다.

## 현재 서비스 영향: 없음
`activeChain: ["letsur","gemini"]` 이고 Gemini 키가 설정돼 있어 자동 승격된다.
Letsur 활성화는 provider 교체 건이지 기능 차단 요인이 아니다.

---

# fashion_v4 — 객체 크롭 기반 상품 이미지 검색·동일 상품 검증

## 실제 실행 경로

```
업로드 원본
  → Gemini 객체 탐지 + MediaPipe 실루엣
  → 객체 bbox별 8% padding crop + 실루엣이 있으면 흰 배경으로 분리
  → 최대 448px JPEG, 96KB 이하로 반복 압축
  → AliExpress Affiliate Image Search (실제 상품·이미지·가격·promotion link)
  → 상위 3개 후보 이미지 재수집
  → Gemini 원본 객체/후보 다중 이미지 identity 검증
  → catalog + AliExpress + ADPICK + Naver web detail URL + LLM 후보 병합
  → visual/brand/logo/OCR/text/page trust 재랭킹
  → EXACT / LIKELY / SIMILAR 보수적 등급화
```

`EXACT`는 아래 조건을 모두 만족할 때만 자동 부여한다.

- Gemini 동일 제품 확률 0.93 이상
- 시각 유사도 0.90 이상
- 최종 복합 점수 0.78 이상
- 브랜드·로고·상품명 중 하나의 identity 근거 0.60 이상
- 버튼, 봉제선, 프린트, 밑창, 하드웨어 등 시각적 충돌 0개

이미지 검증을 거치지 않은 로컬 카탈로그와 일반 웹 검색 후보는 최대 `LIKELY`다.
또한 AI 웹 후보를 클릭하는 것만으로 creator 확정값이 `exact`가 되던 기존 동작을 제거했다.

## 판매처 연결 원칙

| 판매처 | STS 연결 방식 | 자동 이미지 검색 | 제한 |
|---|---|---:|---|
| AliExpress | 공식 Affiliate Image Search + promotion link | 예 | Open Platform 앱 키·signature 필요 |
| ADPICK/LinkPrice | 기존 제휴 검색·딥링크 | 아니오 | 계약된 판매처만 수수료 발생 |
| 네이버 | API HUB 이미지 색 검증 + webkr 상세 URL | 부분 | 쇼핑 검색 API는 2026-07-31 종료 |
| 무신사 | 네이버 webkr에서 검증된 `/products/{id}` 상세 URL만 | 아니오 | 공개 구매자용 전체 상품 API 없음 |
| 쿠팡 | 검증된 상세 URL/제휴 네트워크만 | 아니오 | 공개 Open API는 판매자 상품 운영 범위이며 전체 쇼핑 검색 API가 아님 |
| Amazon | Creators API 어댑터 추가 가능 | 아니오 | Associates 자격·자격 판매·credential 필요, 키워드 검색 중심 |
| Shopify | 지정 스토어별 Storefront API 어댑터 추가 가능 | 아니오 | Shopify 전체를 검색하는 글로벌 카탈로그 API가 아님 |

검색 페이지를 exact 상품 링크처럼 표시하지 않는다. 실판매 상세 URL 또는 공식 promotion
link가 없으면 후보는 검색 폴백으로 명시하고 수수료 가능 상품으로 계산하지 않는다.

## 환경변수와 진단

필수 서버 환경변수:

```
ALIEXPRESS_APP_KEY
ALIEXPRESS_APP_SECRET
ALIEXPRESS_APP_SIGNATURE
```

선택 환경변수:

```
ALIEXPRESS_TRACKING_ID
ALIEXPRESS_MEDIA_USER_ID
ALIEXPRESS_API_ENDPOINT=https://eco.taobao.com/router/rest
```

`/api/vision-health`의 `aliExpress.configured`가 `true`여야 실제 이미지 검색이 실행된다.
Gemini 키도 있으면 `exactVerification`이 활성화된다. 어느 키가 없어도 기존 catalog,
ADPICK, Naver web, LLM 폴백은 계속 동작한다.

## 다음 GPU 검색 서비스 설계

트래픽과 자체 상품 카탈로그가 충분해지면 서버리스 라우트 앞에 별도 GPU 서비스를 둔다.
현재 Next.js/Vercel 프로세스에 대형 모델을 직접 적재하지 않는다.

1. Grounding DINO로 자유 텍스트 기반 open-set detector를 실행한다.
2. SAM 2로 객체 마스크와 배경 제거 crop을 만든다.
3. FashionCLIP과 SigLIP 2의 정규화 임베딩을 함께 생성한다.
4. pgvector 또는 FAISS에서 `category hard filter → image ANN top 200`을 수행한다.
5. 브랜드/OCR/GTIN/model code를 hard 또는 strong filter로 적용한다.
6. 상위 20개를 cross-encoder 또는 Gemini 다중 이미지 검증으로 재랭킹한다.
7. creator 수정 결과를 hard negative로 저장해 카테고리별 threshold를 보정한다.

오픈소스 기준선은 Grounding DINO(Apache-2.0), SAM 2(Apache-2.0/BSD),
FashionCLIP(MIT), Google SigLIP 2(Apache-2.0)다. 정확도 평가는 랜덤 상품이 아니라
`same SKU / same family / visually similar / unrelated` 4단계 라벨로 Recall@K,
MRR, exact precision, false-exact rate를 각각 측정한다.
