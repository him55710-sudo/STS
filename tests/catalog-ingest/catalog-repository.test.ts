import { describe, expect, it } from "vitest";
import {
  buildCatalogImportBatchRecord,
  buildCatalogProductRecord,
  buildCatalogQuarantineRecord,
  isVerifiedCatalogExactness,
  validateCanonicalSku,
} from "../../lib/catalog-ingest/catalog-repository";

const row = {
  source: "fixture",
  sourceProductId: "shirt-1",
  sourceIdentity: { source: "fixture", sourceProductId: "shirt-1" },
  brand: "Polo Ralph Lauren",
  title: "Classic Fit Oxford",
  merchant: "Polo",
  variant: null,
  category: "fashion" as const,
  price: 259000,
  currency: "KRW",
  stock: "in_stock" as const,
  availability: "in_stock" as const,
  sku: null,
  model: null,
  gtin: null,
  detailUrl: "https://merchant.example.test/products/shirt-1",
  affiliateUrl: null,
  images: ["https://cdn.example.test/shirt-1.jpg"],
  imageVariants: [{ kind: "primary" as const, url: "https://cdn.example.test/shirt-1.jpg" }],
};

describe("catalog repository helpers", () => {
  it("builds a deterministic canonical product record", () => {
    const product = buildCatalogProductRecord(row, "exact");
    expect(product).toMatchObject({
      canonicalSku: "fixture:shirt-1",
      exactness: "exact",
      verifiedDetailUrl: true,
      sourceIdentityVerified: true,
      vectorMetadata: {
        source: "fixture",
        sourceProductId: "shirt-1",
        imageCount: 1,
      },
    });
  });

  it("builds quarantine metadata without mutating the source row", () => {
    const quarantine = buildCatalogQuarantineRecord(2, { kind: "quarantine", rowNumber: 2, code: "missing_title", field: "title", message: "title is required" });
    expect(quarantine).toMatchObject({ rowNumber: 2, code: "missing_title" });
  });

  it("keeps batch records preview-safe", () => {
    expect(buildCatalogImportBatchRecord({
      source: "fixture",
      checkpointCurrent: null,
      checkpointNext: "seed:v2",
      preview: true,
      rowCount: 1,
      acceptedCount: 1,
      quarantinedCount: 0,
    })).toMatchObject({ preview: true, rowCount: 1 });
  });

  it("recognizes verified exactness states", () => {
    expect(isVerifiedCatalogExactness("exact")).toBe(true);
    expect(isVerifiedCatalogExactness("similar")).toBe(false);
    expect(validateCanonicalSku("fixture:shirt-1")).toBe("fixture:shirt-1");
  });
});
