import { canonicalById, resolveOffersFor } from "./index";
import type { CanonicalProduct } from "./types";

/**
 * Sponsored Similar — 광고가 닿을 수 있는 **유일한** 자리.
 *
 * ── 불변식 (docs/COMMERCE_INTEGRITY.md) ──────────────────────────────────
 * 1. **exact 상품은 절대 sponsored가 될 수 없다.** 크리에이터가 "이것을 입었다"고
 *    확정한 상품에는 광고가 개입할 수 없다. 이 규칙은 타입 수준에서 강제된다 —
 *    SponsoredPlacement는 `similar` 슬롯 전용 구조이고, sheet 모델에서
 *    sponsoredSimilar는 exact/오퍼 섹션과 별개의 필드다.
 * 2. **항상 "Sponsored" 라벨이 붙는다.** 라벨 없는 광고 노출 경로는 존재하지 않는다
 *    (`label`이 타입상 필수이고 UI가 이를 렌더한다).
 * 3. 광고는 similar 대안의 **순서와 구성만** 바꾼다. exact 판정·오퍼 랭킹·피드
 *    랭킹에는 관여하지 않는다.
 */

export interface SponsoredPlacement {
  id: string;
  /** 광고로 노출될 canonical 상품 */
  sponsoredProductId: string;
  /** 이 상품들의 similar 슬롯에 노출된다 (비면 카테고리 타깃팅) */
  targetProductIds: string[];
  /** 카테고리 타깃 (targetProductIds가 비었을 때) */
  targetCategory: string | null;
  /** 노출 라벨 — 필수. 라벨 없는 광고는 불가능하다 */
  label: string;
  status: "active" | "paused";
}

/**
 * 시드 광고 지면 — 실제 광고 판매 전의 자리표시 데이터.
 * 실연동 시 DB(sponsored_placements)에서 읽도록 소스만 바꾸면 된다.
 */
export const SEED_PLACEMENTS: SponsoredPlacement[] = [
  {
    id: "sp-1",
    sponsoredProductId: "plw-longchamp",
    targetProductIds: ["plw-celine-bag", "plw-polene-bag", "pl-prada-bag"],
    targetCategory: null,
    label: "Sponsored",
    status: "active",
  },
  {
    id: "sp-2",
    sponsoredProductId: "pl-uniqlo-tee",
    targetProductIds: ["pl-polo-oxford", "plw-polo-oxford"],
    targetCategory: null,
    label: "Sponsored",
    status: "active",
  },
];

export interface SponsoredSimilar {
  placementId: string;
  product: CanonicalProduct;
  /** UI가 반드시 렌더해야 하는 라벨 */
  label: string;
  /** 가격 표시용 최적 오퍼 (없으면 노출하지 않는다) */
  price: number | null;
}

/**
 * 주어진 exact 상품의 similar 슬롯에 붙을 광고를 고른다.
 *
 * @param exactProductId 크리에이터가 확정한 착용 상품 — **광고 후보에서 반드시 제외된다**
 * @param organicSimilarIds 오가닉 유사 상품 — 중복 노출을 피한다
 */
export function selectSponsoredSimilar(
  exactProductId: string,
  organicSimilarIds: string[],
  placements: SponsoredPlacement[] = SEED_PLACEMENTS
): SponsoredSimilar | null {
  const exclude = new Set([exactProductId, ...organicSimilarIds]);
  const exactCategory = canonicalById(exactProductId)?.category ?? null;

  for (const p of placements) {
    if (p.status !== "active") continue;
    // 불변식 1: 착용 상품 자신은 어떤 경우에도 광고로 표시되지 않는다
    if (p.sponsoredProductId === exactProductId) continue;
    if (exclude.has(p.sponsoredProductId)) continue;

    const targeted =
      p.targetProductIds.length > 0
        ? p.targetProductIds.includes(exactProductId)
        : p.targetCategory != null && p.targetCategory === exactCategory;
    if (!targeted) continue;

    const product = canonicalById(p.sponsoredProductId);
    if (!product) continue;
    const best = resolveOffersFor(product.id).best;

    return {
      placementId: p.id,
      product,
      // 불변식 2: 라벨은 비어 있을 수 없다
      label: p.label?.trim() || "Sponsored",
      price: best?.offer.price ?? null,
    };
  }
  return null;
}
