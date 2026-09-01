import { describe, expect, it } from "vitest";
import { KBEAUTY_PRODUCTS, productById } from "../../lib/catalog";
import {
  affiliateNetworkForUrl,
  buildMarketplaceSearchLinks,
  isMarketplaceDetailUrl,
  isTrustedOutboundUrl,
} from "../../lib/marketplace-links";

describe("verified catalog purchase links", () => {
  it("uses a product detail URL for the reported sky-blue Oxford shirt", () => {
    const product = productById("plw-polo-oxford");
    if (!product) throw new Error("plw-polo-oxford is missing from the catalog");

    expect(new URL(product.url).pathname).toMatch(/\/products?\//i);
  });

  it("accepts the verified Musinsa detail URL and rejects a search URL", () => {
    expect(isMarketplaceDetailUrl("https://www.musinsa.com/products/3010383")).toBe(true);
    expect(isMarketplaceDetailUrl("https://search.shopping.naver.com/search/all?query=셔츠")).toBe(false);
  });

  it("accepts official affiliate redirects without permitting arbitrary redirects", () => {
    const aliExpressUrl = "https://s.click.aliexpress.com/e/example";

    expect(isTrustedOutboundUrl(aliExpressUrl)).toBe(true);
    expect(affiliateNetworkForUrl(aliExpressUrl)).toBe("aliexpress");
    expect(isTrustedOutboundUrl("https://s.click.aliexpress.com.evil.example/e/example")).toBe(false);
    expect(isTrustedOutboundUrl("https://evil.example/item/123")).toBe(false);
  });

  it("provides explicit marketplace search fallbacks without calling them verified", () => {
    const links = buildMarketplaceSearchLinks({ brand: "Polo Ralph Lauren", name: "Oxford Shirt Blue" });

    expect(links.map((link) => link.marketplace)).toEqual(["naver", "musinsa", "coupang"]);
    expect(links.every((link) => link.kind === "search" && !link.verified)).toBe(true);
  });

  it("keeps the K-beauty launch set on direct Coupang product pages", () => {
    expect(KBEAUTY_PRODUCTS).toHaveLength(3);
    expect(KBEAUTY_PRODUCTS.every((product) => product.category === "beauty" && product.affiliate)).toBe(true);
    expect(KBEAUTY_PRODUCTS.every((product) => isMarketplaceDetailUrl(product.url))).toBe(true);
  });
});
