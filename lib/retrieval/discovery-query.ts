import type { DetectedObject, FashionAttributes } from "../types";
import type { ProductDiscoveryQuery } from "./discovery-types";

type DiscoveryQueryInput = {
  readonly canonicalClass: string;
  readonly category: string;
  readonly queries: readonly string[];
  readonly attributes?: FashionAttributes;
  readonly primaryColor?: string | null;
};

export function buildProductDiscoveryQuery(input: DiscoveryQueryInput): ProductDiscoveryQuery {
  const attributes = input.attributes;
  return {
    canonicalClass: input.canonicalClass,
    category: input.category,
    brandCandidates: (attributes?.brandCandidates ?? []).map((candidate) => ({
      brand: candidate.brand,
      confidence: clamp(candidate.confidence),
    })),
    productFamilyGuess: productFamilyForClass(input.canonicalClass),
    modelGuess: attributes?.modelIdentifiers?.[0] ?? null,
    modelIdentifiers: attributes?.modelIdentifiers ?? [],
    primaryColor: attributes?.primaryColorName ?? input.primaryColor ?? null,
    visibleText: attributes?.visibleText ?? [],
    distinctiveFeatures: attributes?.distinctiveFeatures ?? [],
    searchQueries: uniqueQueries(input.queries),
  };
}

export function buildProductDiscoveryQueryFromObject(
  object: DetectedObject,
  queries: readonly string[]
): ProductDiscoveryQuery {
  return buildProductDiscoveryQuery({
    canonicalClass: object.canonicalClass ?? object.label,
    category: object.category,
    queries,
    attributes: object.attributes,
    primaryColor: null,
  });
}

function productFamilyForClass(canonicalClass: string): string | null {
  const normalized = canonicalClass.toLowerCase();
  if (normalized.includes("outer")) return "outerwear";
  if (normalized.includes("shoe")) return "shoe";
  if (normalized.includes("pant")) return "pants";
  if (normalized.includes("dress")) return "dress";
  if (normalized.includes("shirt") || normalized === "top") return "shirt";
  return null;
}

function uniqueQueries(queries: readonly string[]): string[] {
  return [...new Set(queries.map((query) => query.trim()).filter((query) => query.length >= 2))].slice(0, 8);
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
