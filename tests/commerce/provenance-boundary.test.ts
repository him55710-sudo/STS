import { describe, expect, it } from "vitest";
import { getCommerceOffersForLegacyId } from "../../lib/commerce/canonical-repository";
import { isPurchaseEligibleOffer } from "../../lib/commerce/url-policy";
import { POSTS, PRODUCTS } from "../../lib/catalog";
import {
  CREATOR_ENTERED_PRODUCT_EXACTNESS,
  resolveExactnessForProduct,
  type Product,
} from "../../lib/types";

describe("creator and demo provenance boundaries", () => {
  it("keeps a creator-entered URL in review without catalog identity evidence", () => {
    const manualProduct: Product = {
      id: "custom-manual",
      brand: "merchant.example.test",
      name: "Creator supplied product",
      price: 1000,
      currency: "KRW",
      retailer: "merchant.example.test",
      url: "https://merchant.example.test/products/manual-1",
      image: "/looks/_custom-link.svg",
      category: "fashion",
      affiliate: false,
      similarIds: [],
      source: "user-upload",
    };

    expect(CREATOR_ENTERED_PRODUCT_EXACTNESS).toBe("review");
    expect(resolveExactnessForProduct(manualProduct, "exact")).toBe("review");
    expect(resolveExactnessForProduct(manualProduct, "similar")).toBe("similar");
  });

  it("allows exactness only for a catalog record with identity evidence", () => {
    const catalogProduct: Product = {
      id: "catalog-verified",
      brand: "catalog.example.test",
      name: "Verified catalog product",
      price: 1000,
      currency: "KRW",
      retailer: "catalog.example.test",
      url: "https://catalog.example.test/products/verified-1",
      image: "/looks/_catalog-link.svg",
      category: "fashion",
      affiliate: false,
      similarIds: [],
      source: "catalog-api",
      sourceProductId: "catalog-verified-1",
      identityEvidence: ["catalog provider product id"],
    };

    expect(resolveExactnessForProduct(catalogProduct, "exact")).toBe("exact");
    expect(resolveExactnessForProduct({ ...catalogProduct, identityEvidence: [] }, "exact")).toBe("review");
  });

  it("keeps static seed products and posts out of production-verified commerce", () => {
    const offers = PRODUCTS.flatMap((product) => getCommerceOffersForLegacyId(product.id));
    const offer = getCommerceOffersForLegacyId("plw-polo-oxford")[0];

    expect(PRODUCTS.every((product) => product.is_demo === true && product.source === "demo-seed")).toBe(true);
    expect(POSTS.every((post) => post.is_demo === true && post.source === "demo-seed")).toBe(true);
    expect(offers.every((candidate) => !isPurchaseEligibleOffer(candidate))).toBe(true);
    expect(offer).toMatchObject({
      matchState: "review",
      offerLifecycle: "quarantined",
      detailPageVerified: false,
      sourceIdentity: null,
    });
    expect(offer ? isPurchaseEligibleOffer(offer) : false).toBe(false);
  });
});
