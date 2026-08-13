import type { ObjectTag, Product } from "../types";
import { canonicalById, resolveOffersFor } from "./index";
import type { RankedOffer } from "./offer-resolver";
import type { CanonicalProduct } from "./types";

/**
 * Product Sheet 데이터 조립 — 순수 함수 (UI와 분리, 단위 테스트 대상).
 *
 * 시트 구조 (위→아래):
 *   1. 착용 상품 = exact canonical product (또는 legacy/커스텀 폴백)
 *   2. Primary CTA = best MerchantOffer
 *   3. "다른 판매처" = 나머지 가용 오퍼 (+ 품절 오퍼는 품절 표시로만)
 *   4. "비슷한 스타일" = similar 상품들
 *
 * ── Exact / Similar 분리 불변식 ──────────────────────────────────────────
 * 오퍼 섹션(2·3)에는 오직 착용 상품(1)의 오퍼만 온다. similarStyles에는
 * 착용 상품이 절대 포함되지 않는다. 두 섹션은 어떤 경우에도 섞이지 않는다.
 * (tests/commerce/sheet-model.test.ts가 이 불변식을 검증한다)
 */

export interface CanonicalSheetModel {
  kind: "canonical";
  canonical: CanonicalProduct;
  exactness: ObjectTag["exactness"];
  bestOffer: RankedOffer | null;
  /** 다른 판매처 — 가용 오퍼 (best 제외, 점수순) */
  otherOffers: RankedOffer[];
  /** 품절 판매처 — 목록 끝에 품절 표시로만 노출 */
  unavailableOffers: RankedOffer[];
  similarStyles: Product[];
}

export interface LegacySheetModel {
  kind: "legacy";
  /** 커스텀(URL 직접 연결)·서버 스냅샷 상품 — 오퍼 그래프에 없는 상품의 폴백 */
  product: Product;
  exactness: ObjectTag["exactness"];
  similarStyles: Product[];
}

export type ProductSheetModel = CanonicalSheetModel | LegacySheetModel;

export function buildProductSheetModel(
  object: ObjectTag,
  lookupLegacy: (id: string | null | undefined) => Product | undefined
): ProductSheetModel | null {
  if (!object.productId) return null;

  const canonical = canonicalById(object.productId);
  if (canonical) {
    const resolved = resolveOffersFor(canonical.id);
    const similarStyles = (canonical.attributes.similarIds ?? [])
      .filter((id) => id !== canonical.id) // 불변식: 착용 상품은 similar에 못 들어온다
      .map((id) => lookupLegacy(id))
      .filter((p): p is Product => p != null);
    return {
      kind: "canonical",
      canonical,
      exactness: object.exactness,
      bestOffer: resolved.best,
      otherOffers: resolved.alternatives,
      unavailableOffers: resolved.unavailable,
      similarStyles,
    };
  }

  const product = lookupLegacy(object.productId);
  if (!product) return null;
  return {
    kind: "legacy",
    product,
    exactness: object.exactness,
    similarStyles: product.similarIds
      .filter((id) => id !== product.id)
      .map((id) => lookupLegacy(id))
      .filter((p): p is Product => p != null),
  };
}
