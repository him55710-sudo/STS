import { afterEach, describe, expect, it, vi } from "vitest";
import { searchCatalog } from "../../lib/retrieval/catalog-provider";

describe("catalog candidate calibration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("makes the deterministic blue Oxford fixture exact and purchaseable in local fixture mode", () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");

    try {
      const candidates = searchCatalog({
        canonicalClass: "object",
        label: "garment",
        labelKo: "blue fashion item",
        tone: "#8ab8e8",
        queries: [
          "Polo Ralph Lauren 라이트 블루 blue fashion item",
          "Polo Ralph Lauren garment light blue",
          "라이트 블루 button-down collar blue fashion item",
          "라이트 블루 blue fashion item",
        ],
        attributes: {
          brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.98, evidence: ["button-down collar"] }],
          distinctiveFeatures: ["button-down collar", "Oxford weave"],
        },
      });

      const polo = candidates.find((candidate) => candidate.catalogProductId === "plw-polo-oxford");
      expect(polo).toBeDefined();
      expect(polo?.tier).toBe("exact");
      expect(polo?.detailUrl).toBe("https://www.musinsa.com/products/3010383");
      expect(polo?.purchaseEligible).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not count color as a measured image-identity score", () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    const candidates = searchCatalog({
      canonicalClass: "top",
      label: "oxford shirt",
      labelKo: "옥스포드 셔츠",
      tone: "#86bde8",
      queries: ["라이트 블루 옥스포드 셔츠"],
      attributes: {
        brandCandidates: [],
        distinctiveFeatures: ["button down collar"],
      },
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.scores.visual === 0)).toBe(true);
    expect(candidates.every((candidate) => candidate.tier !== "exact")).toBe(true);
    expect(candidates.every((candidate) => candidate.purchaseEligible === false)).toBe(true);
  });

  it("does not promote a same-color, different-style Polo candidate to a purchase match", () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    const candidates = searchCatalog({
      canonicalClass: "outerwear",
      label: "blue blazer",
      labelKo: "블루 블레이저",
      tone: "#8ab8e8",
      queries: ["Polo Ralph Lauren blue blazer"],
      attributes: {
        brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.98, evidence: ["blue color"] }],
        distinctiveFeatures: ["single-breasted blazer"],
      },
    });

    const poloShirt = candidates.find((candidate) => candidate.catalogProductId === "plw-polo-oxford");
    expect(poloShirt).toBeDefined();
    expect(poloShirt?.productName).toContain("셔츠");
    expect(poloShirt?.tier).not.toBe("exact");
    expect(poloShirt?.matchState).not.toBe("exact");
    expect(poloShirt?.purchaseEligible).toBe(false);
  });
});
