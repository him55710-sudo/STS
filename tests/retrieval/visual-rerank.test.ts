import { describe, expect, it } from "vitest";
import { cosineSimilarity, MockVisualEmbeddingProvider, normalizeEmbedding } from "../../lib/retrieval/visual-embedding";
import { verifyExactSku } from "../../lib/retrieval/exact-sku-verifier";
import { InMemoryProductImageEmbeddingStore } from "../../lib/retrieval/image-embedding-cache";
import { rerankProductCandidates } from "../../lib/retrieval/visual-rerank";
import type { ProductDiscoveryQuery } from "../../lib/retrieval/discovery-types";
import type { WebCandidate } from "../../lib/retrieval/web-candidates";

const query: ProductDiscoveryQuery = {
  canonicalClass: "shoes",
  category: "fashion",
  brandCandidates: [{ brand: "Adidas", confidence: 0.95 }],
  productFamilyGuess: "shoe",
  modelGuess: "B75806",
  modelIdentifiers: ["B75806"],
  primaryColor: "black",
  visibleText: [],
  distinctiveFeatures: ["three stripes"],
  searchQueries: ["Adidas Samba OG B75806 black"],
};

function candidate(overrides: Partial<WebCandidate> = {}): WebCandidate {
  return {
    id: "candidate-1",
    brand: "Adidas",
    productName: "Adidas Samba OG B75806 Black",
    category: "fashion",
    color: "black",
    price: { value: 159000, currency: "KRW" },
    retailer: "Fixture Merchant",
    url: "https://merchant.example/products/b75806",
    detailUrl: "https://merchant.example/products/b75806",
    discoveryUrl: null,
    detailPageVerified: false,
    purchaseEligible: false,
    imageUrls: ["https://cdn.example/b75806.jpg"],
    source: "fixture",
    canonicalClass: "shoes",
    modelCode: "B75806",
    imageAvailable: true,
    sourceAgreementCount: 1,
    ...overrides,
  };
}

describe("visual embedding contract", () => {
  it("normalizes vectors before cosine comparison", () => {
    expect(normalizeEmbedding([3, 4])).toEqual([0.6, 0.8]);
    expect(cosineSimilarity([3, 4], [6, 8])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("provides deterministic embeddings for provider tests", async () => {
    const provider = new MockVisualEmbeddingProvider("mock-siglip2");
    const first = await provider.embedImage({ image: "data:image/jpeg;base64,fixture" });
    const second = await provider.embedImage({ image: "data:image/jpeg;base64,fixture" });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(8);
  });
});

describe("exact sku verifier", () => {
  it("never verifies a high-visual candidate when model identifiers conflict", () => {
    const result = verifyExactSku({
      query,
      candidate: candidate({ modelCode: "IE3439", visualSiglipScore: 0.99 }),
    });

    expect(result.identityStatus).toBe("CONFLICT");
    expect(result.conflicts).toContain("model code conflict");
    expect(result.finalIdentityScore).toBeLessThan(1);
  });

  it("does not verify on visual score alone", () => {
    const result = verifyExactSku({
      query: { ...query, brandCandidates: [], modelGuess: null, modelIdentifiers: [] },
      candidate: candidate({ brand: null, modelCode: null, visualSiglipScore: 0.99 }),
    });

    expect(result.identityStatus).not.toBe("VERIFIED");
  });

  it("keeps the same family with a different colorway non-exact", () => {
    const result = verifyExactSku({
      query,
      candidate: candidate({ modelCode: "IE3439", color: "white", productName: "Adidas Samba OG IE3439 White" }),
    });

    expect(result.variantExactness).toBe(false);
    expect(result.identityStatus).toBe("CONFLICT");
  });
});

describe("visual candidate reranking", () => {
  it("keeps the pool bounded at ten and leaves missing images unscored", async () => {
    const provider = new MockVisualEmbeddingProvider("test-siglip2");
    const store = new InMemoryProductImageEmbeddingStore();
    const candidates = Array.from({ length: 11 }, (_, index) => candidate({
      id: `candidate-${index}`,
      primaryImageUrl: index === 10 ? null : `https://cdn.example/${index}.jpg`,
      imageUrls: index === 10 ? [] : [`https://cdn.example/${index}.jpg`],
    }));
    const result = await rerankProductCandidates({
      query,
      queryImage: "data:image/jpeg;base64,query",
      cropMode: "polygon",
      candidates,
      provider,
      store,
      imageLoader: async () => Buffer.from("candidate-image"),
    });

    expect(result.topTen).toHaveLength(10);
    expect(result.scoredCount).toBe(10);
    expect(result.topTen.every((item) => item.visualSiglipScore !== null)).toBe(true);
    expect(result.candidates.find((item) => item.id === "candidate-10")?.visualSiglipScore).toBeNull();
    expect(result.status).toBe("success");
  });

  it("reuses cached candidate embeddings", async () => {
    let loads = 0;
    const provider = new MockVisualEmbeddingProvider("test-siglip2");
    const store = new InMemoryProductImageEmbeddingStore();
    const input = {
      query,
      queryImage: "data:image/jpeg;base64,query",
      cropMode: "bbox" as const,
      candidates: [candidate()],
      provider,
      store,
      imageLoader: async () => { loads += 1; return Buffer.from("candidate-image"); },
    };
    await rerankProductCandidates(input);
    await rerankProductCandidates(input);
    expect(loads).toBe(1);
  });
});
