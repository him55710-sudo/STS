import { describe, expect, it, vi } from "vitest";
import { buildAdpickDirectLinkUrl, buildPData, isAffiliateEligibleUrl } from "../../lib/affiliate/adpick";

describe("ADPICK attribution", () => {
  it("keeps p_data safe and within the provider limit", () => {
    const value = buildPData({ productId: "pl-polo-oxford", postId: "post/one", objectId: "obj one" });

    expect(value.length).toBeLessThanOrEqual(50);
    expect(value).not.toMatch(/[^a-zA-Z0-9._~-]/);
  });

  it("builds a server-side directlink URL with encoded destination and p_data", () => {
    vi.stubEnv("ADPICK_API_KEY", "test-key");
    const value = buildAdpickDirectLinkUrl("https://mall.example/products/1?color=blue", "sts_product_post");
    const url = new URL(value ?? "");

    expect(url.pathname).toBe("/api/test-key/directlink");
    expect(url.searchParams.get("url")).toBe("https://mall.example/products/1?color=blue");
    expect(url.searchParams.get("p_data")).toBe("sts_product_post");
  });

  it("rejects marketplace listing URLs as commission targets", () => {
    expect(isAffiliateEligibleUrl("https://search.shopping.naver.com/search/all?query=셔츠")).toBe(false);
    expect(isAffiliateEligibleUrl("https://www.musinsa.com/search/goods?keyword=셔츠")).toBe(false);
    expect(isAffiliateEligibleUrl("https://www.musinsa.com/products/3010383")).toBe(true);
    expect(isAffiliateEligibleUrl("https://mall.example/products/1")).toBe(true);
  });
});
