import { describe, expect, it } from "vitest";
import { gateCommerceCandidates } from "../../lib/commerce/candidate-gate";
import type { CanonicalProduct } from "../../lib/commerce/types";
import { queryCanonical } from "../../lib/commerce/query-canonical";

const canonical: CanonicalProduct = {
  id: "canonical:polo:oxford:sky-blue",
  brand: "Polo Ralph Lauren",
  productName: "Classic Fit Oxford Shirt Sky Blue",
  category: "fashion",
  sourceIdentity: null,
  sku: null,
  model: "Classic Fit Oxford",
  gtin: null,
  attributes: {
    productLine: "Classic Fit Oxford",
    color: "sky blue",
    size: null,
    volume: null,
  },
  identifiers: [],
  aliases: ["클래식 핏 옥스포드 셔츠 스카이 블루"],
  referenceImages: [],
};

const candidate = (input: Record<string, unknown>) => ({
  id: "candidate-1",
  brand: "Polo Ralph Lauren",
  productName: "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue",
  category: "fashion",
  color: "sky blue",
  detailUrl: "https://merchant.example/products/oxford-1",
  detailPageVerified: true,
  imageUrls: [],
  ...input,
});

describe("commerce candidate matching gate", () => {
  it("preserves brand and color signals from the full search query", () => {
    const result = queryCanonical("fashion", "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue", "top");

    expect(result.brand).toBe("Polo Ralph Lauren");
    expect(result.attributes.color).toBe("sky blue");
    expect(result.attributes.productLine).toBe("top");
  });

  it("uses the detected canonical class to reject an outerwear candidate", () => {
    const topCanonical = queryCanonical("fashion", "blue item", "top");

    const [result] = gateCommerceCandidates({
      canonical: topCanonical,
      candidates: [candidate({
        productName: "Polo Ralph Lauren blue blazer",
        color: "blue",
      })],
    });

    expect(result).toBeUndefined();
  });

  it("rejects a category and color conflict instead of returning it as a product", () => {
    const [result] = gateCommerceCandidates({
      canonical,
      candidates: [candidate({
        id: "grey-blazer",
        productName: "Polo Ralph Lauren 여성 클래식핏 체크 블레이저 그레이",
        color: "gray",
      })],
    });

    expect(result).toBeUndefined();
  });

  it("keeps a non-conflicting candidate review-only when identity evidence is incomplete", () => {
    const [result] = gateCommerceCandidates({
      canonical,
      candidates: [candidate({
        detailPageVerified: false,
        detailUrl: null,
        productName: "Polo Ralph Lauren Classic Fit Oxford Shirt",
      })],
    });

    expect(["review", "unverified"]).toContain(result?.matchState);
    expect(result?.purchaseEligible).toBe(false);
  });

  it("keeps a fully matching provider candidate review-only for a synthetic canonical", () => {
    const [result] = gateCommerceCandidates({
      canonical,
      candidates: [candidate({
        source: "aliexpress-image",
        visualScore: 0.95,
        detailPageVerified: true,
        purchaseEligible: true,
      })],
    });

    expect(["review", "unverified"]).toContain(result?.matchState);
    expect(result?.matchState).not.toBe("exact");
    expect(result?.matchState).not.toBe("likely");
    expect(result?.purchaseEligible).toBe(false);
  });

  it("does not let commission or a keyword-only result become exact", () => {
    const [result] = gateCommerceCandidates({
      canonical,
      candidates: [candidate({
        id: "keyword-only",
        detailPageVerified: false,
        detailUrl: null,
        purchaseEligible: true,
        matchState: "exact",
        commissionRate: 0.9,
      })],
    });

    expect(result?.matchState).not.toBe("exact");
    expect(result?.purchaseEligible).toBe(false);
  });
});
