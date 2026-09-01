import { classifyCommerceUrl } from "../url-policy";
import type { CommerceOffer } from "../types";
import type { Product } from "../../types";

export function directOfferFromProduct(product: Product, canonicalProductId: string): CommerceOffer {
  const classification = classifyCommerceUrl(product.url);
  const isDetail = classification.kind === "detail";
  return {
    id: `offer:direct:${product.id}`,
    canonicalProductId,
    provider: "direct",
    providerProductId: product.id,
    sourceIdentity: {
      source: "direct",
      sourceProductId: product.id,
    },
    merchant: product.retailer,
    title: product.name,
    detailUrl: isDetail ? product.url : null,
    discoveryUrl: isDetail ? null : product.url,
    affiliateUrl: null,
    imageUrl: product.image,
    imageVariants: [{ kind: "primary", url: product.image }],
    price: product.price,
    currency: product.currency,
    shippingPrice: null,
    availability: "unknown",
    stock: { status: "unknown", quantity: null },
    commissionRate: product.commissionRate ?? null,
    matchState: isDetail ? "exact" : "unverified",
    offerLifecycle: "active",
    freshness: {
      observedAt: "2026-08-27T00:00:00.000Z",
      staleAfter: null,
    },
    identityScore: isDetail ? 1 : 0,
    evidence: isDetail
      ? [{ signal: "detail_page", value: product.url, score: 1 }]
      : [],
    verificationEvidence: isDetail
      ? [{ signal: "detail_page", value: product.url, score: 1 }]
      : [],
    detailPageVerified: isDetail,
  };
}
