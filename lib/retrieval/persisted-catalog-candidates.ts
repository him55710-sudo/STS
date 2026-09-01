import { z } from "zod";
import { MATCH_TIERS, RANK_WEIGHTS } from "../vision-config";
import { colorName } from "./queries";
import type { PersistedCatalogOffer } from "./persisted-catalog";
import type { CandidateScores, ProductCandidate, RetrievalQuery } from "./types";

const persistedOfferSchema = z.object({
  id: z.string().min(1),
  canonicalProductId: z.string().min(1),
  canonicalSku: z.string().min(1),
  sourceProvider: z.string().min(1),
  sourceProductId: z.string().min(1),
  brand: z.string().nullable(),
  name: z.string().min(1),
  merchant: z.string().min(1),
  category: z.enum(["fashion", "beauty", "interior", "tech", "lifestyle"]),
  currency: z.string().min(3),
  price: z.number().finite().nonnegative().nullable(),
  detailUrl: z.url(),
  affiliateUrl: z.url().nullable(),
  exactness: z.enum(["exact", "likely", "similar", "review", "unverified"]),
  images: z.array(z.string().min(1)),
});

const persistedCatalogResponseSchema = z.object({ offers: z.array(persistedOfferSchema) });

export function parsePersistedCatalogResponse(value: unknown): readonly PersistedCatalogOffer[] {
  const parsed = persistedCatalogResponseSchema.safeParse(value);
  return parsed.success ? parsed.data.offers : [];
}

export function scorePersistedOffer(offer: PersistedCatalogOffer, q: RetrievalQuery): ProductCandidate | null {
  const hay = `${offer.brand ?? ""} ${offer.name}`.toLowerCase();
  const tokens = [...new Set(q.queries.join(" ").toLowerCase().split(/\s+/).filter((token) => token.length >= 2))];
  const matchedTokens = tokens.filter((token) => hay.includes(token));
  const text = tokens.length > 0 ? Math.min(1, matchedTokens.length / Math.min(tokens.length, 6)) : 0;

  let brand = 0;
  const reason: string[] = [];
  for (const candidate of q.attributes?.brandCandidates ?? []) {
    if (offer.brand && offer.brand.toLowerCase().includes(candidate.brand.toLowerCase())) {
      brand = Math.max(brand, Math.min(1, candidate.confidence + 0.15));
      reason.push(`브랜드 후보 일치: ${candidate.brand}`);
    }
  }

  const color = colorName(q.tone);
  const colorScore = color && (hay.includes(color.en) || hay.includes(color.ko.toLowerCase())) ? 0.8 : 0;
  const features = q.attributes?.distinctiveFeatures ?? [];
  const matchedFeatures = features.filter((feature) => hay.includes(feature.toLowerCase()));
  const attributes = features.length > 0 ? Math.min(1, matchedFeatures.length / Math.max(2, features.length)) : 0;
  if (matchedTokens.length > 0) reason.push(`상품명 근거: ${matchedTokens.slice(0, 3).join(", ")}`);
  if (matchedFeatures.length > 0) reason.push(`디테일 일치: ${matchedFeatures[0]}`);
  if (color && colorScore > 0) reason.push(`색상명 일치: ${color.ko}`);

  if (matchedTokens.length === 0 && brand === 0) return null;
  const pageTrust = 1;
  const scores: CandidateScores = {
    visual: 0,
    brand: round2(brand),
    logo: 0,
    color: round2(colorScore),
    attributes: round2(attributes),
    text: round2(text),
    pageTrust,
    final: round2(
      RANK_WEIGHTS.brand * brand +
      RANK_WEIGHTS.attributes * attributes +
      RANK_WEIGHTS.color * colorScore +
      RANK_WEIGHTS.text * text +
      RANK_WEIGHTS.pageTrust * pageTrust
    ),
  };
  const computedTier = persistedTier(scores);
  const exact = offer.exactness === "exact";
  const purchaseEligible = exact && offer.affiliateUrl !== null;
  const exposedTier = exact ? "exact" : computedTier === "exact" ? "likely" : computedTier;
  return {
    id: `cat-offer-${offer.id}`,
    brand: offer.brand,
    productName: offer.name,
    category: offer.category,
    color: color?.en ?? null,
    price: { value: offer.price, currency: offer.currency },
    retailer: offer.merchant,
    url: offer.detailUrl,
    detailUrl: offer.detailUrl,
    discoveryUrl: null,
    providerProductId: offer.id,
    detailPageVerified: true,
    purchaseEligible,
    matchState: exact ? "exact" : exposedTier,
    imageUrls: [...offer.images],
    source: "catalog",
    sourceUrl: offer.detailUrl,
    catalogProductId: offer.canonicalProductId,
    affiliate: offer.affiliateUrl !== null,
    commissionRate: null,
    scores,
    tier: exact ? "exact" : exposedTier,
    matchReason: reason.slice(0, 4),
  };
}

function persistedTier(scores: CandidateScores): ProductCandidate["tier"] {
  if (scores.final >= MATCH_TIERS.exactMin && scores.brand >= 0.6 && (scores.text >= 0.6 || scores.color >= 0.4)) return "exact";
  if (scores.final >= MATCH_TIERS.likelyMin && scores.brand >= 0.4) return "likely";
  return "similar";
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
