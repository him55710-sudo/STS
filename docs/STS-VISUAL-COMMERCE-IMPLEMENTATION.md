# STS 비주얼 커머스 적용 계획

이 문서는 Part 03의 제로샷 분류·임베딩·유사 검색 실습을 STS의 실제 웹 구조에 적용한 운영 기준이다.

## 1. 이번 적용의 결론

STS에서 상품을 잘 연결하려면 이미지 전체를 한 번에 상품명으로 검색하면 안 된다. 다음 세 단계를 분리해야 한다.

1. 객체 인식: 사진에서 사람·배경이 아닌 구매 가능한 객체를 tight box와 실루엣으로 찾는다.
2. 상품 식별: 객체 crop과 속성(브랜드 근거, 로고, 텍스트, 색, 형태)을 이용해 실제 SKU 후보를 만든다.
3. 수익화: 크리에이터가 확정한 상품의 상세 URL을 제휴 네트워크 링크로 변환하고 `p_data`로 게시물·객체 단위 성과를 묶는다.

현재 STS는 1번과 2번의 기본 경로를 이미 갖고 있다. 이번 변경으로 3번을 ADPICK BIZ에 연결하고, 로컬 이미지 폴더를 서버 개발 환경에서 직접 확인할 수 있게 했다.

## 2. 현재 파이프라인

```text
사진 업로드
  -> /api/detect
     -> Gemini/LLM open-vocabulary detection
     -> 클라이언트 MediaPipe mask refinement
     -> object: box + polygon + tone + attributes
  -> buildRetrievalQuery
     -> 로컬 카탈로그 score
     -> /api/product-search
        -> ADPICK search (키가 있을 때, 실제 commissionlink 우선)
        -> Naver API HUB/webkr (키가 있을 때)
        -> LLM web research (키가 있을 때)
     -> 텍스트·브랜드·로고·색상·visual score 재랭킹
     -> exact / likely / similar tier
  -> 크리에이터 확인
  -> ProductSheet CTA
     -> /api/outbound
        -> ADPICK directlink + p_data (지원 URL인 경우)
        -> 원본 상품 URL 폴백
  -> /api/affiliate/conversions
     -> ADPICK 전환·매출·커미션 조회
```

## 3. 객체 인식과 상품 태깅 원칙

### 객체 인식

- `person`을 상품으로 저장하지 않는다.
- 상의·아우터·하의·신발·가방·시계·주얼리를 각각 독립 객체로 요청한다.
- 작은 액세서리는 낮은 confidence라도 버리지 않고, 이후 검수 화면에서 후보를 확인한다.
- Gemini box는 후보 생성용이고, 최종 탭 영역은 MediaPipe polygon을 우선한다.
- 모델이 특정 브랜드를 추측하지 않도록 `brandCandidates`에는 눈에 보이는 로고·텍스트·시그니처 근거가 있을 때만 넣는다.

### 실제 상품과 최대한 비슷하게 찾는 순서

1. canonical class로 검색 범위를 줄인다. 예: `watch`, `bag`, `outerwear`.
2. 브랜드 후보의 confidence가 0.5 이상이면 브랜드를 검색어 앞에 둔다.
3. 객체 마스크 내부의 대표색을 검색어와 재랭킹에 사용한다. 배경색은 사용하지 않는다.
4. 로고 텍스트·visible text·distinctive feature를 별도의 검색어 변형으로 만든다.
5. 실제 판매 후보는 로컬 카탈로그, ADPICK 검색, 네이버 webkr, LLM 조사 순으로 합친다.
6. 외부 후보는 시각 검증이 없으면 exact가 될 수 없다. 현재 정책은 웹 후보의 최대 tier를 likely로 제한한다.
7. exact는 브랜드 근거, 상품명/로고 근거, 색상, 충분한 최종 점수가 동시에 있을 때만 허용한다.

### CLIP·SigLIP2 적용 경계

Part 03의 CLIP·SigLIP2·FAISS 실습은 Python GPU/CPU 워커에 가장 적합하다. STS는 Next.js/Vercel 서버리스이고 현재 Python·PyTorch 런타임이 없으므로, 모델을 Next.js 번들에 넣지 않는다.

실서비스에서 붙일 때의 계약은 다음과 같다.

```json
POST /embed
{
  "model": "siglip2",
  "image": "data:image/jpeg;base64,...",
  "crop": {"x": 0.31, "y": 0.18, "w": 0.30, "h": 0.38}
}
```

```json
{
  "embedding": [0.012, -0.044, 0.091],
  "model": "siglip2",
  "dimension": 768,
  "normalized": true
}
```

카탈로그 상품은 SKU별 대표 이미지 여러 장을 같은 모델로 임베딩해 저장하고, query crop은 cosine similarity로 top-k를 찾는다. 그 뒤 브랜드·색·가격·재고·제휴 여부를 재랭킹한다. 모델이 바뀌면 전체 카탈로그를 다시 임베딩하고 `model_version`을 함께 저장한다.

권장 가중치는 초기값일 뿐이며, 검증셋의 Recall@1/3/5로 조정한다.

```text
final = 0.45 * image_embedding
      + 0.20 * brand_evidence
      + 0.15 * logo_or_text
      + 0.10 * color
      + 0.05 * category
      + 0.05 * page_trust
```

제휴 여부는 시각 유사도를 대체하면 안 된다. 현재 구현에서도 ADPICK 링크가 있다는 이유로 작은 tie-breaker만 추가한다.

## 4. ADPICK BIZ 실제 연동

ADPICK BIZ의 `directlink`은 상품 상세 URL을 받아 302로 커미션 링크 상품 페이지로 이동시키고, `p_data`로 자체 식별자를 전달한다. STS는 API 키를 브라우저에 넣지 않고 `/api/outbound` 서버 라우트에서 호출한다.

### 환경변수

`.env.local`에 다음을 넣는다.

```env
ADPICK_API_KEY=발급받은_서버전용_API_KEY
ADPICK_ALLOW_SEARCH_URLS=false
ADPICK_FORCEREDIRECT=false
AFFILIATE_ADMIN_TOKEN=운영자용_긴_랜덤_토큰
STS_PRODUCT_URL_OVERRIDES_JSON={"pl-polo-oxford":"https://제휴몰의-실제-상품-상세-url"}
```

검색 목록 URL은 동일 상품을 보장하지 않으므로 자동 구매 링크나 ADPICK 대상에서 제외한다. 현재 검증된 여성 클래식핏 옥스포드 셔츠는 무신사 상품 상세 URL로 연결하고, 검증되지 않은 시드 상품은 `/api/outbound`가 네이버·무신사·쿠팡 검색 후보 화면을 반환한다.

### 클릭 귀속

ProductSheet가 다음 URL을 연다.

```text
/api/outbound?productId=pl-polo-oxford&postId=post-look1&objectId=l1-shirt
```

판매처별 링크 상태는 다음 API에서 확인할 수 있다.

```text
GET /api/product-links?productId=plw-polo-oxford
```

서버가 ADPICK에 전달하는 `p_data`는 다음 형태이며 50자 이하로 정규화된다.

```text
sts_{productId}_{postId}_{objectId}_{creatorId}
```

ADPICK API 키가 없거나 URL이 지원 몰의 상세 URL이 아니면 원래 상품 URL로 이동한다. 따라서 개발·검수 환경에서도 CTA가 막히지 않는다.

### 전환 조회

`/api/affiliate/conversions`는 `x-sts-admin-token` 헤더를 요구하는 서버 프록시다.

```powershell
$headers = @{ "x-sts-admin-token" = "운영자용_토큰" }
Invoke-RestMethod "http://localhost:3000/api/affiliate/conversions?sdate=20260801&edate=20260831&p_data=sts_pl-polo-oxford" -Headers $headers
```

이 응답을 다음 단계에서 Supabase의 `affiliate_conversions` 테이블에 일별 upsert하고, `p_data`를 creator/post/object 차원으로 분해해 정산 원장에 연결한다. 현재는 외부 API의 원본 응답을 안전하게 조회하는 단계까지 구현했다.

## 5. 로컬 사진 데이터 연결

개발 환경에서 `STS_LOCAL_IMAGE_DIR`이 비어 있으면 프로젝트 상위의 `STS image/assets`를 자동으로 읽는다.

```text
GET /api/local-catalog
GET /api/local-catalog?name=real_fashion_01.jpg
```

첫 번째 응답은 파일명·카테고리·크기·수정 시각·브라우저에서 확인 가능한 이미지 URL을 반환한다. 두 번째 응답은 경로 순회 문자를 거부하고 등록된 이미지 확장자만 스트리밍한다.

다른 로컬 폴더를 쓰려면:

```env
STS_LOCAL_IMAGE_DIR=C:\\data\\sts-products
```

운영 배포에서는 로컬 경로가 존재하지 않으므로 S3/Supabase Storage 같은 업로드 저장소와 SKU 메타데이터 테이블로 교체한다. 로컬 엔드포인트는 배포 카탈로그의 대체물이 아니라 모델·검색 실습용 입력 확인 표면이다.

## 6. 검증 데이터와 KPI

### 최소 검증셋

- 이미지 50장을 무작위로 추출한다.
- 각 이미지에서 사람 검수자가 객체 종류와 연결 SKU를 기록한다.
- 작은 액세서리·겹친 의류·가림이 있는 객체를 별도 태그한다.
- 모델 결과에는 `pipelineVersion`, provider, confidence, tier, matchReason을 남긴다.

### 품질 지표

| 단계 | 지표 | 출시 기준 초안 |
|---|---|---:|
| 객체 인식 | object recall | 90% 이상 |
| 마스크 | silhouette presence | 95% 이상 |
| 유사 검색 | Recall@5 | 90% 이상 |
| 정확 태깅 | exact precision | 95% 이상 |
| 검수 부담 | 사람 수정이 필요한 객체 비율 | 25% 이하 |
| 수익화 | affiliate outbound 비율 | 제휴 카탈로그의 80% 이상 |
| 제품 퍼널 | Card → Outbound | 35% 이상 |

exact precision을 recall보다 먼저 보는 이유는 틀린 상품을 동일 상품으로 표시하면 구매 신뢰와 수수료 귀속을 동시에 훼손하기 때문이다. 근거가 부족하면 similar로 낮추고, 사람이 확인하게 한다.

### 데이터 품질 체크

- `objectId`는 게시물 안에서 유일해야 한다.
- `p_data`는 50자를 넘지 않아야 하고 영숫자·`._~-`만 사용한다.
- 상품 상세 URL이 없는 제휴 후보는 `affiliate=false`로 처리한다.
- conversion의 `p_data`가 존재하지 않는 게시물·객체를 가리키면 정산에서 보류한다.
- 클릭 수·주문 수·커미션은 동일 날짜 범위와 동일 timezone으로 비교한다.
- 취소·대기·확정 상태를 합산해 확정 수익처럼 표시하지 않는다.

## 7. 그대로 실행하는 순서

1. `npm install` 후 `npm run dev`로 앱을 띄운다.
2. `/api/local-catalog`에서 로컬 이미지가 보이는지 확인한다.
3. `/create`에서 로컬 사진을 업로드하고 객체 탐지 결과와 후보 근거를 확인한다.
4. ADPICK BIZ API 키를 서버 환경변수에 넣고 `/api/product-search`에서 `adpickCount`를 확인한다.
5. 실제 지원 몰의 상품 상세 URL을 `STS_PRODUCT_URL_OVERRIDES_JSON`에 넣는다.
6. 피드의 상품 CTA를 눌러 `/api/outbound`가 302로 이동하는지 확인한다.
7. ADPICK 테스트 도구에서 구매 테스트를 한 뒤 conversion API에서 동일한 `p_data`가 조회되는지 확인한다.
8. 50장 검증셋의 Recall@5·exact precision을 기록한다.
9. 데이터가 쌓이면 CLIP/SigLIP2 임베딩 워커를 `/embed` 계약 뒤에 추가하고, 카탈로그 전체를 같은 `model_version`으로 재색인한다.

## 8. 현재 한계와 다음 구현

- API 키가 이 저장소에 없으므로 실제 ADPICK 302와 구매 전환은 로컬에서 자동 검증하지 않았다.
- 현재 시각 유사도는 마스크 대표색·상품 이미지 색상 검증이 중심이며, CLIP/SigLIP2 벡터 검색은 별도 워커 경계로 남겨 두었다.
- 데모 상품 URL 일부는 검색 페이지라서 실제 동일 상품·제휴 수수료 대상이 아니다. 상세 URL override 또는 ADPICK search의 `commissionlink`를 사용해야 한다.
- 전환 조회 결과를 정산 원장으로 저장하는 Supabase migration과 creator별 지급 배치는 다음 단계다.
