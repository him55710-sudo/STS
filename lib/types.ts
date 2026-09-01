/** 데이터 모델 — 사업계획서 §10 Entity 모델 기반 */

export type Category = "fashion" | "beauty" | "interior" | "tech" | "lifestyle";

export const CONTENT_KINDS = ["photo", "carousel", "reel", "video", "story", "lookbook"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const MEDIA_ASSET_KINDS = ["image", "video", "embed"] as const;
export type MediaAssetKind = (typeof MEDIA_ASSET_KINDS)[number];

export const SOCIAL_SOURCE_KINDS = ["demo_seed", "user_upload", "licensed_editorial", "brand_feed", "official_embed"] as const;
export type SocialSourceKind = (typeof SOCIAL_SOURCE_KINDS)[number];

export const SOCIAL_RIGHTS_STATUSES = ["approved", "pending", "expired", "revoked", "takedown", "blocked"] as const;
export type SocialRightsStatus = (typeof SOCIAL_RIGHTS_STATUSES)[number];

export const SOCIAL_DISCLOSURE_KINDS = ["none", "affiliate", "sponsored", "editorial", "official", "partner"] as const;
export type SocialDisclosureKind = (typeof SOCIAL_DISCLOSURE_KINDS)[number];

export const CANONICAL_MATCH_STATES = ["exact", "likely", "similar", "review", "unverified"] as const;
export type CanonicalMatchState = (typeof CANONICAL_MATCH_STATES)[number];

export const LEGACY_EXACTNESS_STATES = ["exact", "similar", "unresolved"] as const;
export type LegacyExactness = (typeof LEGACY_EXACTNESS_STATES)[number];

export const LEGACY_EXACTNESS_TO_MATCH_STATE = {
  exact: "exact",
  similar: "similar",
  unresolved: "unverified",
} as const satisfies Record<LegacyExactness, CanonicalMatchState>;

export const POST_OBJECT_EXACTNESS_SQL_VALUES = CANONICAL_MATCH_STATES;

export function mapLegacyExactnessToMatchState(value: LegacyExactness): CanonicalMatchState {
  return LEGACY_EXACTNESS_TO_MATCH_STATE[value];
}

export type Exactness = CanonicalMatchState;

export const CREATOR_ENTERED_PRODUCT_EXACTNESS = "review" as const satisfies Exactness;

export const PRODUCT_SOURCES = [
  "demo-seed",
  "catalog-api",
  "catalog-import",
  "local-fixture",
  "user-upload",
] as const;
export type ProductSource = (typeof PRODUCT_SOURCES)[number];

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
  is_demo?: true;
  source?: ProductSource;
  sourceProductId?: string;
  identityEvidence?: readonly string[];
}

export function isProvenanceBackedCatalogProduct(product: Product | null | undefined): boolean {
  if (!product || product.is_demo === true || !product.sourceProductId?.trim()) return false;
  if (
    product.source !== "catalog-api" &&
    product.source !== "catalog-import" &&
    product.source !== "local-fixture"
  ) {
    return false;
  }
  return product.identityEvidence?.some((value) => value.trim().length > 0) ?? false;
}

export function resolveExactnessForProduct(product: Product | null | undefined, requested: Exactness): Exactness {
  if (requested !== "exact") return requested;
  return isProvenanceBackedCatalogProduct(product) ? "exact" : CREATOR_ENTERED_PRODUCT_EXACTNESS;
}

/** 콘텐츠 내 구매 가능 객체 (ObjectTag) — 좌표는 0~1 정규화 */
export interface ObjectTag {
  id: string;
  ownerAssetId?: string;
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

export type MediaDimensions = { readonly width: number; readonly height: number };
export type MediaPoster = { readonly url: string; readonly dimensions: MediaDimensions };
export type MediaManifest = { readonly kind: "hls"; readonly url: string };
export type MediaObjectTag = ObjectTag & { readonly ownerAssetId: string };

export type SocialMediaAsset = {
  readonly id: string;
  readonly order: number;
  readonly kind: MediaAssetKind;
  readonly url: string;
  readonly dimensions: MediaDimensions;
  readonly poster: MediaPoster | null;
  readonly durationMs: number | null;
  readonly manifest: MediaManifest | null;
  readonly objectTags: readonly MediaObjectTag[];
};

export type SocialSourceRecord = { readonly kind: SocialSourceKind; readonly provider: string; readonly identity: string; readonly canonicalUrl: string | null; readonly externalId?: string; readonly parentIdentity?: string };
export type SocialDisclosure = { readonly kind: SocialDisclosureKind; readonly label: string | null };

export type SocialRights = {
  readonly kind: "user_owned" | "licensed" | "official_embed" | "demo";
  readonly status: SocialRightsStatus;
  readonly canDisplay: boolean;
  readonly canUseForCommerceMatching: boolean;
  readonly canRedistribute?: boolean;
  readonly evidence: string | null;
  readonly expiresAt: string | null;
};

export type ContentSourceLabel = "demo-seed" | "user-upload" | "licensed-editorial" | "brand-feed" | "official-embed";

type BasePost = {
  readonly id: string;
  readonly creatorId: string;
  readonly image: string;
  /** width/height 비율 (ex. 0.75 = 3:4) */
  readonly ratio: number;
  readonly caption: string;
  readonly category: Category;
  readonly likes: number;
  readonly objects: ObjectTag[];
  readonly createdAt: string;
  /** 크리에이터 업로드 게시물 여부 (런타임 생성) */
  readonly isUserPost?: boolean;
  readonly is_demo?: true;
  readonly source?: ContentSourceLabel;
};

type SocialPostFields<TKind extends ContentKind> = {
  readonly contentKind: TKind;
  readonly assets: readonly SocialMediaAsset[];
  readonly sourceRecord: SocialSourceRecord;
  readonly disclosure: SocialDisclosure;
  readonly rights: SocialRights;
};

export type LegacyPost = BasePost & {
  readonly contentKind?: undefined;
};

export type PhotoPost = BasePost & SocialPostFields<"photo">;
export type CarouselPost = BasePost & SocialPostFields<"carousel">;
export type ReelPost = BasePost & SocialPostFields<"reel">;
export type VideoPost = BasePost & SocialPostFields<"video">;
export type StoryPost = BasePost & SocialPostFields<"story">;
export type LookbookPost = BasePost & SocialPostFields<"lookbook">;

export type SocialPost = PhotoPost | CarouselPost | ReelPost | VideoPost | StoryPost | LookbookPost;

export type Post = LegacyPost | SocialPost;

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
  is_demo?: true;
  source?: "demo-seed";
}

/** 로그인 세션 (Google=Supabase OAuth, kakao=데모) */
export interface SessionUser {
  /** display name (profiles.display_name) */
  name: string;
  provider: "google" | "kakao";
  /** OAuth 로그인 시 제공 (데모 로그인은 없음) */
  email?: string;
  /** 프로필 사진 URL (profiles.avatar_url / Google 계정 사진) */
  avatarUrl?: string;
  /** Supabase auth user id (프로필 수정 시 필요) */
  id?: string;
  /** 고유 아이디 (profiles.handle, @없이 저장) */
  username?: string;
  /** 자기소개 (profiles.bio) */
  bio?: string;
  /** 아직 아이디를 직접 정하지 않음 (온보딩 유도) */
  handleIsDefault?: boolean;
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
  modelIdentifiers?: string[];
  materials?: string[];
  distinctiveFeatures: string[];
}
