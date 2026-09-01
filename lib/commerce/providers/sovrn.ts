import { classifyCommerceUrl } from "../url-policy";
import type { CommerceOffer } from "../types";
import type { ProviderResult, ProviderSearchInput } from "./types";

const DEFAULT_COMPARISON_URL = "https://comparisons.sovrn.com/api/affiliate/v3.5/sites";

type SovrnAffiliateConfig = {
  readonly apiKey: string;
  readonly comparisonSecret: string;
  readonly siteApiKey: string;
  readonly comparisonUrl: string;
  readonly market: string;
};

type JsonRecord = Record<string, unknown>;

export function buildSovrnAffiliateLink(
  destinationUrl: string,
  input: { readonly apiKey: string; readonly cuid?: string }
): string {
  const url = new URL("https://sovrn.co");
  url.searchParams.set("key", input.apiKey);
  url.searchParams.set("u", destinationUrl);
  if (input.cuid) url.searchParams.set("cuid", input.cuid);
  return url.toString();
}

export function normalizeSovrnPriceComparisonResponse(input: unknown): CommerceOffer[] {
  const records = extractProductRecords(input);
  return records
    .map((record, index) => normalizeOffer(record, index))
    .filter((offer): offer is CommerceOffer => offer !== null);
}

function normalizeOffer(record: JsonRecord, index: number): CommerceOffer | null {
  const rawUrl = readString(record, ["url", "link", "plainlink", "productUrl", "product_url"]);
  if (!rawUrl || classifyCommerceUrl(rawUrl).kind !== "detail") return null;
  const title = readString(record, ["title", "name", "productName", "product_name"]);
  if (!title) return null;

  const providerProductId = readString(record, ["barcode", "gtin", "ean", "upc", "asin", "sku", "id"]);
  const merchant = readString(record, ["merchant", "merchantName", "merchant_name", "retailer", "salePlace"]) ?? "Sovrn 판매처";
  const price = readNumber(record, ["price", "salePrice", "sale_price", "amount"]);
  const currency = readString(record, ["currency", "currencyCode", "currency_code"]);
  const imageUrl = readString(record, ["image", "imageUrl", "image_url", "thumbnail"]);
  const availability = parseAvailability(readString(record, ["availability", "stock", "inStock", "in_stock"]));

  return {
    id: `offer:sovrn:${providerProductId ?? index}`,
    canonicalProductId: null,
    provider: "sovrn",
    ...(providerProductId ? { providerProductId } : {}),
    sourceIdentity: providerProductId
      ? {
          source: "sovrn",
          sourceProductId: providerProductId,
        }
      : null,
    merchant,
    title,
    detailUrl: rawUrl,
    discoveryUrl: null,
    affiliateUrl: null,
    imageUrl,
    imageVariants: imageUrl ? [{ kind: "primary", url: imageUrl }] : [],
    price,
    currency,
    shippingPrice: readNumber(record, ["shipping", "shippingPrice", "shipping_price"]),
    availability,
    stock: { status: availability, quantity: null },
    commissionRate: readNumber(record, ["commissionRate", "commission_rate"]),
    matchState: "unverified",
    offerLifecycle: "active",
    freshness: {
      observedAt: "2026-08-27T00:00:00.000Z",
      staleAfter: null,
    },
    identityScore: 0,
    evidence: [],
    verificationEvidence: [],
    detailPageVerified: false,
  };
}

function extractProductRecords(input: unknown): JsonRecord[] {
  if (Array.isArray(input)) return input.filter(isRecord);
  if (!isRecord(input)) return [];
  for (const key of ["products", "offers", "results", "items"]) {
    const values = input[key];
    if (Array.isArray(values)) return values.filter(isRecord);
  }
  const data = input.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) return extractProductRecords(data);
  return [];
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: JsonRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function readNumber(record: JsonRecord, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
    if (isRecord(value)) {
      const nested = readNumber(value, ["value", "amount", "price"]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function parseAvailability(value: string | null): CommerceOffer["availability"] {
  const normalized = value?.toLowerCase() ?? "";
  if (/(out|sold|unavailable|품절)/.test(normalized)) return "out_of_stock";
  if (/(in.?stock|available|재고)/.test(normalized)) return "in_stock";
  return "unknown";
}

export function isSovrnConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SOVRN_API_KEY?.trim() && env.SOVRN_COMPARISON_SECRET?.trim() && env.SOVRN_SITE_API_KEY?.trim());
}

function readConfig(env: NodeJS.ProcessEnv): SovrnAffiliateConfig | null {
  const apiKey = env.SOVRN_API_KEY?.trim();
  const comparisonSecret = env.SOVRN_COMPARISON_SECRET?.trim();
  const siteApiKey = env.SOVRN_SITE_API_KEY?.trim();
  if (!apiKey || !comparisonSecret || !siteApiKey) return null;
  return {
    apiKey,
    comparisonSecret,
    siteApiKey,
    comparisonUrl: env.SOVRN_COMPARISON_URL?.trim() || DEFAULT_COMPARISON_URL,
    market: env.SOVRN_MARKET?.trim() || "usd_en",
  };
}

export function buildSovrnPriceComparisonRequest(
  input: ProviderSearchInput,
  env: NodeJS.ProcessEnv = process.env
): { readonly url: string; readonly headers: Headers } | null {
  const config = readConfig(env);
  if (!config) return null;
  const url = new URL(`${config.comparisonUrl}/${encodeURIComponent(config.siteApiKey)}/compare/prices/${encodeURIComponent(config.market)}/by/accuracy`);
  const identifier = input.barcode;
  if (identifier) url.searchParams.set("barcode", identifier);
  if (input.plainlink) url.searchParams.set("plainlink", input.plainlink);
  if (!identifier && !input.plainlink) url.searchParams.set("search-keywords", input.keywords.join(" "));
  url.searchParams.set("limit", "10");
  if (input.trackingId) url.searchParams.set("sid", input.trackingId.slice(0, 32));
  const headers = new Headers({
    accept: "application/json",
    authorization: `secret ${config.comparisonSecret}`,
  });
  return { url: url.toString(), headers };
}

export async function searchSovrnPriceComparisons(
  input: ProviderSearchInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<ProviderResult> {
  const request = buildSovrnPriceComparisonRequest(input, env);
  const config = readConfig(env);
  if (!request || !config) {
    return { kind: "disabled", provider: "sovrn", offers: [], reason: "Sovrn credentials are not configured" };
  }
  try {
    const response = await fetch(request.url, { headers: request.headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { kind: "error", provider: "sovrn", offers: [], reason: `Sovrn returned ${response.status}` };
    return { kind: "success", provider: "sovrn", offers: normalizeSovrnPriceComparisonResponse(await response.json()) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Sovrn request failed";
    return { kind: "error", provider: "sovrn", offers: [], reason };
  }
}

export function createSovrnAffiliateLink(destinationUrl: string, cuid?: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const apiKey = env.SOVRN_API_KEY?.trim();
  return apiKey ? buildSovrnAffiliateLink(destinationUrl, { apiKey, ...(cuid ? { cuid } : {}) }) : null;
}
