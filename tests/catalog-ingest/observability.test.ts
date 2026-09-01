import { describe, expect, it } from "vitest";
import { buildCatalogAdminPreviewResponse } from "../../lib/admin/observability";

describe("catalog admin observability", () => {
  it("returns redacted preview metrics and quarantine summaries", () => {
    const response = buildCatalogAdminPreviewResponse({
      preview: {
        batch: {
          source: "fixture",
          checkpointCurrent: "seed:v1",
          checkpointNext: "seed:v2",
          preview: true,
          rowCount: 3,
          acceptedCount: 1,
          quarantinedCount: 2,
        },
        products: [
          {
            canonicalSku: "fixture:shirt-1",
            brand: "Polo Ralph Lauren",
            name: "Classic Fit Oxford",
            merchant: "Polo",
            category: "fashion",
            currency: "KRW",
            price: 259000,
            detailUrl: "https://merchant.example.test/products/shirt-1",
            affiliateUrl: null,
            exactness: "similar",
            verifiedDetailUrl: false,
            sourceIdentity: {
              source: "fixture",
              sourceProductId: "shirt-1",
              fallbackSourceProductId: "shirt-1",
            },
            sourceIdentityVerified: false,
            images: ["https://cdn.example.test/shirt-1.jpg"],
            vectorMetadata: { source: "fixture", sourceProductId: "shirt-1" },
          },
        ],
        quarantined: [
          {
            rowNumber: 2,
            code: "missing_title",
            field: "title",
            message: "title is required",
            payload: { kind: "quarantine", source: "fixture" },
          },
        ],
      },
      metrics: {
        directDetailCoverage: 0.5,
        affiliateCoverage: 0,
        quarantineRate: 0.6667,
        exactAcceptanceRate: 0,
        falseExactCases: 0,
        providerLatencyMs: 120,
        providerErrors: 1,
        outboundClicks: 2,
      },
    });

    expect(response.preview.batch).toMatchObject({
      source: "fixture",
      preview: true,
      acceptedCount: 1,
      quarantinedCount: 2,
    });
    expect(response.metrics).toMatchObject({
      directDetailCoverage: 0.5,
      affiliateCoverage: 0,
      outboundClicks: 2,
    });
    expect(response.preview.quarantined[0]).toMatchObject({
      rowNumber: 2,
      code: "missing_title",
      field: "title",
    });
  });
});
