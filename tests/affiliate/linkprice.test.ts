import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLinkPriceAttribution, buildLinkPriceRequest } from "../../lib/affiliate/linkprice";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LinkPrice request mapping", () => {
  it("creates a deterministic attribution value from the product context", () => {
    expect(buildLinkPriceAttribution({ productId: "pl-samba", postId: "post-1", objectId: "shoe", creatorId: "c-minu" }))
      .toBe("sts_pl-samba_post-1_shoe_c-minu");
  });

  it("builds a server-side GET request without placing the key in the destination URL", () => {
    vi.stubEnv("LINKPRICE_API_URL", "https://api.example.com/deeplink");
    vi.stubEnv("LINKPRICE_API_KEY", "secret-key");

    const request = buildLinkPriceRequest("https://merchant.example/item/1", { productId: "pl-samba" });
    expect(request).not.toBeNull();
    if (!request) return;

    const requestUrl = new URL(request.url);
    expect(requestUrl.searchParams.get("url")).toBe("https://merchant.example/item/1");
    expect(requestUrl.searchParams.get("p_data")).toBe("sts_pl-samba_na_na_na");
    expect(requestUrl.searchParams.has("api_key")).toBe(false);
    expect(new Headers(request.init.headers).get("Authorization")).toBe("Bearer secret-key");
  });

  it("returns no request when LinkPrice credentials are absent", () => {
    vi.stubEnv("LINKPRICE_API_URL", "");
    vi.stubEnv("LINKPRICE_API_KEY", "");
    expect(buildLinkPriceRequest("https://merchant.example/item/1", { productId: "pl-samba" })).toBeNull();
  });
});
