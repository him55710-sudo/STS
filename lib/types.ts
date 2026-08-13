/** 데이터 모델 — 사업계획서 §10 Entity 모델 기반 */

export type Category = "fashion" | "beauty" | "interior" | "tech" | "lifestyle";

/** exact / similar 구분은 UI·데이터 모두에서 필수 (PRD Principle 4, 사업계획서 §09) */
export type Exactness = "exact" | "similar";

export interface Product {
  id: string;
  brand: string;
  name: string;
  price: number;
  currency: "KRW";
  retailer: string;
  /** 외부 판매처 URL — MVP는 link-out only */
  url: string;
  image: string;
  category: Category;
  /** 제휴(affiliate) 링크 여부 — 경제적 이해관계 표시에 사용 */
  affiliate: boolean;
  /** 제휴 수수료율 (0~1). 크리에이터는 이 중 70%를 배분받는다 */
  commissionRate?: number;
  similarIds: string[];
}

/** 콘텐츠 내 구매 가능 객체 (ObjectTag) — 좌표는 0~1 정규화 */
export interface ObjectTag {
  id: string;
  label: string;
  /** bounding geometry (normalized) */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * 실루엣 폴리곤 (normalized) — fashion_v2 파이프라인 산출물.
   * 있으면 UI는 bbox 대신 실제 object shape로 하이라이트·히트테스트한다.
   * 없으면 bbox로 자연 강등 (하위호환).
   */
  polygon?: [number, number][];
  /**
   * 다중 링 실루엣 — 신발 좌/우처럼 분리된 컴포넌트를 독립 링으로 유지.
   * 있으면 polygon보다 우선 사용 (렌더는 M..Z M..Z, 히트테스트는 any-ring).
   */
  polygons?: [number, number][][];
  /** canonical fashion class (vision-config FASHION_ONTOLOGY 기준) */
  canonicalClass?: string;
  /** 연결 상품. null = Unlinked Object (PRD §58 방법 4) */
  productId: string | null;
  exactness: Exactness;
  confidence: number;
}

export interface Post {
  id: string;
  creatorId: string;
  image: string;
  /** width/height 비율 (ex. 0.75 = 3:4) */
  ratio: number;
  caption: string;
  category: Category;
  likes: number;
  objects: ObjectTag[];
  createdAt: string;
  /** 크리에이터 업로드 게시물 여부 (런타임 생성) */
  isUserPost?: boolean;
}

export interface Creator {
  id: string;
  handle: string;
  name: string;
  bio: string;
  followers: number;
  category: Category;
  /** 아바타 색 (이미지 대신 이니셜 + 톤) */
  tone: string;
  /** 실사 아바타 이미지 (있으면 이니셜 대신 표시) */
  avatarImage?: string;
  /** 수익 공유 파트너 크리에이터 (인증 배지) */
  verified?: boolean;
}

/** 로그인 세션 (Google=Supabase OAuth, kakao=데모) */
export interface SessionUser {
  name: string;
  provider: "google" | "kakao";
  /** OAuth 로그인 시 제공 (데모 로그인은 없음) */
  email?: string;
  /** 프로필 사진 URL (Google 계정 사진 등) */
  avatarUrl?: string;
}

/** 이벤트 taxonomy — 사업계획서 §10 */
export type EventType =
  | "asset_view"
  | "object_hint_view"
  | "object_tap"
  | "card_open"
  | "outbound_click"
  | "product_save"
  | "post_save"
  | "post_like"
  | "publish";

export interface TrackedEvent {
  id: string;
  type: EventType;
  postId?: string;
  productId?: string;
  objectId?: string;
  ts: number;
}

/** AI 탐지 결과 (API 응답) */
export interface DetectedObject {
  label: string;
  labelKo: string;
  category: Category;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  /** 탐지 영역의 평균 색 (#rrggbb) — 후보 랭킹의 색상 유사도에 사용 */
  tone?: string;
  /** 마스크 픽셀 기반 보조 색상들 (#rrggbb) */
  secondaryTones?: string[];
  /** 실루엣 폴리곤 (normalized) — 마스크 엔진이 추출 성공 시 */
  polygon?: [number, number][];
  /** 다중 링 실루엣 (신발 좌/우 등) */
  polygons?: [number, number][][];
  /** canonical fashion class */
  canonicalClass?: string;
  /** 탐지 단계에서 추출된 구조화 속성 (브랜드 후보·로고·패턴 등) */
  attributes?: FashionAttributes;
}

/** 객체별 구조화 속성 — 상품 검색 쿼리·재랭킹·근거 표시에 사용 */
export interface FashionAttributes {
  brandCandidates: { brand: string; confidence: number; evidence: string[] }[];
  primaryColorName?: string;
  pattern?: "solid" | "stripe" | "check" | "graphic" | "logo" | "denim" | "other";
  fit?: string;
  logo?: { detected: boolean; text?: string; description?: string; confidence: number };
  visibleText?: string[];
  distinctiveFeatures: string[];
}
