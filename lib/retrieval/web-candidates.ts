import { z } from "zod";
import type { MatchState, ProductIdentifier } from "../commerce/types";
import { extractJson, textJson } from "../llm";

export type WebCandidate = {
  readonly id: string;
  readonly title?: string;
  readonly merchant?: string;
  readonly provider?: string;
  readonly sourceType?: string;
  readonly brand: string | null;
  readonly productName: string;
  readonly category: string | null;
  readonly color: string | null;
  readonly price: { readonly value: number | null; readonly currency: string | null };
  readonly retailer: string;
  readonly url: string;
  readonly detailUrl: string | null;
  readonly discoveryUrl: string | null;
  detailPageVerified: boolean;
  purchaseEligible: boolean;
  matchState?: MatchState;
  readonly imageUrls: string[];
  readonly source: string;
  readonly pageTrust?: number;
  readonly sourceUrl?: string;
  visualScore?: number;
  visualSource?: string;
  sameProductProbability?: number;
  visualEvidence?: readonly string[];
  visualConflicts?: readonly string[];
  readonly affiliate?: boolean;
  readonly commissionRate?: number | null;
  readonly productDetailUrl?: string | null;
  readonly searchUrl?: string | null;
  readonly canonicalClass?: string | null;
  readonly modelName?: string | null;
  readonly sourceConfidence?: number | null;
  readonly primaryImageUrl?: string | null;
  readonly visualSiglipScore?: number | null;
  readonly preliminaryIdentityScore?: number | null;
  readonly finalIdentityScore?: number | null;
  readonly identityStatus?: "VERIFIED" | "LIKELY" | "POSSIBLE" | "CONFLICT" | "UNVERIFIED";
  readonly variantExactness?: boolean;
  readonly matchReasons?: readonly string[];
  readonly conflicts?: readonly string[];
  readonly visualEvidenceDetail?: {
    readonly model: string;
    readonly score: number;
    readonly queryCropMode: "polygon" | "bbox";
    readonly candidateImageAvailable: boolean;
  };
  readonly imageAvailable?: boolean;
  readonly identifiers?: readonly ProductIdentifier[];
  readonly modelCode?: string | null;
  readonly sku?: string | null;
  readonly gtin?: string | null;
  readonly ean?: string | null;
  readonly upc?: string | null;
  readonly sourceProviders?: readonly string[];
  readonly sourceAgreementCount?: number;
  readonly sources?: readonly Record<string, unknown>[];
  readonly rawMetadata?: Readonly<Record<string, unknown>>;
};

const llmProductSchema = z.object({
  brand: z.string().optional(),
  productName: z.string(),
  colorName: z.string().nullable().optional(),
  priceKRW: z.number().nullable().optional(),
  retailer: z.string().optional(),
});

const llmResultSchema = z.union([
  z.array(llmProductSchema),
  z.object({ products: z.array(llmProductSchema).default([]) }),
]);

export const naverSearchUrl = (query: string): string =>
  `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;

export async function searchViaLlm(queries: readonly string[]): Promise<WebCandidate[]> {
  const prompt = `You are a fashion shopping research engine. Find real purchasable products currently sold online that best match this item description (Korean market preferred, global brands OK):

"${queries.join('" / "')}"

Return ONLY JSON (no markdown fence): {"products":[{"brand": string, "productName": string (specific model name), "colorName": string|null, "priceKRW": number|null, "retailer": string}]}

Rules: real products only, up to 5. Do NOT invent model names — if you are not confident a specific model exists, omit it. If unsure of price, use null.`;

  const result = await textJson({ prompt, useWebSearch: true, timeoutMs: 20000 });
  if (!result.data) return [];
  const parsed = llmResultSchema.safeParse(extractJson<unknown>(result.data));
  if (!parsed.success) return [];
  const products = Array.isArray(parsed.data) ? parsed.data : parsed.data.products;

  return products.slice(0, 5).map((product, index) => {
    const url = naverSearchUrl([product.brand, product.productName, product.colorName].filter(Boolean).join(" "));
    return {
      id: `web-${result.provider}-${index}`,
      brand: product.brand ?? null,
      productName: product.productName,
      category: null,
      color: product.colorName ?? null,
      price: { value: typeof product.priceKRW === "number" ? product.priceKRW : null, currency: "KRW" },
      retailer: product.retailer ?? "웹 검색",
      url,
      detailUrl: null,
      discoveryUrl: url,
      detailPageVerified: false,
      purchaseEligible: false,
      matchState: "unverified" as const,
      imageUrls: [],
      source: `${result.provider}-web`,
      pageTrust: 0.55,
    };
  });
}
