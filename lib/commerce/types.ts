import { z } from "zod";
import { CANONICAL_MATCH_STATES, mapLegacyExactnessToMatchState } from "../types";
import type { Category, CanonicalMatchState, LegacyExactness } from "../types";

export const MATCH_STATES = CANONICAL_MATCH_STATES;
export type MatchState = CanonicalMatchState;

export const OFFER_LIFECYCLES = ["active", "stale", "quarantined"] as const;
export type OfferLifecycle = (typeof OFFER_LIFECYCLES)[number];

export const COMMERCE_PROVIDERS = ["linkprice", "sovrn", "direct"] as const;
export type CommerceProvider = (typeof COMMERCE_PROVIDERS)[number];

export const IDENTIFIER_KINDS = ["gtin", "ean", "upc", "isbn", "asin", "sku", "style_code"] as const;
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number];

export type ProductIdentifier = {
  readonly kind: IdentifierKind;
  readonly value: string;
};

export type CanonicalProductAttributes = {
  readonly productLine: string | null;
  readonly color: string | null;
  readonly size: string | null;
  readonly volume: string | null;
};

export type CanonicalProduct = {
  readonly id: string;
  readonly brand: string | null;
  readonly productName: string;
  readonly category: Category;
  readonly sourceIdentity: SourceIdentity | null;
  readonly sku: string | null;
  readonly model: string | null;
  readonly gtin: string | null;
  readonly attributes: CanonicalProductAttributes;
  readonly identifiers: readonly ProductIdentifier[];
  readonly aliases: readonly string[];
  readonly referenceImages: readonly string[];
};

export type IdentityEvidence = {
  readonly signal: "identifier" | "brand" | "model" | "variant" | "image" | "detail_page" | "conflict";
  readonly value: string;
  readonly score: number;
};

export type SourceIdentity = {
  readonly source: CommerceProvider;
  readonly sourceProductId: string;
};

export type ImageVariant = {
  readonly kind: "primary" | "alternate" | "thumbnail";
  readonly url: string;
  readonly width?: number;
  readonly height?: number;
};

export type StockState = {
  readonly status: "in_stock" | "out_of_stock" | "unknown";
  readonly quantity: number | null;
};

export type OfferFreshness = {
  readonly observedAt: string;
  readonly staleAfter: string | null;
};

export type CommerceOffer = {
  readonly id: string;
  readonly canonicalProductId: string | null;
  readonly provider: CommerceProvider;
  readonly providerProductId?: string;
  readonly sourceIdentity: SourceIdentity | null;
  readonly merchant: string;
  readonly title: string;
  readonly detailUrl: string | null;
  readonly discoveryUrl: string | null;
  readonly affiliateUrl: string | null;
  readonly imageUrl: string | null;
  readonly imageVariants: readonly ImageVariant[];
  readonly price: number | null;
  readonly currency: string | null;
  readonly shippingPrice: number | null;
  readonly availability: "in_stock" | "out_of_stock" | "unknown";
  readonly stock: StockState;
  readonly commissionRate: number | null;
  readonly matchState: MatchState;
  readonly offerLifecycle: OfferLifecycle;
  readonly freshness: OfferFreshness;
  readonly identityScore: number;
  readonly evidence: readonly IdentityEvidence[];
  readonly verificationEvidence: readonly IdentityEvidence[];
  readonly detailPageVerified: boolean;
};

export type DiscoveryLink = {
  readonly provider: "naver" | "musinsa" | "coupang" | "google" | "other";
  readonly url: string;
  readonly query: string;
};

export const matchStateSchema = z.enum(MATCH_STATES);
export const offerLifecycleSchema = z.enum(OFFER_LIFECYCLES);
export const commerceProviderSchema = z.enum(COMMERCE_PROVIDERS);
export const identifierKindSchema = z.enum(IDENTIFIER_KINDS);

const availabilitySchema = z.enum(["in_stock", "out_of_stock", "unknown"]);
const identityEvidenceSchema = z.object({
  signal: z.enum(["identifier", "brand", "model", "variant", "image", "detail_page", "conflict"]),
  value: z.string().trim().min(1),
  score: z.number().finite().min(0),
});
const sourceIdentitySchema = z.object({
  source: commerceProviderSchema,
  sourceProductId: z.string().trim().min(1),
});
const imageVariantSchema = z.object({
  kind: z.enum(["primary", "alternate", "thumbnail"]),
  url: z.string().trim().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
const stockStateSchema = z.object({
  status: availabilitySchema,
  quantity: z.number().int().nonnegative().nullable(),
});
const freshnessSchema = z.object({
  observedAt: z.iso.datetime({ offset: true }),
  staleAfter: z.iso.datetime({ offset: true }).nullable(),
});

function detailUrlIsCanonical(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (/(?:^|\.)search\.shopping\.naver\.com$/i.test(url.hostname)) return false;
    if (/(?:^|&)(?:keyword|query|q|search|searchWord)=/i.test(url.search.slice(1))) return false;
    if (/\/(?:search|list|category|categor|ranking|best|event|plan)(?:\/|$)/i.test(url.pathname)) return false;
    return /\/(?:product|products|goods|item|detail|dp|vp\/products|app\/goods)\/[-\w]+/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function mapLegacyMatchState(value: LegacyExactness): MatchState {
  return mapLegacyExactnessToMatchState(value);
}

export const providerOfferInputSchema = z.object({
  provider: commerceProviderSchema,
  providerProductId: z.string().trim().min(1).optional(),
  merchant: z.string().trim().min(1),
  title: z.string().trim().min(1),
  detailUrl: z.url().nullable(),
  discoveryUrl: z.url().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  price: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().min(3).max(8).nullable().optional(),
  shippingPrice: z.number().finite().nonnegative().nullable().optional(),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]).optional(),
  commissionRate: z.number().min(0).max(1).nullable().optional(),
});

export type ProviderOfferInput = z.infer<typeof providerOfferInputSchema>;

export const canonicalOfferSchema = z
  .object({
    id: z.string().trim().min(1),
    canonicalProductId: z.string().trim().min(1).nullable(),
    provider: commerceProviderSchema,
    providerProductId: z.string().trim().min(1).optional(),
    sourceIdentity: sourceIdentitySchema.nullable(),
    merchant: z.string().trim().min(1),
    title: z.string().trim().min(1),
    detailUrl: z.url().nullable(),
    discoveryUrl: z.url().nullable(),
    affiliateUrl: z.url().nullable(),
    imageUrl: z.string().trim().min(1).nullable(),
    imageVariants: z.array(imageVariantSchema).readonly(),
    price: z.number().finite().nonnegative().nullable(),
    currency: z.string().trim().min(3).max(8).nullable(),
    shippingPrice: z.number().finite().nonnegative().nullable(),
    availability: availabilitySchema,
    stock: stockStateSchema,
    commissionRate: z.number().min(0).max(1).nullable(),
    matchState: matchStateSchema,
    offerLifecycle: offerLifecycleSchema,
    freshness: freshnessSchema,
    identityScore: z.number().finite().min(0),
    evidence: z.array(identityEvidenceSchema).readonly(),
    verificationEvidence: z.array(identityEvidenceSchema).readonly(),
    detailPageVerified: z.boolean(),
  })
  .superRefine((offer, context) => {
    const isVerifiedMatch = offer.matchState === "exact" || offer.matchState === "likely";
    if (!isVerifiedMatch) return;
    if (!offer.sourceIdentity) {
      context.addIssue({ code: "custom", path: ["sourceIdentity"], message: "source identity is required for verified offers" });
    }
    if (!offer.detailUrl || !detailUrlIsCanonical(offer.detailUrl)) {
      context.addIssue({ code: "custom", path: ["detailUrl"], message: "verified offers require a canonical detail URL" });
    }
    if (!offer.detailPageVerified || offer.verificationEvidence.length === 0 || offer.evidence.length === 0) {
      context.addIssue({ code: "custom", path: ["verificationEvidence"], message: "verified offers require evidence" });
    }
  });

export type CanonicalCommerceOffer = z.infer<typeof canonicalOfferSchema>;
