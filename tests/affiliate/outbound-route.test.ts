import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  recordAffiliateClickMock,
  getCommerceOfferByIdMock,
  getCommerceOffersForLegacyIdMock,
  resolveLinkPriceRedirectMock,
  resolveAdpickRedirectMock,
  createSovrnAffiliateLinkMock,
} = vi.hoisted(() => ({
  recordAffiliateClickMock: vi.fn().mockResolvedValue(undefined),
  getCommerceOfferByIdMock: vi.fn(),
  getCommerceOffersForLegacyIdMock: vi.fn(),
  resolveLinkPriceRedirectMock: vi.fn(),
  resolveAdpickRedirectMock: vi.fn(),
  createSovrnAffiliateLinkMock: vi.fn(),
}));

vi.mock("../../lib/affiliate/clicks", () => ({
  recordAffiliateClick: recordAffiliateClickMock,
}));

vi.mock("../../lib/commerce/canonical-repository", () => ({
  getCommerceOfferById: getCommerceOfferByIdMock,
  getCommerceOffersForLegacyId: getCommerceOffersForLegacyIdMock,
}));

vi.mock("../../lib/affiliate/linkprice", () => ({
  resolveLinkPriceRedirect: resolveLinkPriceRedirectMock,
}));

vi.mock("../../lib/affiliate/adpick", () => ({
  isAdpickConfigured: () => false,
  isAffiliateEligibleUrl: () => false,
  productDestinationUrl: () => null,
  resolveAdpickRedirect: resolveAdpickRedirectMock,
}));

vi.mock("../../lib/commerce/providers/sovrn", () => ({
  createSovrnAffiliateLink: createSovrnAffiliateLinkMock,
}));

import { handleOfferOutboundRedirect } from "../../lib/affiliate/outbound";
import { GET as legacyGoGET } from "../../app/go/[productId]/route";
import { GET as apiOutboundGET } from "../../app/api/outbound/route";

function baseOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer:fixture",
    canonicalProductId: "canonical:fixture",
    provider: "direct",
    providerProductId: "fixture-product",
    sourceIdentity: { source: "direct", sourceProductId: "fixture-product" },
    merchant: "Fixture Merchant",
    title: "Fixture Product",
    detailUrl: "https://www.musinsa.com/products/3010383",
    discoveryUrl: null,
    affiliateUrl: null,
    imageUrl: "/looks/plw-polo-oxford.jpg",
    imageVariants: [{ kind: "primary", url: "/looks/plw-polo-oxford.jpg" }],
    price: 259000,
    currency: "KRW",
    shippingPrice: null,
    availability: "in_stock",
    stock: { status: "in_stock", quantity: null },
    commissionRate: null,
    matchState: "exact",
    offerLifecycle: "active",
    freshness: {
      observedAt: "2026-08-27T00:00:00.000Z",
      staleAfter: null,
    },
    identityScore: 1,
    evidence: [
      { signal: "model", value: "Fixture Product", score: 1 },
      { signal: "detail_page", value: "https://www.musinsa.com/products/3010383", score: 1 },
    ],
    verificationEvidence: [{ signal: "detail_page", value: "https://www.musinsa.com/products/3010383", score: 1 }],
    detailPageVerified: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("offer outbound redirect route", () => {
  it("does not redirect a direct canonical offer when no affiliate URL is configured", async () => {
    getCommerceOfferByIdMock.mockReturnValue(baseOffer());

    const response = await handleOfferOutboundRedirect(
      new NextRequest("https://example.com/go/offer/offer%3Afixture"),
      "offer:fixture"
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a verified canonical offer through its approved affiliate path", async () => {
    const affiliateUrl = "https://sovrn.co?u=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383";
    getCommerceOfferByIdMock.mockReturnValue(baseOffer({ affiliateUrl }));

    const response = await handleOfferOutboundRedirect(
      new NextRequest("https://example.com/go/offer/offer%3Afixture"),
      "offer:fixture"
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(new URL(affiliateUrl).toString());
  });

  it("allows a direct offer without a stored affiliate URL only through the local E2E resolver", async () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    getCommerceOfferByIdMock.mockReturnValue(baseOffer({ id: "offer:catalog:plw-polo-oxford" }));

    const response = await handleOfferOutboundRedirect(
      new NextRequest("https://example.com/go/offer/offer%3Acatalog%3Aplw-polo-oxford"),
      "offer:catalog:plw-polo-oxford"
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:3100/go/test-affiliate?offerId=offer%3Acatalog%3Aplw-polo-oxford&destination=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383"
    );
  });

  it.each([
    ["search URL", { detailUrl: "https://search.shopping.naver.com/search/all?query=oxford" }],
    ["invalid host", { detailUrl: "https://evil.example/products/3010383" }],
    ["unverified offer", { matchState: "unverified" }],
    ["stale offer", { offerLifecycle: "stale" }],
    ["quarantined offer", { offerLifecycle: "quarantined" }],
  ])("rejects %s", async (_label, overrides) => {
    getCommerceOfferByIdMock.mockReturnValue(baseOffer(overrides));

    const response = await handleOfferOutboundRedirect(
      new NextRequest("https://example.com/go/offer/offer%3Afixture"),
      "offer:fixture"
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });

  it("rejects non-direct offers without an affiliate URL", async () => {
    getCommerceOfferByIdMock.mockReturnValue(baseOffer({ provider: "sovrn", affiliateUrl: null }));

    const response = await handleOfferOutboundRedirect(
      new NextRequest("https://example.com/go/offer/offer%3Afixture"),
      "offer:fixture"
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });

  it("rejects custom destination URLs even when they look trusted", async () => {
    const response = await handleOfferOutboundRedirect(
      new NextRequest("https://example.com/go/custom-1?destinationUrl=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383"),
      "custom-1"
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });

  it("routes a legacy /go request through the fixture-only offer resolver", async () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    const offer = baseOffer({ id: "offer:catalog:plw-polo-oxford" });
    getCommerceOffersForLegacyIdMock.mockReturnValue([offer]);
    getCommerceOfferByIdMock.mockReturnValue(offer);

    const response = await legacyGoGET(
      new NextRequest("https://example.com/go/plw-polo-oxford"),
      { params: Promise.resolve({ productId: "plw-polo-oxford" }) },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/go/test-affiliate?");
  });

  it("routes a legacy /api/outbound request through the same offer gate", async () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    const offer = baseOffer({ id: "offer:catalog:plw-polo-oxford" });
    getCommerceOffersForLegacyIdMock.mockReturnValue([offer]);
    getCommerceOfferByIdMock.mockReturnValue(offer);

    const response = await apiOutboundGET(
      new NextRequest("https://example.com/api/outbound?productId=plw-polo-oxford"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/go/test-affiliate?");
  });

  it.each([
    ["static", "pl-polo-oxford", { matchState: "review", offerLifecycle: "quarantined" }],
    ["demo", "plw-polo-oxford", { matchState: "review", offerLifecycle: "quarantined" }],
    ["search-only", "pl-levis-501", { detailUrl: null, matchState: "unverified" }],
  ] as const)("fails closed for a legacy %s product", async (_label, productId, overrides) => {
    const offer = baseOffer({
      id: `offer:catalog:${productId}`,
      ...overrides,
      affiliateUrl: null,
      detailPageVerified: false,
      verificationEvidence: [],
    });
    getCommerceOffersForLegacyIdMock.mockReturnValue([offer]);
    getCommerceOfferByIdMock.mockReturnValue(offer);

    const response = await legacyGoGET(
      new NextRequest(`https://example.com/go/${productId}`),
      { params: Promise.resolve({ productId }) },
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    ["ADPICK", "https://track.adpick.co.kr/click?url=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F9999999"],
    ["LinkPrice", "https://click.linkprice.com/click?url=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F9999999"],
  ])("rejects a legacy request with a misbound %s affiliate URL", async (_network, affiliateUrl) => {
    const offer = baseOffer({
      id: "offer:catalog:plw-polo-oxford",
      affiliateUrl,
    });
    getCommerceOffersForLegacyIdMock.mockReturnValue([offer]);
    getCommerceOfferByIdMock.mockReturnValue(offer);

    const response = await apiOutboundGET(
      new NextRequest("https://example.com/api/outbound?productId=plw-polo-oxford"),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects a custom destination supplied to a legacy route", async () => {
    const response = await apiOutboundGET(
      new NextRequest("https://example.com/api/outbound?productId=plw-polo-oxford&destinationUrl=https%3A%2F%2Fwww.musinsa.com%2Fproducts%2F3010383"),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("location")).toBeNull();
  });
});
