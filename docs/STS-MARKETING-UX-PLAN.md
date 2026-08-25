# STS 홍보 사이트 UX/UI 기획

## 1. 참고 사이트에서 가져온 패턴

| 참고 | 관찰한 핵심 | STS 적용 |
| --- | --- | --- |
| Pinterest Visual Search | 이미지를 먼저 보여주고, 이미지 속 특정 영역을 선택한 뒤 스타일·색상·소재로 탐색을 좁힌다. | 랜딩 첫 화면에서 모델 사진을 중심에 두고 `스웨트셔츠 / 숄더백 / 와이드 팬츠 / 스니커즈` 객체 태그를 직접 누르게 한다. |
| ShopMy | 쇼핑객·크리에이터·브랜드를 분리해 설명하고, 크리에이터의 디지털 숍·제휴 링크·파트너십 흐름을 가치 제안으로 만든다. | `크리에이터 스튜디오` 미리보기, 제휴 링크, 게시물별 수익 흐름을 랜딩 안에서 보여준다. |
| LTK | “한 번 발행하고 어디서든 공유”하는 배포성과 데이터 기반 성장 도구를 강조한다. | STS Shop·Instagram·Link를 연결하는 `publish once, share everywhere` 블록과 조회→탭→상품 카드→구매처 이동 퍼널을 노출한다. |
| Aritzia | 여백이 큰 프리미엄 편집형 커머스, 명확한 카테고리 내비게이션, 제품 이미지 중심의 탐색을 사용한다. | STS의 기존 Quiet Luxury 토큰을 유지하고, 랜딩의 장식보다 실사 룩과 상품 카드가 주인공이 되도록 구성한다. |

## 2. STS의 한 문장 포지셔닝

**STS는 사진 속 상품 객체를 직접 탭해 구매하고, 그 발견을 크리에이터 수익으로 연결하는 Visual Commerce 플랫폼이다.**

Pinterest·LTK·ShopMy의 공통점은 발견과 수익을 연결하는 점이다. STS의 차별점은 탐색을 이미지 바깥의 검색창으로 보내지 않고, `상품 객체 자체`에서 시작한다는 점이다. 따라서 광고 문구보다 제품 경험을 첫 화면에 배치해야 한다.

## 3. 권장 사이트 구조

1. **Hero / Interactive Object Demo**
   - 헤드라인: 사진 속 모든 것이, 바로 쇼핑이 된다.
   - 실사 모델 이미지 위 객체 태그
   - 태그 선택 → 상품 후보 → 동일/유사 배지 → 실제 구매처 outbound
   - 로그인, 실제 피드, 크리에이터 시작 CTA
2. **How it works**
   - 이미지에서 발견 → 원하는 것을 탭 → 구매와 수익으로
3. **For Creators**
   - 디지털 숍, AI 후보 매칭, 크리에이터 확정, 성과 대시보드
   - `/creator`, `/create`, `/login`으로 연결
4. **Platform / Trust**
   - AI가 먼저 찾고, 크리에이터가 확정하며, STS가 제휴·성과를 측정하는 구조
5. **Final CTA**
   - STS 시작하기 / 실제 피드 보기

## 4. 핵심 인터랙션 명세

- Hotspot은 bounding box가 아니라 작고 읽을 수 있는 pill/tag로 표시한다.
- 사진·하단 객체 목록·선택된 상품 카드가 같은 상태를 공유한다.
- 상품 카드에는 `동일 상품`과 `유사 상품`을 반드시 구분한다.
- 구매 CTA는 기존 `/api/outbound`를 사용해 향후 ADPICK 등 affiliate redirect를 한 지점에서 연결한다.
- `aria-pressed`, `aria-live`, 명시적인 상품명으로 키보드·스크린리더 접근성을 유지한다.
- `prefers-reduced-motion`에서는 hotspot pulse를 제거한다.

## 5. 로그인·크리에이터 전환 흐름

`랜딩 CTA → /login → /feed`를 기본 사용자 흐름으로 둔다.

`크리에이터 시작 → /creator`에서는 크리에이터 가치 제안을 확인하고, `콘텐츠 만들기 → /create`에서 업로드·탐지·후보 확정·발행을 진행한다. 발행 이후 기존 `/analytics`에서 조회→오브젝트 탭→상품 카드→구매처 이동 퍼널을 확인한다.

## 6. 측정할 KPI

- Hero demo engagement: hotspot 클릭률
- Object Tap Rate: 노출 대비 객체 탭
- Product Card Open Rate: 객체 탭 대비 상품 카드 열림
- Outbound CTR: 상품 카드 대비 구매처 이동
- Creator activation: 가입 후 첫 게시물 발행률
- Tag confirmation rate: AI 후보 중 크리에이터가 확정한 비율
- Affiliate conversion: 구매처 이동 후 제휴 전환 이벤트

## 7. 구현 상태

- 루트 `/`: STS 홍보 랜딩 및 인터랙티브 object-first 데모
- `/feed`: 기존 실제 제품 피드 보존
- `/creator`, `/create`, `/analytics`, `/login`: 기존 제품 표면과 CTA 연결
- `/api/outbound`: 상품별 실제 구매처/affiliate redirect 연결 지점

