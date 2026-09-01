import { PRODUCTS, productById } from "../catalog";
import { classifyCommerceUrl } from "./url-policy";
import type {
  CanonicalProduct,
  CommerceOffer,
  IdentityEvidence,
  ProductIdentifier,
} from "./types";
import { isProvenanceBackedCatalogProduct, type Product } from "../types";

const POLO_CANONICAL_ID = "canonical:polo-ralph-lauren:classic-fit-oxford:sky-blue";

function isLocalFixtureMode(): boolean {
  return process.env.CATALOG_E2E_FIXTURES === "1" || process.env.NEXT_PUBLIC_CATALOG_E2E_FIXTURES === "1";
}

function hasProductionCatalogProvenance(product: Product): boolean {
  return isProvenanceBackedCatalogProduct(product)
    || (isLocalFixtureMode() && product.is_demo === true && product.source === "demo-seed");
}

function fixtureAffiliateUrl(product: Product, detailUrl: string | null): string | null {
  if (!isLocalFixtureMode() || !product.affiliate || !detailUrl) return null;
  return `https://sovrn.co?u=${encodeURIComponent(detailUrl)}`;
}

function canonicalIdForLegacyId(id: string): string {
  if (id === "pl-polo-oxford" || id === "plw-polo-oxford") return POLO_CANONICAL_ID;
  return `canonical:${id}`;
}

function extractVolume(value: string): string | null {
  const match = value.match(/\b\d+(?:\.\d+)?\s*(?:ml|g|oz)\b/i);
  return match?.[0] ?? null;
}

function identifiersForProduct(product: Product): readonly ProductIdentifier[] {
  return [];
}

function canonicalFromProduct(product: Product): CanonicalProduct {
  const isPolo = product.id === "pl-polo-oxford" || product.id === "plw-polo-oxford";
  const volume = extractVolume(product.name);
  const sourceIdentity = hasProductionCatalogProvenance(product)
    ? { source: "direct" as const, sourceProductId: product.id }
    : null;
  return {
    id: canonicalIdForLegacyId(product.id),
    brand: isPolo ? "Polo Ralph Lauren" : product.brand,
    productName: isPolo ? "Classic Fit Oxford Shirt" : product.name,
    category: product.category,
    sourceIdentity,
    sku: null,
    model: isPolo ? "Classic Fit Oxford" : null,
    gtin: null,
    attributes: {
      productLine: isPolo ? "Classic Fit Oxford" : product.category === "beauty" ? product.name : null,
      color: isPolo ? "sky blue" : null,
      size: null,
      volume,
    },
    identifiers: identifiersForProduct(product),
    aliases: [product.name],
    referenceImages: [product.image],
  };
}

export function getCanonicalProductForLegacyId(id: string | null | undefined): CanonicalProduct | null {
  const product = productById(id);
  return product ? canonicalFromProduct(product) : null;
}

export function getAllCanonicalProducts(): readonly CanonicalProduct[] {
  const unique = new Map<string, CanonicalProduct>();
  for (const product of PRODUCTS) {
    const canonical = canonicalFromProduct(product);
    if (!unique.has(canonical.id)) unique.set(canonical.id, canonical);
  }
  return [...unique.values()];
}

function evidence(signal: IdentityEvidence["signal"], value: string, score: number): IdentityEvidence {
  return { signal, value, score };
}

function offerFromProduct(product: Product): CommerceOffer {
  const canonical = canonicalFromProduct(product);
  const classification = classifyCommerceUrl(product.url);
  const isDetail = classification.kind === "detail";
  const isVerifiedCatalogOffer = hasProductionCatalogProvenance(product) && isDetail;
  const isDemoOffer = !hasProductionCatalogProvenance(product);
  const detailUrl = isVerifiedCatalogOffer ? product.url : null;
  const discoveryUrl = isVerifiedCatalogOffer ? null : product.url;
  const affiliateUrl = fixtureAffiliateUrl(product, detailUrl);
  const evidenceItems: IdentityEvidence[] = isDemoOffer
    ? [evidence("conflict", "static demo seed is not production catalog provenance", 1)]
    : [
        evidence("brand", `${canonical.brand ?? "unknown"} catalog record`, 1),
        evidence("model", canonical.productName, 1),
      ];
  if (isVerifiedCatalogOffer) evidenceItems.push(evidence("detail_page", product.url, 1));

  return {
    id: `offer:catalog:${product.id}`,
    canonicalProductId: canonical.id,
    provider: "direct",
    providerProductId: product.id,
    sourceIdentity: canonical.sourceIdentity,
    merchant: product.retailer,
    title: product.name,
    detailUrl,
    discoveryUrl,
    affiliateUrl,
    imageUrl: product.image,
    imageVariants: [{ kind: "primary", url: product.image }],
    price: product.price,
    currency: product.currency,
    shippingPrice: null,
    availability: "unknown",
    stock: { status: "unknown", quantity: null },
    commissionRate: product.commissionRate ?? null,
    matchState: isDemoOffer ? "review" : isDetail ? "exact" : "unverified",
    offerLifecycle: isDemoOffer ? "quarantined" : "active",
    freshness: {
      observedAt: "2026-08-27T00:00:00.000Z",
      staleAfter: null,
    },
    identityScore: isVerifiedCatalogOffer ? 1 : 0,
    evidence: evidenceItems,
    verificationEvidence: isVerifiedCatalogOffer ? [evidence("detail_page", product.url, 1)] : [],
    detailPageVerified: isVerifiedCatalogOffer,
  };
}

export function getCommerceOffersForLegacyId(id: string): readonly CommerceOffer[] {
  const product = productById(id);
  return product ? [offerFromProduct(product)] : [];
}

export function getCommerceOffersForCanonicalId(canonicalId: string): readonly CommerceOffer[] {
  return PRODUCTS
    .filter((product) => canonicalIdForLegacyId(product.id) === canonicalId)
    .map(offerFromProduct);
}

export function getCommerceOfferById(offerId: string | null | undefined): CommerceOffer | null {
  if (!offerId) return null;
  for (const product of PRODUCTS) {
    const offer = offerFromProduct(product);
    if (offer.id === offerId) return offer;
  }
  return null;
}
