import { describe, expect, it } from "vitest";
import {
  buildSovrnAffiliateLink,
  normalizeSovrnPriceComparisonResponse,
} from "../../../lib/commerce/providers/sovrn";

describe("Sovrn commerce provider", () => {
  it("builds a server-side tracked link without changing the destination", () => {
    const result = buildSovrnAffiliateLink(
      "https://merchant.example/products/123?variant=blue",
      { apiKey: "test-key", cuid: "sts-object-1" }
    );
    const url = new URL(result);

    expect(url.hostname).toBe("sovrn.co");
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(url.searchParams.get("u")).toBe("https://merchant.example/products/123?variant=blue");
    expect(url.searchParams.get("cuid")).toBe("sts-object-1");
  });

  it("normalizes a price comparison response without treating a search URL as detail", () => {
    const offers = normalizeSovrnPriceComparisonResponse({
      products: [
        {
          title: "Polo Ralph Lauren Classic Fit Oxford Shirt Sky Blue",
          merchant: "Global Shop",
          url: "https://global.example/products/123",
          image: "https://global.example/images/123.jpg",
          price: 129.99,
          currency: "USD",
          barcode: "123456789012",
        },
        {
          title: "Oxford Shirt Search",
          merchant: "Search",
          url: "https://search.example/search?q=shirt",
        },
      ],
    });

    expect(offers).toHaveLength(1);
    expect(offers[0]?.providerProductId).toBe("123456789012");
    expect(offers[0]?.detailUrl).toBe("https://global.example/products/123");
  });
});
