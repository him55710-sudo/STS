import { describe, expect, it } from "vitest";
import { createFixtureAdapter } from "../../lib/catalog-ingest/fixture-adapter";

describe("fixture catalog source adapter", () => {
  it("normalizes a valid JSON record and preserves stable source identity", async () => {
    const adapter = createFixtureAdapter({
      source: "fixture",
      input: {
        rows: [
          {
            sourceProductId: "shirt-1",
            brand: "폴로 랄프로렌",
            title: "  클래식  핏 옥스포드 셔츠  ",
            variant: "Sky Blue / M",
            merchant: "  폴로 공식몰  ",
            detailUrl: "https://merchant.example.test/products/shirt-1",
            images: [
              "https://cdn.example.test/shirt-1.jpg",
              "https://cdn.example.test/shirt-1.jpg",
              "https://cdn.example.test/shirt-1-alt.jpg",
            ],
            category: "fashion",
            price: "259,000",
            currency: "KRW",
            stock: "in_stock",
            sku: "SKU-1",
          },
        ],
        page: 3,
        pageSize: 50,
        hasNextPage: true,
        nextPage: 4,
        checkpoint: "fixture-3",
      },
    });

    const result = await adapter.fetchPage();
    const row = result.rows[0];

    expect(result.rows).toHaveLength(1);
    expect(row).toMatchObject({
      source: "fixture",
      sourceProductId: "shirt-1",
      sourceIdentity: {
        source: "fixture",
        sourceProductId: "shirt-1",
      },
      brand: "Polo Ralph Lauren",
      title: "클래식 핏 옥스포드 셔츠",
      merchant: "폴로 공식몰",
      variant: "Sky Blue / M",
      category: "fashion",
      price: 259000,
      currency: "KRW",
      stock: "in_stock",
      sku: "SKU-1",
      detailUrl: "https://merchant.example.test/products/shirt-1",
    });
    expect(row?.images).toHaveLength(2);
    expect(result.rowResults[0]).toMatchObject({ kind: "accepted", rowNumber: 1 });
    expect(result.pagination).toEqual({
      page: 3,
      pageSize: 50,
      hasNextPage: true,
      nextPage: 4,
    });
    expect(result.checkpoint).toEqual({ current: null, next: "fixture-3" });
    expect(result.errors).toEqual([]);
  });

  it("quarantines malformed and search rows without discarding valid rows", async () => {
    const adapter = createFixtureAdapter({
      source: "fixture",
      input: {
        rows: [
          {
            sourceProductId: "valid-1",
            title: "Valid product",
            merchant: "Fixture Merchant",
            detailUrl: "https://merchant.example.test/products/valid-1",
            images: ["https://cdn.example.test/valid-1.jpg"],
            category: "fashion",
            price: 1000,
            stock: "in_stock",
          },
          {
            title: "Missing source ID",
            merchant: "Fixture Merchant",
            detailUrl: "https://merchant.example.test/products/missing-id",
            images: ["https://cdn.example.test/missing-id.jpg"],
            category: "fashion",
            price: 1000,
            stock: "in_stock",
          },
          {
            sourceProductId: "search-1",
            title: "Search result",
            merchant: "Fixture Merchant",
            detailUrl: "https://search.shopping.naver.com/search/all?query=shirt",
            images: ["https://cdn.example.test/search-1.jpg"],
            category: "fashion",
            price: 1000,
            stock: "in_stock",
          },
          {
            sourceProductId: "image-1",
            title: "No image",
            merchant: "Fixture Merchant",
            detailUrl: "https://merchant.example.test/products/image-1",
            images: [],
            category: "fashion",
            price: 1000,
            stock: "in_stock",
          },
        ],
      },
    });

    const result = await adapter.fetchPage();

    expect(result.rows.map((row) => row.sourceIdentity.sourceProductId)).toEqual(["valid-1"]);
    expect(result.errors.map((error) => error.rowNumber)).toEqual([2, 3, 4]);
    expect(result.errors.map((error) => error.code)).toEqual([
      "missing_source_product_id",
      "search_url",
      "missing_images",
    ]);
    expect(result.errors.every((error) => error.kind === "quarantine")).toBe(true);
    expect(result.rowResults.map((rowResult) => rowResult.kind)).toEqual([
      "accepted",
      "quarantine",
      "quarantine",
      "quarantine",
    ]);
  });

  it("parses simple CSV rows and returns checkpoint metadata", async () => {
    const adapter = createFixtureAdapter({
      source: "fixture",
      input: {
        csv: [
          "sourceProductId,title,merchant,detailUrl,images,category,price,stock,brand,variant",
          "shoe-1,Everyday Runner,Fixture Merchant,https://merchant.example.test/products/shoe-1,https://cdn.example.test/shoe-1.jpg;https://cdn.example.test/shoe-1-alt.jpg,fashion,39900,in_stock,Adidas,Black / 42",
        ].join("\n"),
        page: 2,
        pageSize: 1,
        hasNextPage: false,
        checkpoint: "fixture-csv-2",
      },
    });

    const result = await adapter.fetchPage();

    expect(result.rows[0]).toMatchObject({
      sourceProductId: "shoe-1",
      title: "Everyday Runner",
      price: 39900,
      images: [
        "https://cdn.example.test/shoe-1.jpg",
        "https://cdn.example.test/shoe-1-alt.jpg",
      ],
    });
    expect(result.pagination.page).toBe(2);
    expect(result.checkpoint.next).toBe("fixture-csv-2");
    expect(result.errors).toEqual([]);
  });

  it("quarantines malformed JSON as a row-level error", async () => {
    const adapter = createFixtureAdapter({
      source: "fixture",
      input: { json: '{"rows": [' },
    });

    const result = await adapter.fetchPage();

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toMatchObject({
      kind: "quarantine",
      rowNumber: 1,
      code: "malformed_json",
    });
  });
});
