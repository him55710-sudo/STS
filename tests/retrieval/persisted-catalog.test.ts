import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePersistedCatalogOffers } from "../../lib/retrieval/persisted-catalog";
import { searchPersistedCatalog } from "../../lib/retrieval/catalog-provider";
import type { RetrievalQuery } from "../../lib/retrieval/types";

const validRow = {
  id: "offer-1",
  detail_url: "https://merchant.example/products/blue-oxford",
  affiliate_url: "https://adpick.co.kr/redirect/offer-1",
  exactness: "exact",
  verified_detail_url: true,
  verified: true,
  images: ["https://merchant.example/images/blue-oxford.jpg"],
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

const query: RetrievalQuery = {
  canonicalClass: "top",
  label: "oxford shirt",
  labelKo: "옥스포드 셔츠",
  tone: "#8ab8e8",
  queries: ["Polo Ralph Lauren light blue Oxford shirt"],
  attributes: {
    brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.98, evidence: [] }],
    distinctiveFeatures: ["Oxford"],
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("persisted catalog retrieval boundary", () => {
  it("keeps only active non-fixture offers with matching verified source and detail identity", () => {
    const rows = [
      validRow,
      { ...validRow, product: { ...validRow.product, lifecycle: "stale" } },
      { ...validRow, source_identity: { ...validRow.source_identity, source: { provider: "fixture" } } },
      { ...validRow, source_identity: { ...validRow.source_identity, canonical_product_id: "other-product" } },
      { ...validRow, verified_detail_url: false },
    ];

    const offers = parsePersistedCatalogOffers(rows);

    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      id: "offer-1",
      canonicalProductId: "product-1",
      sourceProvider: "catalog",
      detailUrl: "https://merchant.example/products/blue-oxford",
    });
  });

  it("converts a persisted exact offer into a purchaseable ProductCandidate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ offers: [{
      id: "offer-1",
      canonicalProductId: "product-1",
      canonicalSku: "catalog:blue-oxford",
      sourceProvider: "catalog",
      sourceProductId: "source-blue-oxford",
      brand: "Polo Ralph Lauren",
      name: "Classic Fit Oxford Shirt Sky Blue",
      merchant: "Merchant",
      category: "fashion",
      currency: "KRW",
      price: 259000,
      detailUrl: "https://merchant.example/products/blue-oxford",
      affiliateUrl: "https://adpick.co.kr/redirect/offer-1",
      exactness: "exact",
      images: ["https://merchant.example/images/blue-oxford.jpg"],
    }] }), { status: 200 })));

    const candidates = await searchPersistedCatalog(query);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      source: "catalog",
      providerProductId: "offer-1",
      catalogProductId: "product-1",
      tier: "exact",
      purchaseEligible: true,
      detailPageVerified: true,
    });
  });
});
