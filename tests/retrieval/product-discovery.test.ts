import { describe, expect, it } from "vitest";
import {
  deduplicateProductCandidates,
  normalizeRawProductCandidate,
} from "../../lib/retrieval/discovery-normalize";
import { discoverProducts } from "../../lib/retrieval/discovery-orchestrator";
import { buildProductDiscoveryQuery } from "../../lib/retrieval/discovery-query";
import type {
  ProductDiscoveryProvider,
  ProductDiscoveryQuery,
  RawProductCandidate,
} from "../../lib/retrieval/discovery-types";

const query: ProductDiscoveryQuery = {
  canonicalClass: "top",
  category: "fashion",
  brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.9 }],
  productFamilyGuess: "shirt",
  modelGuess: "Classic Fit Oxford",
  modelIdentifiers: [],
  primaryColor: "sky blue",
  visibleText: [],
  distinctiveFeatures: ["button-down collar"],
  searchQueries: ["Polo Ralph Lauren Classic Fit Oxford sky blue shirt"],
};

function rawCandidate(overrides: Partial<RawProductCandidate> = {}): RawProductCandidate {
  return {
    provider: "naver",
    sourceType: "korean_commerce",
    merchant: "네이버 스마트스토어",
    title: "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue",
    brand: "Polo Ralph Lauren",
    canonicalClass: "top",
    category: "fashion",
    color: "sky blue",
    modelName: "Classic Fit Oxford",
    modelCode: null,
    sku: null,
    gtin: null,
    ean: null,
    upc: null,
    merchantProductId: null,
    productId: null,
    productDetailUrl: "https://smartstore.naver.com/shop/products/123",
    searchUrl: null,
    imageUrls: [],
    primaryImageUrl: null,
    imageAvailable: false,
    price: 198000,
    currency: "KRW",
    rawMetadata: { fixture: true },
    sourceConfidence: 0.8,
    ...overrides,
  };
}

describe("product discovery normalization", () => {
  it("builds hypotheses from structured vision attributes without treating them as truth", () => {
    const result = buildProductDiscoveryQuery({
      canonicalClass: "top",
      category: "fashion",
      queries: ["Polo Ralph Lauren oxford shirt", "Polo Ralph Lauren oxford shirt"],
      primaryColor: "sky blue",
      attributes: {
        brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.92, evidence: ["logo"] }],
        modelIdentifiers: ["OCS-001"],
        distinctiveFeatures: ["button-down collar"],
        visibleText: ["Polo"],
      },
    });

    expect(result.brandCandidates[0]?.brand).toBe("Polo Ralph Lauren");
    expect(result.modelGuess).toBe("OCS-001");
    expect(result.productFamilyGuess).toBe("shirt");
    expect(result.searchQueries).toHaveLength(1);
  });

  it("marks a search URL as discovery-only and never invents an image", () => {
    const result = normalizeRawProductCandidate(rawCandidate({
      productDetailUrl: "https://search.shopping.naver.com/search/all?query=shirt",
      searchUrl: "https://search.shopping.naver.com/search/all?query=shirt",
    }));

    expect(result?.productDetailUrl).toBeNull();
    expect(result?.searchUrl).toContain("search.shopping.naver.com");
    expect(result?.imageAvailable).toBe(false);
    expect(result?.primaryImageUrl).toBeNull();
  });

  it("deduplicates by stable identity and preserves source provenance", () => {
    const first = normalizeRawProductCandidate(rawCandidate({
      provider: "naver",
      merchantProductId: "123",
    }));
    const second = normalizeRawProductCandidate(rawCandidate({
      provider: "sovrn",
      sourceType: "additional_commerce",
      merchant: "Polo official",
      merchantProductId: "different-offer",
      productDetailUrl: "https://polo.example/products/oxford",
      title: "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue official",
      imageUrls: ["https://cdn.example/oxford.jpg"],
      primaryImageUrl: "https://cdn.example/oxford.jpg",
      imageAvailable: true,
    }));

    const result = deduplicateProductCandidates([first, second].filter((candidate) => candidate !== null));

    expect(result).toHaveLength(2);
    expect(result.every((candidate) => candidate.sources.length >= 1)).toBe(true);

    const merged = deduplicateProductCandidates([
      first,
      normalizeRawProductCandidate(rawCandidate({ provider: "sovrn", merchantProductId: "123" })),
    ].filter((candidate) => candidate !== null));
    expect(merged).toHaveLength(1);
    expect(merged[0]?.sourceProviders).toEqual(["naver", "sovrn"]);
    expect(merged[0]?.sourceAgreementCount).toBe(2);
  });
});

describe("product discovery orchestration", () => {
  it("returns a capped, normalized pool when one provider fails", async () => {
    const healthy: ProductDiscoveryProvider = {
      id: "naver",
      sourceType: "korean_commerce",
      search: async () => Array.from({ length: 60 }, (_, index) => rawCandidate({
        merchantProductId: `product-${index}`,
        title: `Oxford shirt ${index}`,
        productDetailUrl: `https://smartstore.naver.com/shop/products/${index + 1}`,
      })),
    };
    const failed: ProductDiscoveryProvider = {
      id: "sovrn",
      sourceType: "additional_commerce",
      search: async () => {
        throw new Error("fixture provider failure");
      },
    };

    const result = await discoverProducts({ query, providers: [healthy, failed] });

    expect(result.candidates).toHaveLength(50);
    expect(result.metrics.rawCandidateCount).toBe(60);
    expect(result.metrics.providerMetrics.find((item) => item.provider === "sovrn")?.error).toBe(true);
    expect(result.candidates.every((candidate) => candidate.purchaseEligible === false)).toBe(true);
  });
});
