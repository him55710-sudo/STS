import { afterEach, describe, expect, it, vi } from "vitest";
import { retrieveCandidates } from "../../lib/retrieval";
import type { DetectedObject } from "../../lib/types";

const object = {
  label: "옥스포드 셔츠",
  labelKo: "옥스포드 셔츠",
  category: "fashion",
  tone: "#8bb7e8",
  x: 0.1,
  y: 0.1,
  w: 0.5,
  h: 0.5,
  confidence: 0.97,
} satisfies DetectedObject;

const webCandidate = {
  id: "web-1",
  brand: "Polo Ralph Lauren",
  productName: "Classic Fit Oxford Shirt",
  category: "fashion",
  color: "sky blue",
  price: { value: 259000, currency: "KRW" },
  retailer: "Marketplace",
  url: "https://merchant.example/products/oxford",
  imageUrls: ["https://merchant.example/image.jpg"],
  source: "naver-web",
  pageTrust: 0.99,
  visualScore: 0.99,
  sameProductProbability: 0.99,
  visualSource: "naver",
  visualEvidence: ["logo and title look strong"],
  visualConflicts: [],
  detailUrl: "https://merchant.example/products/oxford",
  discoveryUrl: null,
  detailPageVerified: false,
  purchaseEligible: true,
  matchState: "exact" as const,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalog retrieval", () => {
  it("does not promote the static blue Oxford demo to an exact purchase when persisted catalog is unavailable", async () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "0");
    vi.stubEnv("NEXT_PUBLIC_CATALOG_E2E_FIXTURES", "0");
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requests.push(String(input));
      if (String(input).includes("/api/catalog/search")) {
        return new Response(JSON.stringify({ offers: [], availability: "unavailable" }), { status: 503 });
      }
      return new Response(JSON.stringify({ candidates: [webCandidate] }), { status: 200 });
    }));

    const result = await retrieveCandidates({
      ...object,
      tone: "#8ab8e8",
      attributes: {
        brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.98, evidence: ["button-down collar"] }],
        distinctiveFeatures: ["button-down collar", "Oxford weave"],
      },
    });

    expect(result.candidates.find((candidate) => candidate.catalogProductId === "plw-polo-oxford")).toBeUndefined();
    expect(result.candidates.every((candidate) => candidate.purchaseEligible !== true)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.matchState === "review" || candidate.matchState === "unverified")).toBe(true);
    expect(requests).toEqual(["/api/catalog/search", "/api/product-search"]);
  });

  it("keeps the deterministic blue Oxford exact path behind explicit fixture mode", async () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 })));

    const result = await retrieveCandidates({
      ...object,
      tone: "#8ab8e8",
      attributes: {
        brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.98, evidence: ["button-down collar"] }],
        distinctiveFeatures: ["button-down collar", "Oxford weave"],
      },
    });

    const polo = result.candidates.find((candidate) => candidate.catalogProductId === "plw-polo-oxford");
    expect(polo).toMatchObject({ tier: "exact", purchaseEligible: true, detailPageVerified: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("prefers canonical catalog candidates without treating demo data as production-verified", async () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [webCandidate] }), { status: 200 })));

    const result = await retrieveCandidates(object);

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates[0]?.source).toBe("catalog");
    expect(result.candidates.every((candidate) => candidate.source === "catalog")).toBe(true);
    expect(result.candidates[0]?.purchaseEligible).toBe(false);
    expect(result.candidates[0]?.matchState).not.toBe("exact");
    expect(result.candidates.some((candidate) => candidate.source !== "catalog" && candidate.purchaseEligible === true)).toBe(false);
    expect(result.candidates.some((candidate) => candidate.source !== "catalog" && candidate.matchState === "exact")).toBe(false);
  });

  it("falls back to unverified discovery when no canonical catalog result exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ candidates: [webCandidate] }), { status: 200 })));

    const result = await retrieveCandidates({
      ...object,
      label: "totally unknown item",
      labelKo: "완전히 다른 상품",
      category: "fashion",
    });

    const webCandidates = result.candidates.filter((candidate) => candidate.source !== "catalog");

    expect(webCandidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((candidate) => candidate.source !== "catalog")).toBe(true);
    expect(webCandidates.every((candidate) => candidate.matchState !== "exact")).toBe(true);
    expect(webCandidates.every((candidate) => candidate.purchaseEligible === false)).toBe(true);
    expect(webCandidates.every((candidate) => candidate.matchState === "unverified" || candidate.matchState === "review" || candidate.matchState === "similar")).toBe(true);
  });
});
