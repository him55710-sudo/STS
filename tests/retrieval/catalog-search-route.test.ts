import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const supabaseClientMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: supabaseClientMock }));

import { POST } from "../../app/api/catalog/search/route";

const validRow = {
  id: "offer-1",
  detail_url: "https://merchant.example/products/blue-oxford",
  affiliate_url: "https://adpick.co.kr/redirect/offer-1",
  exactness: "exact",
  verified_detail_url: true,
  verified: true,
  images: [],
  product: {
    id: "product-1",
    canonical_sku: "catalog:blue-oxford",
    brand: "Polo Ralph Lauren",
    name: "Classic Fit Oxford Shirt Sky Blue",
    merchant: "Merchant",
    category: "fashion",
    currency: "KRW",
    price: 259000,
    image_primary_url: null,
    image_alt_urls: [],
    lifecycle: "active",
    source_identity_id: "identity-1",
    fallback_source_identity_id: null,
    source_identity_verified: true,
  },
  source_identity: {
    id: "identity-1",
    source_id: "catalog-source-1",
    source_product_id: "source-blue-oxford",
    canonical_product_id: "product-1",
    detail_url: "https://merchant.example/products/blue-oxford",
    verified: true,
    verified_detail_url: true,
    source: { provider: "catalog" },
  },
};

afterEach(() => {
  supabaseClientMock.mockReset();
});

describe("catalog search route", () => {
  it("returns no canonical offers when Supabase is unavailable", async () => {
    supabaseClientMock.mockRejectedValueOnce(new Error("missing Supabase configuration"));

    const response = await POST(new NextRequest("http://localhost/api/catalog/search", {
      method: "POST",
      body: JSON.stringify({ queries: ["blue oxford shirt"] }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ offers: [], availability: "unavailable" });
  });

  it("returns only parsed canonical offers from the persisted read boundary", async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: [validRow], error: null });
    supabaseClientMock.mockResolvedValueOnce({ from: vi.fn(() => ({ select: selectMock })) });

    const response = await POST(new NextRequest("http://localhost/api/catalog/search", {
      method: "POST",
      body: JSON.stringify({ queries: ["blue oxford shirt"], limit: 6 }),
      headers: { "Content-Type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.availability).toBe("available");
    expect(body.offers).toHaveLength(1);
    expect(body.offers[0]).toMatchObject({ id: "offer-1", canonicalProductId: "product-1" });
    expect(selectMock).toHaveBeenCalledOnce();
  });
});
