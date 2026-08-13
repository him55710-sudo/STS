import type { Product } from "../types";
import { resolveOffers, type ResolvedOffers } from "./offer-resolver";
import {
  SEED_AFFILIATE_PROGRAMS,
  SEED_CANONICAL_PRODUCTS,
  SEED_MERCHANTS,
  SEED_OFFERS,
} from "./seed";
import type { AffiliateProgram, CanonicalProduct, Merchant, MerchantOffer } from "./types";

/**
 * Commerce Graph 조회 API.
 *
 * Phase 2에서는 시드 그래프(lib/commerce/seed.ts)가 데이터 소스다 — DB의
 * commerce 테이블에는 동일 내용이 시드되어 있고(supabase/migrations), 가격/재고
 * 동기화가 생기는 시점에 이 모듈의 소스만 DB 조회로 바뀐다 (조회 API는 유지).
 */

const canonicalMap = new Map(SEED_CANONICAL_PRODUCTS.map((c) => [c.id, c]));
const merchantMap = new Map(SEED_MERCHANTS.map((m) => [m.id, m]));
const offersByProduct = new Map<string, MerchantOffer[]>();
for (const o of SEED_OFFERS) {
  const list = offersByProduct.get(o.canonicalProductId) ?? [];
  list.push(o);
  offersByProduct.set(o.canonicalProductId, list);
}

export const canonicalById = (id: string | null | undefined): CanonicalProduct | undefined =>
  id ? canonicalMap.get(id) : undefined;

export const merchantById = (id: string): Merchant | undefined => merchantMap.get(id);

export const offersForProduct = (canonicalProductId: string): MerchantOffer[] =>
  offersByProduct.get(canonicalProductId) ?? [];

export const programsForMerchant = (merchantId: string): AffiliateProgram[] =>
  SEED_AFFILIATE_PROGRAMS.filter((p) => p.merchantId === merchantId);

/** canonical product의 오퍼 랭킹 (Buy CTA + 다른 판매처) */
export function resolveOffersFor(canonicalProductId: string): ResolvedOffers {
  return resolveOffers(offersForProduct(canonicalProductId), merchantById);
}

// ── legacy 호환 뷰 ───────────────────────────────────────────────────────────
// 기존 UI 전면(match·retrieval·saved·creator shop 등)은 Product 타입을 쓴다.
// canonical + best offer를 평탄화해 동일 id의 Product 뷰를 제공한다 —
// "상품의 가격/판매처/링크"는 이제 항상 최적 오퍼에서 나온다.

function toLegacyProduct(c: CanonicalProduct): Product {
  const { best } = resolveOffersFor(c.id);
  const anyOffer = best?.offer ?? offersForProduct(c.id)[0];
  return {
    id: c.id,
    brand: c.brand,
    name: c.modelName,
    price: anyOffer?.price ?? 0,
    currency: "KRW",
    retailer: best ? best.merchant.name : anyOffer ? (merchantById(anyOffer.merchantId)?.name ?? "판매처") : "판매처",
    url: anyOffer?.affiliateUrl ?? anyOffer?.productUrl ?? "",
    image: c.primaryImage,
    category: c.category,
    affiliate: (anyOffer?.commissionRate ?? 0) > 0,
    commissionRate: anyOffer?.commissionRate ?? undefined,
    similarIds: c.attributes.similarIds ?? [],
  };
}

/** 시드 canonical 전체의 legacy Product 뷰 — lib/catalog.ts PRODUCTS의 소스 */
export const LEGACY_PRODUCT_VIEWS: Product[] = SEED_CANONICAL_PRODUCTS.map(toLegacyProduct);

export type { AffiliateProgram, CanonicalProduct, Merchant, MerchantOffer } from "./types";
export type { RankedOffer, ResolvedOffers } from "./offer-resolver";
