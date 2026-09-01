import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCTS, productById } from "@/lib/catalog";
import {
  getCreatePurchaseEligibleOffer,
  isCreateCommissionVisible,
  resolveCreateExactness,
} from "@/app/create/page";
import { getCreatorPurchaseEligibleOffer } from "@/app/creator/[id]/page";

const staticAffiliateProduct = productById("pl-polo-oxford");
const blueFixtureProduct = productById("plw-polo-oxford");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("creator/create provenance claims", () => {
  it("keeps static demo products review-only and hides commission claims", () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "0");
    vi.stubEnv("NEXT_PUBLIC_CATALOG_E2E_FIXTURES", "0");

    expect(staticAffiliateProduct).toBeDefined();
    expect(staticAffiliateProduct ? resolveCreateExactness(staticAffiliateProduct, "exact") : null).toBe("review");
    expect(staticAffiliateProduct ? getCreatePurchaseEligibleOffer(staticAffiliateProduct) : null).toBeNull();
    expect(staticAffiliateProduct ? isCreateCommissionVisible(staticAffiliateProduct) : false).toBe(false);
    expect(getCreatorPurchaseEligibleOffer("pl-polo-oxford")).toBeNull();
    expect(PRODUCTS.every((product) => getCreatePurchaseEligibleOffer(product) === null)).toBe(true);
    expect(PRODUCTS.every((product) => isCreateCommissionVisible(product) === false)).toBe(true);
  });

  it("preserves the explicit blue fixture exact and commission UI", () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    vi.stubEnv("NEXT_PUBLIC_CATALOG_E2E_FIXTURES", "1");

    expect(blueFixtureProduct).toBeDefined();
    const offer = blueFixtureProduct ? getCreatePurchaseEligibleOffer(blueFixtureProduct) : null;
    expect(resolveCreateExactness(blueFixtureProduct, "exact")).toBe("exact");
    expect(offer?.matchState).toBe("exact");
    expect(offer?.sourceIdentity).not.toBeNull();
    expect(offer?.detailPageVerified).toBe(true);
    expect(offer?.offerLifecycle).toBe("active");
    expect(offer?.affiliateUrl).not.toBeNull();
    expect(isCreateCommissionVisible(blueFixtureProduct)).toBe(true);
    expect(getCreatorPurchaseEligibleOffer("plw-polo-oxford")?.matchState).toBe("exact");
  });
});
