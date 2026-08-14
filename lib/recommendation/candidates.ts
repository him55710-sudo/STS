import { canonicalById, resolveOffersFor } from "../commerce";
import type { Post, Product } from "../types";
import type { RankableCandidate } from "./feed-ranker";
import { colorBucketOf, priceBandOf, type TasteSignal } from "./taste-profile";

/**
 * Post → 랭킹 후보 변환 (순수 함수).
 *
 * 취향 축(브랜드·색상·가격대·스타일)은 상품 그래프에서 뽑고, 무결성 비율은
 * OfferResolver로 계산한다 — "지금 실제로 살 수 있는가"가 랭킹에 반영되도록.
 */

export interface EngagementStats {
  views: number;
  likes: number;
  taps: number;
  shares: number;
  comments: number;
}

const EMPTY_ENGAGEMENT: EngagementStats = { views: 0, likes: 0, taps: 0, shares: 0, comments: 0 };

export function toCandidate(
  post: Post,
  lookupProduct: (id: string | null | undefined) => Product | undefined,
  engagement: EngagementStats = EMPTY_ENGAGEMENT
): RankableCandidate {
  const productIds = post.objects.map((o) => o.productId).filter((id): id is string => id != null);

  const brands = new Set<string>();
  const colors = new Set<string>();
  const priceBands = new Set<string>();
  const styles = new Set<string>();
  let purchasable = 0;
  let maxCommissionRate = 0;

  for (const pid of productIds) {
    const canonical = canonicalById(pid);
    const product = lookupProduct(pid);

    const brand = canonical?.brand ?? product?.brand;
    if (brand) brands.add(brand);

    const bucket = colorBucketOf(canonical?.color ?? null);
    if (bucket) colors.add(bucket);

    const band = priceBandOf(canonical ? undefined : product?.price);
    if (band) priceBands.add(band);

    if (canonical) {
      // canonical 상품은 실제 오퍼로 가격대·구매 가능 여부·수수료를 판단한다
      const { best } = resolveOffersFor(canonical.id);
      if (best) {
        purchasable += 1;
        const b = priceBandOf(best.offer.price);
        if (b) priceBands.add(b);
        maxCommissionRate = Math.max(maxCommissionRate, best.offer.commissionRate ?? 0);
      }
      for (const s of (canonical.attributes.styles as string[] | undefined) ?? []) styles.add(s);
    } else if (product) {
      // 오퍼 그래프 밖 상품(커스텀/스냅샷)은 링크 자체를 구매 가능으로 본다
      purchasable += 1;
      maxCommissionRate = Math.max(maxCommissionRate, product.commissionRate ?? 0);
    }
  }

  // 오브젝트의 canonical class도 약한 스타일 신호로 쓴다
  for (const o of post.objects) {
    if (o.canonicalClass) styles.add(o.canonicalClass);
  }

  return {
    postId: post.id,
    creatorId: post.creatorId,
    category: post.category,
    createdAt: Date.parse(post.createdAt) || 0,
    brands: [...brands],
    colors: [...colors],
    priceBands: [...priceBands] as RankableCandidate["priceBands"],
    styles: [...styles],
    objectCount: post.objects.length,
    linkedProductCount: productIds.length,
    views: engagement.views,
    // 시드 게시물의 likes는 콘텐츠에 내장된 값이라 참여 신호로 합산한다
    likes: Math.max(engagement.likes, post.likes),
    taps: engagement.taps,
    shares: engagement.shares,
    comments: engagement.comments,
    purchasableRatio: productIds.length === 0 ? 1 : purchasable / productIds.length,
    maxCommissionRate,
  };
}

/**
 * 게시물 상호작용 → 취향 신호. 상품 축은 그래프에서 채운다.
 * (신호 자체는 서버 권위 데이터에서 온다 — lib/backend/signals.ts)
 */
export function signalFromPost(
  type: TasteSignal["type"],
  post: Post,
  at?: number
): TasteSignal {
  const candidate = toCandidate(post, () => undefined);
  return {
    type,
    at,
    creatorId: post.creatorId,
    category: post.category,
    brand: candidate.brands[0] ?? null,
    color: candidate.colors[0] ?? null,
    priceBand: candidate.priceBands[0] ?? null,
    styles: candidate.styles,
  };
}

/** 상품 상호작용(저장·아웃바운드·구매) → 취향 신호 */
export function signalFromProduct(
  type: TasteSignal["type"],
  productId: string,
  opts: { at?: number; creatorId?: string | null; category?: string | null } = {}
): TasteSignal {
  const canonical = canonicalById(productId);
  const best = canonical ? resolveOffersFor(canonical.id).best : null;
  return {
    type,
    at: opts.at,
    creatorId: opts.creatorId ?? null,
    category: opts.category ?? canonical?.category ?? null,
    brand: canonical?.brand ?? null,
    color: canonical?.color ?? null,
    priceBand: priceBandOf(best?.offer.price),
    styles: (canonical?.attributes.styles as string[] | undefined) ?? null,
  };
}
