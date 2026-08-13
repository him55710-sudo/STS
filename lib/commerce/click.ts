import { merchantById, offersForProduct, programsForMerchant, resolveOffersFor } from "./index";
import { SEED_OFFERS } from "./seed";
import { providerForProgram } from "./providers/registry";
import type { MerchantOffer } from "./types";

/**
 * 클릭 준비 — /go/[offerId] 라우트의 순수 코어 (단위 테스트 대상).
 * 오퍼/판매처 검증 → provider 선택 → 클릭 행 + 추적 URL 생성.
 *
 * 판매처가 비활성이면 같은 상품의 최적 대체 오퍼로 폴백한다 —
 * 죽은 링크로 인텐트를 버리지 않는다 (대체 오퍼 기준으로 클릭이 기록된다).
 */

export const SOURCE_SURFACES = ["feed", "post", "creator_shop", "saved", "discover"] as const;
export type SourceSurface = (typeof SOURCE_SURFACES)[number];

export interface ClickContext {
  viewerId: string | null;
  anonymousId: string | null;
  creatorId: string | null;
  postId: string | null;
  objectId: string | null;
  surface: SourceSurface;
}

export interface PreparedClick {
  clickId: string;
  redirectUrl: string;
  /** commerce_clicks 삽입용 행 (snake_case = DB 컬럼) */
  row: {
    id: string;
    viewer_id: string | null;
    anonymous_id: string | null;
    creator_id: string | null;
    post_id: string | null;
    object_id: string | null;
    canonical_product_id: string | null;
    offer_id: string;
    merchant_id: string;
    provider: string;
    source_surface: SourceSurface;
  };
  /** 원 오퍼가 비활성 판매처라 대체 오퍼로 폴백했는가 */
  substituted: boolean;
}

export type PrepareClickResult =
  | { ok: true; click: PreparedClick }
  | { ok: false; status: 404 | 410; reason: "unknown_offer" | "no_available_offer" };

const offerById = new Map(SEED_OFFERS.map((o) => [o.id, o]));

export function findOffer(offerId: string): MerchantOffer | undefined {
  return offerById.get(offerId);
}

/** 의존성 주입 지점 — 테스트에서 비활성 판매처 시나리오를 구성할 때 사용 */
export interface ClickDeps {
  findOffer: typeof findOffer;
  merchantById: typeof merchantById;
  resolveOffersFor: typeof resolveOffersFor;
  programsForMerchant: typeof programsForMerchant;
}

const DEFAULT_DEPS: ClickDeps = { findOffer, merchantById, resolveOffersFor, programsForMerchant };

export function prepareClick(
  offerId: string,
  ctx: ClickContext,
  clickId: string,
  deps: ClickDeps = DEFAULT_DEPS
): PrepareClickResult {
  const requested = deps.findOffer(offerId);
  if (!requested) return { ok: false, status: 404, reason: "unknown_offer" };

  // 판매처 상태 검증 — 비활성이면 같은 상품의 최적 오퍼로 대체
  let offer = requested;
  let merchant = deps.merchantById(offer.merchantId);
  let substituted = false;
  if (!merchant || merchant.status !== "active") {
    const { best } = deps.resolveOffersFor(requested.canonicalProductId);
    if (!best) return { ok: false, status: 410, reason: "no_available_offer" };
    offer = best.offer;
    merchant = best.merchant;
    substituted = true;
  }

  const program =
    deps.programsForMerchant(merchant.id).find((p) => p.status !== "ended") ?? null;
  const adapter = providerForProgram(program?.provider);
  const redirectUrl = adapter.createTrackingUrl({ offer, merchant, program, clickId });

  return {
    ok: true,
    click: {
      clickId,
      redirectUrl,
      substituted,
      row: {
        id: clickId,
        viewer_id: ctx.viewerId,
        anonymous_id: ctx.anonymousId,
        creator_id: ctx.creatorId,
        post_id: ctx.postId,
        object_id: ctx.objectId,
        canonical_product_id: offer.canonicalProductId,
        offer_id: offer.id,
        merchant_id: merchant.id,
        provider: adapter.id,
        source_surface: ctx.surface,
      },
    },
  };
}

// ── 클라이언트 헬퍼 ──────────────────────────────────────────────────────────

export interface GoContext {
  postId?: string;
  objectId?: string;
  creatorId?: string;
  surface: SourceSurface;
}

/** CTA가 여는 /go URL — 컨텍스트가 있는 한 어트리뷰션은 절대 버리지 않는다 */
export function buildGoUrl(offerId: string, ctx: GoContext): string {
  const q = new URLSearchParams({ sf: ctx.surface });
  if (ctx.postId) q.set("post", ctx.postId);
  if (ctx.objectId) q.set("obj", ctx.objectId);
  if (ctx.creatorId) q.set("creator", ctx.creatorId);
  return `/go/${encodeURIComponent(offerId)}?${q.toString()}`;
}

/** 상품의 best offer id — /go 경유가 가능한 상품인지 판별 (커스텀 상품은 null) */
export function bestOfferIdFor(productId: string | null | undefined): string | null {
  if (!productId || offersForProduct(productId).length === 0) return null;
  return resolveOffersFor(productId).best?.offer.id ?? null;
}

export function parseSurface(raw: string | null): SourceSurface {
  return (SOURCE_SURFACES as readonly string[]).includes(raw ?? "") ? (raw as SourceSurface) : "feed";
}
