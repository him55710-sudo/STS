import { describe, expect, it } from "vitest";
import {
  CatalogCapabilityError,
  createCatalogFeedAdapter,
  createCatalogSourceAdapter,
  type CatalogSourceAdapter,
} from "../../lib/catalog-ingest/provider-adapter";
import { createFixtureAdapter } from "../../lib/catalog-ingest/fixture-adapter";
import {
  createAffiliateResolver,
  type AffiliateResolutionInput,
} from "../../lib/catalog-ingest/affiliate-resolver";

describe("catalog provider adapters", () => {
  it("shares one source adapter contract between fixture and live feed adapters", async () => {
    const fixture = createFixtureAdapter({
      source: "fixture",
      input: { rows: [] },
    });
    const feed = createCatalogFeedAdapter({
      source: "approved-feed",
      feedUrl: "https://catalog.example.test/feed",
      request: async () =>
        new Response(
          JSON.stringify({
            items: [],
            page: 2,
            pageSize: 25,
            hasNextPage: false,
            checkpoint: "feed-2",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
    const adapters: readonly CatalogSourceAdapter[] = [fixture, feed];

    const pages = await Promise.all(adapters.map((adapter) => adapter.fetchPage()));

    expect(pages[0]?.pagination.page).toBe(1);
    expect(pages[1]?.pagination.page).toBe(2);
    expect(pages[1]?.checkpoint.next).toBe("feed-2");
  });

  it("rejects affiliate-only providers as catalog sources", () => {
    expect(() =>
      createCatalogSourceAdapter({
        provider: "linkprice",
        feedUrl: "https://affiliate.example.test/feed",
      }),
    ).toThrow(CatalogCapabilityError);
  });

  it("keeps affiliate resolution separate from catalog identity", async () => {
    const input: AffiliateResolutionInput = {
      detailUrl: "https://merchant.example.test/products/shirt-1",
      sourceProductId: "shirt-1",
      attribution: { campaign: "fixture-test" },
    };
    const resolver = createAffiliateResolver({
      network: "linkprice",
      resolve: async (request) => ({
        affiliateUrl: `https://track.example.test/click?u=${encodeURIComponent(request.detailUrl)}`,
        attribution: request.attribution,
      }),
    });

    const result = await resolver.resolve(input);

    expect(result.affiliateUrl).toContain("track.example.test");
    expect(result.detailUrl).toBe(input.detailUrl);
  });

  it("quarantines live feed search and discovery URLs", async () => {
    const adapter = createCatalogFeedAdapter({
      source: "catalog",
      feedUrl: "https://catalog.example.test/feed",
      request: async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                sourceProductId: "search-1",
                title: "Search result",
                merchant: "Catalog Merchant",
                detailUrl: "https://search.shopping.naver.com/search/all?query=shirt",
                images: ["https://cdn.example.test/search-1.jpg"],
                category: "fashion",
                price: 1000,
              },
              {
                sourceProductId: "discovery-1",
                title: "Category result",
                merchant: "Catalog Merchant",
                detailUrl: "https://merchant.example.test/category/shirts",
                images: ["https://cdn.example.test/discovery-1.jpg"],
                category: "fashion",
                price: 1000,
              },
            ],
            page: 4,
            pageSize: 2,
            hasNextPage: false,
          }),
          { status: 200 },
        ),
    });

    const result = await adapter.fetchPage();

    expect(result.rows).toEqual([]);
    expect(result.errors.map((error) => error.code)).toEqual(["search_url", "search_url"]);
    expect(result.rowResults.map((rowResult) => rowResult.kind)).toEqual(["quarantine", "quarantine"]);
    expect(result.pagination).toMatchObject({ page: 4, pageSize: 2, hasNextPage: false, nextPage: null });
  });

  it("quarantines live feed rows with arbitrary or unapproved detail hosts", async () => {
    const adapter = createCatalogFeedAdapter({
      source: "catalog",
      feedUrl: "https://catalog.example.test/feed",
      request: async () =>
        new Response(
          JSON.stringify({
            rows: [
              {
                sourceProductId: "unapproved-1",
                title: "Unapproved product",
                merchant: "Catalog Merchant",
                detailUrl: "https://evil.example.test/offer/unapproved-1",
                images: ["https://cdn.example.test/unapproved-1.jpg"],
                category: "fashion",
                price: 1000,
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const result = await adapter.fetchPage();

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toMatchObject({
      kind: "quarantine",
      rowNumber: 1,
      code: "invalid_detail_url",
      field: "detailUrl",
    });
  });

  it("quarantines live feed detail URLs that are not HTTPS", async () => {
    const adapter = createCatalogFeedAdapter({
      source: "catalog",
      feedUrl: "https://catalog.example.test/feed",
      request: async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                sourceProductId: "insecure-1",
                title: "Insecure product",
                merchant: "Catalog Merchant",
                detailUrl: "http://www.musinsa.com/products/3010383",
                images: ["https://cdn.example.test/insecure-1.jpg"],
                category: "fashion",
                price: 1000,
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const result = await adapter.fetchPage();

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toMatchObject({ code: "invalid_detail_url", field: "detailUrl" });
  });

  it("quarantines malformed live feed rows without rejecting the page", async () => {
    const adapter = createCatalogFeedAdapter({
      source: "catalog",
      feedUrl: "https://catalog.example.test/feed",
      request: async () =>
        new Response(
          JSON.stringify({
            items: [
              null,
              {
                sourceProductId: "valid-1",
                title: "Valid product",
                merchant: "Catalog Merchant",
                detailUrl: "https://www.musinsa.com/products/3010383",
                images: ["https://cdn.example.test/valid-1.jpg"],
                category: "fashion",
                price: 1000,
              },
            ],
            page: 2,
            pageSize: 25,
            hasNextPage: true,
            nextPage: 3,
          }),
          { status: 200 },
        ),
    });

    const result = await adapter.fetchPage();

    expect(result.rows.map((row) => row.sourceProductId)).toEqual(["valid-1"]);
    expect(result.errors[0]).toMatchObject({ kind: "quarantine", rowNumber: 1, code: "malformed_row" });
    expect(result.rowResults.map((rowResult) => rowResult.kind)).toEqual(["quarantine", "accepted"]);
    expect(result.pagination).toMatchObject({ page: 2, pageSize: 25, hasNextPage: true, nextPage: 3 });
  });

  it("preserves a valid feed affiliate tracking URL on accepted rows", async () => {
    const detailUrl = "https://www.musinsa.com/products/3010383";
    const affiliateUrl = `https://sovrn.co?u=${encodeURIComponent(detailUrl)}`;
    const adapter = createCatalogFeedAdapter({
      source: "catalog",
      feedUrl: "https://catalog.example.test/feed",
      request: async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                sourceProductId: "affiliate-1",
                title: "Tracked product",
                merchant: "Catalog Merchant",
                detailUrl,
                affiliateUrl,
                images: ["https://cdn.example.test/affiliate-1.jpg"],
                category: "fashion",
                price: 1000,
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const result = await adapter.fetchPage();

    expect(result.rows[0]).toMatchObject({ detailUrl, affiliateUrl: new URL(affiliateUrl).toString() });
    expect(result.errors).toEqual([]);
  });
});
