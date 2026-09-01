# STS SigLIP2 / Colab Continuity Notes

## 목적

STS의 상품 매칭 오류를 줄이기 위해 사진 속 객체 crop과 후보 상품 이미지를 SigLIP2 임베딩으로 비교한다. 시각 유사도는 증거일 뿐이며, SKU·브랜드·카테고리·색상·상품 상세 URL 검증을 통과하지 않은 후보는 정확한 상품으로 표시하지 않는다.

## 현재 파이프라인

```text
사용자 사진 업로드
→ 객체 탐지 및 polygon/bbox crop
→ 상품 후보 수집 최대 50개
→ SigLIP2 시각 재랭킹
→ Top 10
→ Exact-SKU/메타데이터 검증
→ Top 5
→ 기존 Candidate Gate
```

기존 안전 규칙은 유지한다.

- 강한 식별자(GTIN/EAN/UPC/SKU/modelCode)가 충돌하면 시각 점수가 높아도 CONFLICT
- 시각 점수만으로 VERIFIED 금지
- 다른 colorway/SKU는 같은 제품군이어도 exact 처리 금지
- 검증되지 않은 후보는 purchaseEligible=false
- 검색 URL은 상품 상세 URL로 취급하지 않음

## 주요 구현 파일

- `app/create/page.tsx`: 업로드 이미지와 객체 crop 검색 연결
- `app/api/product-search/route.ts`: discovery → visual rerank → Top 10 verifier → Top 5 → Candidate Gate
- `lib/retrieval/object-crop.ts`: polygon 우선 crop, bbox fallback, cropMode
- `lib/retrieval/visual-embedding.ts`: VisualEmbeddingProvider, RemoteVisualEmbeddingProvider, MockVisualEmbeddingProvider
- `lib/retrieval/visual-rerank.ts`: SigLIP2 cosine similarity, preliminary score, Top 10
- `lib/retrieval/exact-sku-verifier.ts`: identifier/model/color/class conflict와 identity status
- `lib/retrieval/image-embedding-cache.ts`: image URL + modelVersion 기준 cache
- `lib/retrieval/remote-image.ts`: HTTPS 공개 주소, MIME, 용량, timeout, redirect SSRF 보호
- `lib/vision-config.ts`: visual/final ranking weights와 policy

## Colab 운영 방식

Google Colab Pro + TPU 런타임에서 SigLIP2를 실행한다. Hugging Face API key나 Google의 별도 SigLIP key가 필요한 것이 아니다.

Vercel이 접근하려면 Colab FastAPI 서버를 ngrok 또는 Cloudflare Tunnel 등으로 외부 HTTPS에 노출해야 한다.

Vercel 환경변수:

```env
SIGLIP_EMBEDDING_URL=https://공개-터널-url/embed
SIGLIP_EMBEDDING_API_KEY=Colab API에서 직접 정한 bearer secret
```

현재 Vercel provider는 다음 요청을 보낸다.

```json
{
  "model": "google/siglip2-base-patch16-224",
  "image": "data:image/jpeg;base64,..."
}
```

인증 헤더:

```http
Authorization: Bearer SIGLIP_EMBEDDING_API_KEY
```

응답은 숫자 벡터 배열 또는 다음 형식이어야 한다.

```json
{
  "embedding": [0.12, -0.03, 0.88]
}
```

Colab 세션이 종료되면 SigLIP2만 중단된다. 시스템은 `visualRerankStatus: "unavailable"`로 metadata-only fallback을 사용한다. 다만 죽은 URL이 Vercel에 남아 있으면 요청마다 timeout을 기다릴 수 있으므로, Colab을 끌 때는 `SIGLIP_EMBEDDING_URL`을 제거하거나 비활성화하고 재배포한다.

Colab을 다시 켜면 새 tunnel URL을 Vercel에 넣고 재배포한다. 터널 URL은 런타임마다 바뀔 수 있으므로 영구 운영에는 적합하지 않다.

## base64 이미지 흐름

base64 이미지는 직접 만들거나 수동으로 찾는 값이 아니다.

```text
사용자 업로드 파일
→ 브라우저 FileReader/data URL
→ 객체 polygon 또는 bbox crop
→ data:image/jpeg;base64,...
→ Vercel /api/product-search
→ Colab SigLIP2
```

상품 후보 이미지는 상품 API의 `primaryImageUrl`을 Vercel 서버가 안전하게 fetch한 뒤 SigLIP2에 전달한다. 사용자가 candidate base64를 따로 준비할 필요는 없다.

## 환경변수 구분

- `SOVRN_API_KEY`: 상품 제휴/링크 변환용. SigLIP2와 무관
- `SIGLIP_EMBEDDING_URL`: Colab 또는 별도 SigLIP2 embedding endpoint
- `SIGLIP_EMBEDDING_API_KEY`: 해당 embedding endpoint가 검사하는 bearer secret
- `GEMINI_API_KEY`: 기존 보조 이미지 검증 경로. SigLIP2를 대체하지 않음

## 검증 현황

- 신규 핵심 테스트 22개 통과
- TypeScript 통과
- production build 통과
- 브라우저에서 `/create` 객체 3개 탐지 확인
- 실제 검색 요청에 객체 이미지와 `cropMode: "polygon"` 포함 확인
- 로컬 provider 미설정 상태에서 API 200 및 `visualRerankStatus: "unavailable"` 확인
- 전체 테스트 124개 통과, 기존 `tests/affiliate/outbound-url.test.ts` 1개 실패
- 기존 catalog benchmark: GT object 54개, Recall@1 89%, Recall@3 96%, Recall@5 100%, MRR 0.935
- 실제 image-level SKU ground truth fixture가 없어 visual benchmark 수치는 아직 계산하지 않음

## 다음 재개 작업

1. Colab FastAPI endpoint가 위 요청/응답/Authorization 형식과 일치하는지 확인
2. Vercel에서 `SIGLIP_EMBEDDING_URL`과 key를 Production에 설정하고 재배포
3. 실제 이미지로 API 응답의 `visualRerankStatus: "success"`, `visualScoredCount`, `visualImageCoverage` 확인
4. 상품별 정답 SKU fixture를 수집한 뒤 metadata-only와 SigLIP2 ranking을 비교
5. SigLIP2 실측 uplift와 false exact rate를 확인하기 전에는 DINOv2를 추가하지 않음
