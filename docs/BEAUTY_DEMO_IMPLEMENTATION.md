# STS Beauty Demo Implementation

## 목적

Beauty Demo는 기존 Fashion Object Commerce와 분리된 단일 영상 발표 프로토타입이다. 핵심 흐름은 완성 결과에서 관심 부위를 선택하고, 그 결과를 만든 실제 적용 장면을 본 뒤, 해당 단계의 정확한 제품 정보를 확인하는 것이다.

```text
FINAL RESULT -> FACE REGION -> ACTUAL PROCESS -> APPLICATION STEP -> PRODUCT
```

이 프로토타입은 자동 분석 서비스가 아니다. 데이터가 준비되면 타임스탬프, hotspot, 제품과 사용법을 사람이 큐레이션한다.

## 격리 경계

- Beauty 도메인은 `lib/beauty/types.ts`와 `lib/beauty/demo-data.ts`를 사용한다.
- Fashion의 `Product`, `ObjectTag`, `ObjectLayer`, `/create` 데이터 모델을 Beauty 단계 모델로 재사용하지 않는다.
- 기존 Fashion 게시물과 `/`, `/create`, `/discover`, `/profile` 흐름의 의미를 변경하지 않는다.
- `/demo`와 `/beauty-demo`에 필요한 예외만 전역 내비게이션에서 제한적으로 처리한다.
- TikTok OAuth, 데이터베이스, AI 과정 추출, 제휴 및 결제 백엔드는 범위 밖이다.

## 데이터 계약

### 검증 대기 표현

| 데이터 | 표현 |
| --- | --- |
| 실제 순서, start/end, final-look 범위 | `null` |
| hotspot | `null` |
| 가격 | `null` |
| 제품 이미지 및 외부 URL | `null` |
| 판매처 | `null` |
| 확인 전 필수 표시 문자열 | `정보 확인 필요` |
| 확인 전 내부 연결 ID | `*-pending` |

UI는 `null`을 0초, 0원 또는 화면 중앙 좌표로 변환하면 안 된다. 타임스탬프가 없으면 seek 및 구간 재생을 시작하지 않고 준비 중 상태를 보여야 한다. hotspot이 없으면 오버레이만 생략하고 타임라인 선택은 유지한다. URL이 없으면 CTA를 비활성화하고 `데모용 제품 정보`를 표시한다.

### 제공 내보내기

- `BEAUTY_REGIONS`: `skin`, `base`, `eye`, `cheek`, `lip`
- `BEAUTY_PRODUCTS`: 부위별 검증 대기 제품 슬롯
- `BEAUTY_STEPS`: 부위별 검증 대기 과정 슬롯
- `BEAUTY_DEMO_LOOK`: 지정된 공개 경로와 단계 목록을 묶은 단일 룩

다섯 단계 슬롯의 배열 순서는 발표용 부위 그룹 순서이며, 크리에이터의 실제 메이크업 순서라고 주장하지 않는다. 실제 순서는 `order`가 큐레이션된 후에만 표시한다.

## 소비자 인터랙션 계약

### 초기 상태

- 세로형 크리에이터 콘텐츠가 가장 강한 시각 요소다.
- 제품명, 가격, 구매 버튼, 커미션 문구는 보이지 않는다.
- 검증된 `finalLookStart`와 `finalLookEnd`가 모두 있을 때만 완성 룩 구간을 반복한다.
- 영상 파일이 없거나 로드되지 않으면 포스터 또는 중립적인 오류 상태와 재시도 가능한 컨트롤을 제공한다.

### 과정 공개

1. 첫 의도적 탭에서 `이 룩이 만들어진 과정`을 잠시 표시하고 타임라인을 연다.
2. 부위 또는 단계가 선택되면 검증된 `startTime`으로 이동한다.
3. hotspot이 있으면 선택된 부위만 부드럽게 강조한다.
4. 실제 적용 구간을 재생하고 `endTime`에서 멈춘다.
5. 구간 시청이 끝난 뒤 단계 카드를 공개한다.
6. 가격과 구매 행동은 과정 시청 전에 노출하지 않는다.

타임스탬프가 `null`인 검증 대기 단계는 선택할 수는 있지만 재생 완료나 제품 사용 확인으로 처리하지 않는다.

### 제품과 전체 루틴

- `실제 사용 제품`과 `비슷한 컬러`를 시각적, 의미적으로 분리한다.
- exact 제품의 brand, name, shade, image는 확인된 경우에만 제품 카드로 주장한다.
- amount, method, area, layer count는 확인된 값만 표시한다.
- 외부 URL이 없으면 구매 CTA를 비활성화한다.
- `전체 루틴 보기`는 모든 검증 단계와 타임스탬프를 적용 순서대로 보여준다.
- `Shop the routine`은 이 프로토타입에서 루틴 제품 목록만 연다. 원클릭 결제 또는 실제 제휴 귀속을 주장하지 않는다.

## 발표 모드

`?present=1`은 소비자 흐름을 바꾸지 않고 다음 설명 가이드만 추가한다.

1. Result is the entry point
2. Tap a region
3. Watch the actual application
4. Reveal the exact product
5. View the complete routine
6. Purchase can later be attributed to the creator

마지막 문장:

> Fashion monetizes visible objects.
> Beauty monetizes the process behind the result.

키보드 계약:

- `R`: reset
- `1`부터 `5`: 부위 선택
- `P`: 발표 가이드 토글
- `Enter` 또는 `Space`: 포커스된 컨트롤 실행

Reset은 모든 sheet를 닫고 선택 부위를 지운다. final-look 구간이 검증된 경우 해당 시작점으로 이동해 반복 재생을 재개하며, 아직 검증되지 않은 경우에는 안전한 초기 미디어 상태로 돌아간다.

## 접근성과 반응형 기준

- 모든 상호작용 컨트롤에 목적이 드러나는 `aria-label`을 제공한다.
- 390 x 844 뷰포트에서 콘텐츠와 하단 sheet가 잘리지 않아야 한다.
- 데스크톱에서는 모바일 발표 프레임을 중앙에 둔다.
- `prefers-reduced-motion`에서는 이동 애니메이션을 줄이거나 제거한다.
- 일반 sheet 모션은 기존 Quiet Luxury의 절제된 220~280ms 범위를 사용한다.
- Beauty accent는 제한적으로 사용하고, 전체 화면을 핑크 또는 화장품 쇼핑몰처럼 만들지 않는다.

## 사실성 및 사업 범위

- 모든 타임스탬프와 제품은 수동 큐레이션 대상이다.
- 자동 과정 추출, 자동 hotspot 생성, 제품 자동 식별은 미래 작업이다.
- 현재 프로토타입은 네트워크나 API 키 없이 동작해야 한다.
- 실제 affiliate attribution, checkout, creator settlement는 구현되었다고 주장하지 않는다.
- 장래의 사업 가능성을 설명할 수는 있지만 현재 기능과 혼동되는 문구를 사용하지 않는다.

## 검증 체크리스트

- [ ] 원본 영상 자산으로 메타데이터 및 모든 타임스탬프를 수동 검증
- [x] `/` Fashion 화면과 기존 전역 shell이 유지되는지 시각 확인
- [x] `/create` Fashion 작성 화면과 기존 모바일/데스크톱 내비게이션 확인
- [x] `/demo`에서 두 데모 진입 확인
- [x] `/beauty-demo` 기본 모드와 `?present=1` 직접 새로고침 확인
- [x] 영상 누락 상태에서 오류 문구, 재시도, 타임라인 fallback 확인
- [ ] 실제 영상에서 seek, 구간 정지, 단계 카드 공개를 반복 확인 (원본 영상과 검증 타임스탬프 필요)
- [x] 선택, 키보드 단축키, dialog focus 복귀, reset 반복 확인
- [x] 390 x 844 clipping 확인
- [x] 데스크톱 중앙 정렬 확인
- [x] TypeScript typecheck, `npm run build`, Vitest 전체 통과 확인

현재 입력 자산 상태와 수동 큐레이션 TODO는 `docs/BEAUTY_DEMO_MAP.md`가 단일 기준이다.
