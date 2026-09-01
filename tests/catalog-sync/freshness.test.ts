import { describe, expect, it } from "vitest";
import { refreshCatalogOffer, runCatalogSync } from "../../lib/catalog-ingest/sync";
import type { CatalogSourceAdapter } from "../../lib/catalog-ingest/types";

describe("catalog sync freshness", () => {
  it("marks out-of-stock rows stale even when the detail URL is verified", () => {
    const result = refreshCatalogOffer(
      {
        source: "fixture",
        sourceProductId: "shirt-1",
        sourceIdentity: { source: "fixture", sourceProductId: "shirt-1" },
        brand: "Polo Ralph Lauren",
        title: "Classic Fit Oxford",
        merchant: "Polo",
        variant: null,
        category: "fashion",
        price: 259000,
        currency: "KRW",
        stock: "out_of_stock",
        availability: "out_of_stock",
        sku: null,
        model: null,
        gtin: null,
        detailUrl: "https://www.musinsa.com/products/3010383",
        affiliateUrl: null,
        images: ["https://cdn.example.test/shirt-1.jpg"],
        imageVariants: [{ kind: "primary", url: "https://cdn.example.test/shirt-1.jpg" }],
      },
      new Date("2026-08-27T00:00:00.000Z")
    );

    expect(result.offerLifecycle).toBe("stale");
    expect(result.verifiedDetailUrl).toBe(true);
    expect(result.affiliateUrl).toBeNull();
    expect(result.freshness.staleAfter).toBe("2026-08-27T00:00:00.000Z");
  });

  it("keeps verified detail identity while refreshing price and stock from a bounded batch", async () => {
    const adapter: CatalogSourceAdapter = {
      source: "fixture",
      fetchPage: async () => ({
        rows: [
          {
            source: "fixture",
            sourceProductId: "shirt-1",
            sourceIdentity: { source: "fixture", sourceProductId: "shirt-1" },
            brand: "Polo Ralph Lauren",
            title: "Classic Fit Oxford",
            merchant: "Polo",
            variant: null,
            category: "fashion",
            price: 239000,
            currency: "KRW",
            stock: "in_stock",
            availability: "in_stock",
            sku: null,
            model: null,
            gtin: null,
            detailUrl: "https://www.musinsa.com/products/3010383",
            affiliateUrl: "https://track.example.test/click?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383",
            images: ["https://cdn.example.test/shirt-1.jpg"],
            imageVariants: [{ kind: "primary", url: "https://cdn.example.test/shirt-1.jpg" }],
          },
        ],
        rowResults: [
          {
            kind: "accepted",
            rowNumber: 1,
            row: {
              source: "fixture",
              sourceProductId: "shirt-1",
              sourceIdentity: { source: "fixture", sourceProductId: "shirt-1" },
              brand: "Polo Ralph Lauren",
              title: "Classic Fit Oxford",
              merchant: "Polo",
              variant: null,
              category: "fashion",
              price: 239000,
              currency: "KRW",
              stock: "in_stock",
              availability: "in_stock",
              sku: null,
              model: null,
              gtin: null,
              detailUrl: "https://www.musinsa.com/products/3010383",
              affiliateUrl: "https://track.example.test/click?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383",
              images: ["https://cdn.example.test/shirt-1.jpg"],
              imageVariants: [{ kind: "primary", url: "https://cdn.example.test/shirt-1.jpg" }],
            },
          },
        ],
        errors: [],
        pagination: { page: 2, pageSize: 1, hasNextPage: false, nextPage: null },
        checkpoint: { current: "seed:v2", next: "seed:v3" },
      }),
    };

    const result = await runCatalogSync(adapter, {
      checkpoint: { current: "seed:v1", next: "seed:v2" },
      batchSize: 10,
      maxAttempts: 1,
      retryDelayMs: 1000,
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(result.appliedRows).toBe(1);
    expect(result.checkpoint).toEqual({ current: "seed:v2", next: "seed:v3" });
    expect(result.offers[0]?.price).toBe(239000);
    expect(result.offers[0]?.stock).toBe("in_stock");
    expect(result.offers[0]?.verifiedDetailUrl).toBe(true);
    expect(result.offers[0]?.affiliateUrl).toBeNull();
    expect(result.offers[0]?.offerLifecycle).toBe("active");
  });

  it("keeps an in-stock verified detail active when the affiliate destination is missing", () => {
    const result = refreshCatalogOffer(
      {
        source: "fixture",
        sourceProductId: "shirt-1",
        sourceIdentity: { source: "fixture", sourceProductId: "shirt-1" },
        brand: "Polo Ralph Lauren",
        title: "Classic Fit Oxford",
        merchant: "Polo",
        variant: null,
        category: "fashion",
        price: 239000,
        currency: "KRW",
        stock: "in_stock",
        availability: "in_stock",
        sku: null,
        model: null,
        gtin: null,
        detailUrl: "https://www.musinsa.com/products/3010383",
        affiliateUrl: null,
        images: ["https://cdn.example.test/shirt-1.jpg"],
        imageVariants: [{ kind: "primary", url: "https://cdn.example.test/shirt-1.jpg" }],
      },
      new Date("2026-08-27T00:00:00.000Z")
    );

    expect(result.affiliateUrl).toBeNull();
    expect(result.offerLifecycle).toBe("active");
    expect(result.freshness.staleAfter).toBeNull();
  });

  it("marks an invalid detail URL stale even when inventory is in stock", () => {
    const result = refreshCatalogOffer(
      {
        source: "fixture",
        sourceProductId: "shirt-1",
        sourceIdentity: { source: "fixture", sourceProductId: "shirt-1" },
        brand: "Polo Ralph Lauren",
        title: "Classic Fit Oxford",
        merchant: "Polo",
        variant: null,
        category: "fashion",
        price: 239000,
        currency: "KRW",
        stock: "in_stock",
        availability: "in_stock",
        sku: null,
        model: null,
        gtin: null,
        detailUrl: "https://www.musinsa.com/search/all?query=oxford",
        affiliateUrl: null,
        images: ["https://cdn.example.test/shirt-1.jpg"],
        imageVariants: [{ kind: "primary", url: "https://cdn.example.test/shirt-1.jpg" }],
      },
      new Date("2026-08-27T00:00:00.000Z")
    );

    expect(result.verifiedDetailUrl).toBe(false);
    expect(result.offerLifecycle).toBe("stale");
    expect(result.freshness.staleAfter).toBe("2026-08-27T00:00:00.000Z");
  });
});
