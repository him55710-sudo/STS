import type { Category } from "../types";
import type { ProductIdentifier } from "../commerce/types";

export const DISCOVERY_SOURCE_TYPES = [
  "korean_commerce",
  "additional_commerce",
  "grounded_web",
  "fallback",
] as const;
export type DiscoverySourceType = (typeof DISCOVERY_SOURCE_TYPES)[number];

export type BrandHypothesis = {
  readonly brand: string;
  readonly confidence: number;
};

export type ProductDiscoveryQuery = {
  readonly canonicalClass: string;
  readonly category: Category | string;
  readonly brandCandidates: readonly BrandHypothesis[];
  readonly productFamilyGuess: string | null;
  readonly modelGuess: string | null;
  readonly modelIdentifiers: readonly string[];
  readonly primaryColor: string | null;
  readonly visibleText: readonly string[];
  readonly distinctiveFeatures: readonly string[];
  readonly searchQueries: readonly string[];
  readonly imageDataUrl?: string;
};

export type RawProductCandidate = {
  readonly provider: string;
  readonly sourceType: DiscoverySourceType;
  readonly merchant: string;
  readonly merchantProductId: string | null;
  readonly productId: string | null;
  readonly title: string;
  readonly brand: string | null;
  readonly canonicalClass: string | null;
  readonly category: string | null;
  readonly color: string | null;
  readonly modelName: string | null;
  readonly modelCode: string | null;
  readonly sku: string | null;
  readonly gtin: string | null;
  readonly ean: string | null;
  readonly upc: string | null;
  readonly productDetailUrl: string | null;
  readonly searchUrl: string | null;
  readonly imageUrls: readonly string[];
  readonly primaryImageUrl: string | null;
  readonly imageAvailable: boolean;
  readonly price: number | null;
  readonly currency: string | null;
  readonly rawMetadata: Readonly<Record<string, unknown>>;
  readonly sourceConfidence: number | null;
};

export type DiscoverySource = {
  readonly provider: string;
  readonly sourceType: DiscoverySourceType;
  readonly merchant: string;
  readonly detailUrl: string | null;
  readonly searchUrl: string | null;
};

export type ProductDiscoveryCandidate = {
  readonly id: string;
  readonly provider: string;
  readonly sourceType: DiscoverySourceType;
  readonly merchant: string;
  readonly merchantProductId: string | null;
  readonly productId: string | null;
  readonly title: string;
  readonly brand: string | null;
  readonly canonicalClass: string | null;
  readonly category: string | null;
  readonly color: string | null;
  readonly modelName: string | null;
  readonly modelCode: string | null;
  readonly sku: string | null;
  readonly gtin: string | null;
  readonly ean: string | null;
  readonly upc: string | null;
  readonly identifiers: readonly ProductIdentifier[];
  readonly productDetailUrl: string | null;
  readonly searchUrl: string | null;
  readonly url: string;
  readonly detailUrl: string | null;
  readonly discoveryUrl: string | null;
  readonly imageUrls: string[];
  readonly primaryImageUrl: string | null;
  readonly imageAvailable: boolean;
  readonly price: { readonly value: number | null; readonly currency: string | null };
  readonly rawMetadata: Readonly<Record<string, unknown>>;
  readonly sourceConfidence: number | null;
  readonly sources: readonly DiscoverySource[];
  readonly sourceProviders: readonly string[];
  readonly sourceAgreementCount: number;
  readonly detailPageVerified: false;
  readonly purchaseEligible: false;
  readonly matchState: "unverified";
};

export interface ProductDiscoveryProvider {
  readonly id: string;
  readonly sourceType: DiscoverySourceType;
  search(query: ProductDiscoveryQuery): Promise<readonly RawProductCandidate[]>;
}

export type ProviderDiscoveryMetric = {
  readonly provider: string;
  readonly requested: boolean;
  readonly returned: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly latencyMs: number;
  readonly error: boolean;
};

export type DiscoveryMetrics = {
  readonly rawCandidateCount: number;
  readonly normalizedCandidateCount: number;
  readonly deduplicatedCandidateCount: number;
  readonly rejectedCandidateCount: number;
  readonly validatedCandidateCount: number;
  readonly providerMetrics: readonly ProviderDiscoveryMetric[];
};

export type ProductDiscoveryResult = {
  readonly candidates: readonly ProductDiscoveryCandidate[];
  readonly metrics: DiscoveryMetrics;
};
