# STS Beauty Demo Map

## 상태와 데이터 원칙

이 문서는 한 개의 크리에이터 메이크업 영상을 수동으로 큐레이션하기 위한 기준표다. 현재 저장소에는 지정된 영상, 포스터, 제품 이미지와 크리에이터 확인 자료가 없으므로 검증되지 않은 사실을 채우지 않았다.

- 타임스탬프와 제품 정보는 반드시 사람이 원본 영상 및 크리에이터 제공 자료와 대조한 뒤 입력한다.
- 자동 과정 추출과 자동 얼굴 부위 인식은 향후 작업이며, 현재 프로토타입의 기능으로 주장하지 않는다.
- 실제 제휴 추적, 결제, 크리에이터 정산 백엔드는 구현 또는 연결되었다고 주장하지 않는다.
- 제공된 UI 참고 이미지는 인터랙션과 정보 위계 참고용이다. 이미지 속 인물, 제품명, 색상, 가격, 시각적 타임스탬프는 이 데모의 사실 데이터가 아니다.

`demo-data.ts`의 `*-pending` ID는 화면 연결을 유지하기 위한 내부 식별자일 뿐, 실제 제품이나 실제 적용 순서를 뜻하지 않는다. 검증 불가능한 숫자 및 좌표는 `null`, 필수 표시 문자열은 `정보 확인 필요`로 유지한다.

## 입력 자산 점검

2026-09-01 저장소 점검 결과다.

| 입력 | 기대 경로 | 상태 | 다음 작업 |
| --- | --- | --- | --- |
| 메이크업 영상 | `public/beauty-demo/creator-makeup.mp4` | TODO: 파일 없음 | 원본 파일을 해당 경로에 전달 |
| 포스터 | `public/beauty-demo/poster.jpg` | TODO: 파일 없음 | 영상과 일치하는 포스터를 전달 |
| 제품 이미지 | `public/beauty-demo/products/` | TODO: 디렉터리와 파일 없음 | 크리에이터 확인 제품의 이미지와 출처를 전달 |
| 크리에이터 데이터 | 제공 자료 | TODO: 자료 없음 | 이름, 핸들, 캡션, 제품, 사용법 확인 자료 전달 |

FFprobe는 로컬 환경에서 사용할 수 있지만 원본 영상이 없어 메타데이터 명령을 실행할 대상이 없었다. 임시 프레임은 생성하거나 커밋하지 않았다.

## 영상 메타데이터

| 항목 | 검증 값 |
| --- | --- |
| duration | TODO: 원본 영상으로 확인 |
| width | TODO: 원본 영상으로 확인 |
| height | TODO: 원본 영상으로 확인 |
| orientation | TODO: width/height 및 회전 메타데이터로 확인 |
| representative frames | TODO: 원본에서 검토용으로 추출한 뒤 커밋하지 않고 삭제 |

자산이 전달되면 아래와 같이 확인한다.

```powershell
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,rotation -of json public/beauty-demo/creator-makeup.mp4
ffmpeg -ss <verified-second> -i public/beauty-demo/creator-makeup.mp4 -frames:v 1 <temporary-path>.jpg
```

## 최종 룩 구간

| start | end | 상태 |
| --- | --- | --- |
| TODO | TODO | 완성된 메이크업이 안정적으로 보이는 짧은 구간을 사람이 확인해야 함 |

완료 조건:

- `0 <= finalLookStart < finalLookEnd <= duration`
- 제품 적용 장면이 아닌 완성 결과 장면
- 반복 재생 시 컷 연결이 과도하게 튀지 않는 짧은 구간

## 과정 단계 지도

현재 다섯 행은 요구된 부위 그룹의 데이터 슬롯이다. 실제 영상 속 단계 수, 적용 순서, 중복 레이어를 의미하지 않는다.

| 부위 | 실제 순서 | 시작 | 종료 | 제품 | shade | amount | method | area | layer count | hotspot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SKIN | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| BASE | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| EYE | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| CHEEK | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| LIP | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |

각 실제 단계의 완료 조건:

1. `startTime`은 제품이 해당 부위에 실제로 닿기 직전 또는 적용이 시작되는 프레임이다.
2. `endTime`은 해당 적용 행동이 끝나는 프레임이며 다음 장면으로 넘어가지 않는다.
3. 제품, shade, amount, method, application area, layer count는 크리에이터 자료 또는 영상에서 명확히 확인된 값만 기록한다.
4. hotspot은 영상 프레임에 대한 정규화 비율 좌표 `x, y, w, h`로 수동 입력하며 모두 `0..100` 범위에 둔다.
5. hotspot이 확인되지 않아도 타임라인 선택은 동작해야 하므로 `null`을 허용한다.
6. 제품 URL은 실제 상세 페이지를 확인한 경우에만 기록한다. 없으면 `null`로 두고 구매 CTA를 비활성화한다.
7. 비슷한 컬러는 실제 사용 제품과 분리하고, 확인된 대안만 `similarIds`에 연결한다.

## 남은 수동 큐레이션 TODO

- [ ] 영상과 포스터 파일 수령
- [ ] duration, width, height, rotation 확인
- [ ] 대표 프레임 검토 후 임시 파일 삭제
- [ ] 완성 룩 반복 구간 확정
- [ ] 실제 적용 장면별 start/end 확정
- [ ] 실제 적용 순서와 중복 레이어 확인
- [ ] 크리에이터 이름, 핸들, 캡션, 아바타 사용 권리 확인
- [ ] 각 단계의 정확한 제품, shade, amount, method, area 확인
- [ ] 제품 이미지, 가격, 판매처, 상세 URL 확인
- [ ] 수동 hotspot 좌표 확인
- [ ] 실제 사용 제품과 비슷한 컬러 대안을 분리 검수
