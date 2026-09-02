import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCTS, productById } from "@/lib/catalog";
import {
  getCreatePurchaseEligibleOffer,
  isCreateCommissionVisible,
  resolveCreateExactness,
} from "@/app/create/page";
import {
  createDefaultPublishMetadata,
  getCreatorPublishGate,
  resolveCandidateExactness,
} from "@/app/create/creator-publishing";
import { getCreatorPurchaseEligibleOffer } from "@/app/creator/[id]/page";
import type { CreatorUploadedAsset } from "@/app/create/creator-publishing";
import type { ProductCandidate } from "@/lib/retrieval";

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

  it("keeps publish gated to ready, display-approved, rights-safe creator assets", () => {
    const metadata = {
      ...createDefaultPublishMetadata(),
      sourceIdentity: "creator-camera-roll-1",
      rightsEvidence: "creator owns the uploaded shoot",
    };
    const readyAsset = asset({ altText: "Blue shirt on a hanger", displayApproved: true });

    expect(getCreatorPublishGate(metadata, [readyAsset])).toMatchObject({ kind: "ready" });
    expect(getCreatorPublishGate({ ...metadata, rightsEvidence: "" }, [readyAsset])).toMatchObject({
      kind: "blocked",
    });
    expect(getCreatorPublishGate(metadata, [asset({ altText: "", displayApproved: true })])).toMatchObject({
      kind: "blocked",
    });
    expect(getCreatorPublishGate(metadata, [asset({ altText: "Pending asset", uploadState: "processing" })])).toMatchObject({
      kind: "blocked",
    });
  });

  it("does not let a wrong unverified candidate become exact", () => {
    const wrongCandidate = candidate({ tier: "unverified" });
    const likelyCatalogCandidate = candidate({ tier: "likely", catalogProductId: "catalog-maybe" });

    expect(resolveCandidateExactness(wrongCandidate, "exact")).toBe("review");
    expect(resolveCandidateExactness(likelyCatalogCandidate, "exact")).toBe("review");
  });
});

function asset(patch: Partial<CreatorUploadedAsset>): CreatorUploadedAsset {
  return {
    localId: "local-asset-1",
    assetId: "media-asset-1",
    fileName: "asset.jpg",
    kind: "image",
    previewUrl: "blob:http://127.0.0.1/asset",
    publicUrl: "https://cdn.example.test/media/asset.jpg",
    width: 900,
    height: 1200,
    durationMs: null,
    uploadState: "ready",
    moderationState: "approved",
    reviewState: "approved",
    displayApproved: false,
    altText: "Uploaded asset",
    candidates: [],
    error: null,
    ...patch,
  };
}

function candidate(patch: Partial<ProductCandidate>): ProductCandidate {
  return {
    id: "candidate-wrong",
    retailer: "merchant.example.test",
    productName: "Wrong product",
    brand: "Wrong Brand",
    category: "fashion",
    color: null,
    url: "https://merchant.example.test/products/wrong",
    detailUrl: "https://merchant.example.test/products/wrong",
    imageUrls: ["/looks/_custom-link.svg"],
    price: { value: 1000, currency: "KRW" },
    tier: "unverified",
    scores: { visual: 0.2, brand: 0, logo: 0, color: 0.1, attributes: 0, text: 0, pageTrust: 0, final: 0.2 },
    matchReason: ["visual similarity only"],
    source: "fixture",
    purchaseEligible: true,
    affiliate: false,
    commissionRate: null,
    ...patch,
  };
}
