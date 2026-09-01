import { afterEach, describe, expect, it, vi } from "vitest";
import {
  categoryToAliImageCategory,
  parseAliExpressImageSearchResponse,
  searchAliExpressByImage,
  signTopRequest,
} from "../../lib/affiliate/aliexpress";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("AliExpress affiliate image search", () => {
  it("signs sorted non-binary TOP parameters with HMAC-MD5", () => {
    expect(
      signTopRequest(
        {
          foo: "1",
          bar: "2",
          foo_bar: "3",
          foobar: "4",
        },
        "test-secret"
      )
    ).toBe("323E7148114DC4BCFF8723A86812E609");
  });

  it("normalizes the nested product response and keeps the promotion link", () => {
    const products = parseAliExpressImageSearchResponse({
      aliexpress_affiliate_image_search_response: {
        result: {
          success: true,
          data: {
            products: {
              product: [
                {
                  product_id: "10001",
                  product_title: "Sky Blue Oxford Shirt",
                  product_detail_url: "https://www.aliexpress.com/item/10001.html",
                  promotion_link: "https://s.click.aliexpress.com/e/example",
                  product_main_image_url: "https://ae01.alicdn.com/kf/shirt.jpg",
                  target_sale_price: "32800.50",
                  target_sale_price_currency: "KRW",
                  commision_rate: "8.5%",
                  first_level_category_name: "Apparel",
                },
              ],
            },
          },
        },
      },
    });

    expect(products).toEqual([
      {
        id: "10001",
        title: "Sky Blue Oxford Shirt",
        detailUrl: "https://www.aliexpress.com/item/10001.html",
        promotionUrl: "https://s.click.aliexpress.com/e/example",
        imageUrl: "https://ae01.alicdn.com/kf/shirt.jpg",
        price: 32800.5,
        currency: "KRW",
        commissionRate: 0.085,
        category: "Apparel",
      },
    ]);
  });

  it("maps shopping categories to the image-search category hints", () => {
    expect(categoryToAliImageCategory("fashion", "shirt")).toBe("0");
    expect(categoryToAliImageCategory("fashion", "handbag")).toBe("3");
    expect(categoryToAliImageCategory("fashion", "sneakers")).toBe("4");
    expect(categoryToAliImageCategory("beauty", "serum")).toBe("88888888");
  });

  it("uploads image bytes with signed server-only affiliate parameters", async () => {
    vi.stubEnv("ALIEXPRESS_APP_KEY", "app-key");
    vi.stubEnv("ALIEXPRESS_APP_SECRET", "app-secret");
    vi.stubEnv("ALIEXPRESS_APP_SIGNATURE", "affiliate-signature");
    vi.stubGlobal("fetch", vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.body).toBeInstanceOf(FormData);
      if (!(init?.body instanceof FormData)) return new Response(null, { status: 400 });
      expect(init.body.get("method")).toBe("aliexpress.affiliate.image.search");
      expect(init.body.get("app_signature")).toBe("affiliate-signature");
      expect(String(init.body.get("sign"))).toMatch(/^[0-9A-F]{32}$/);
      const image = init.body.get("image_file_bytes");
      expect(image).toBeInstanceOf(Blob);
      expect(image instanceof Blob ? image.size : 0).toBe(4);
      return new Response(JSON.stringify({
        aliexpress_affiliate_image_search_response: {
          result: { success: true, data: { products: { product: [] } } },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));

    const products = await searchAliExpressByImage({
      image: { mimeType: "image/jpeg", bytes: new Uint8Array([1, 2, 3, 4]).buffer },
      categoryHint: "0",
      limit: 5,
    });

    expect(products).toEqual([]);
  });
});
