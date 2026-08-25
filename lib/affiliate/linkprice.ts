import { z } from "zod";

const attributionSchema = z.object({
  productId: z.string().min(1).max(120),
  postId: z.string().min(1).max(120).optional(),
  objectId: z.string().min(1).max(120).optional(),
  creatorId: z.string().min(1).max(120).optional(),
});

const linkPriceEnvSchema = z.object({
  LINKPRICE_API_URL: z.string().url().optional(),
  LINKPRICE_API_KEY: z.string().min(1).optional(),
  LINKPRICE_API_KEY_LOCATION: z.enum(["header", "query"]).default("header"),
  LINKPRICE_API_KEY_HEADER: z.string().min(1).default("Authorization"),
  LINKPRICE_API_KEY_PREFIX: z.string().default("Bearer "),
  LINKPRICE_API_KEY_QUERY_PARAM: z.string().min(1).default("api_key"),
  LINKPRICE_METHOD: z.enum(["GET", "POST"]).default("GET"),
  LINKPRICE_DESTINATION_PARAM: z.string().min(1).default("url"),
  LINKPRICE_ATTRIBUTION_PARAM: z.string().min(1).default("p_data"),
});

const knownLocationKeys = ["url", "affiliate_url", "deeplink", "deep_link", "redirect_url", "location"] as const;

type LinkPriceConfig = z.infer<typeof linkPriceEnvSchema>;

export interface AffiliateAttribution {
  readonly productId: string;
  readonly postId?: string;
  readonly objectId?: string;
  readonly creatorId?: string;
}

export type LinkPriceRedirectResult =
  | { readonly kind: "redirect"; readonly location: string }
  | { readonly kind: "fallback"; readonly status: number; readonly detail: string };

export function isLinkPriceConfigured(): boolean {
  const config = readConfig();
  return Boolean(config.LINKPRICE_API_URL && config.LINKPRICE_API_KEY);
}

export function buildLinkPriceAttribution(input: AffiliateAttribution): string {
  const parsed = attributionSchema.parse(input);
  const part = (value: string | undefined): string =>
    (value ?? "na").replace(/[^a-zA-Z0-9._~-]/g, "_");
  return `sts_${part(parsed.productId)}_${part(parsed.postId)}_${part(parsed.objectId)}_${part(parsed.creatorId)}`.slice(0, 80);
}

export function buildLinkPriceRequest(
  destinationUrl: string,
  attribution: AffiliateAttribution,
): { readonly url: string; readonly init: RequestInit } | null {
  const config = readConfig();
  if (!config.LINKPRICE_API_URL || !config.LINKPRICE_API_KEY) return null;

  const requestUrl = new URL(config.LINKPRICE_API_URL);
  const pData = buildLinkPriceAttribution(attribution);
  const headers = new Headers({ Accept: "application/json, text/plain, */*" });

  if (config.LINKPRICE_API_KEY_LOCATION === "header") {
    headers.set(config.LINKPRICE_API_KEY_HEADER, `${config.LINKPRICE_API_KEY_PREFIX}${config.LINKPRICE_API_KEY}`);
  } else {
    requestUrl.searchParams.set(config.LINKPRICE_API_KEY_QUERY_PARAM, config.LINKPRICE_API_KEY);
  }

  if (config.LINKPRICE_METHOD === "GET") {
    requestUrl.searchParams.set(config.LINKPRICE_DESTINATION_PARAM, destinationUrl);
    requestUrl.searchParams.set(config.LINKPRICE_ATTRIBUTION_PARAM, pData);
    return { url: requestUrl.toString(), init: { method: "GET", headers, redirect: "manual", signal: AbortSignal.timeout(7000) } };
  }

  headers.set("Content-Type", "application/json");
  return {
    url: requestUrl.toString(),
    init: {
      method: "POST",
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(7000),
      body: JSON.stringify({ [config.LINKPRICE_DESTINATION_PARAM]: destinationUrl, [config.LINKPRICE_ATTRIBUTION_PARAM]: pData }),
    },
  };
}

export async function resolveLinkPriceRedirect(
  destinationUrl: string,
  attribution: AffiliateAttribution,
): Promise<LinkPriceRedirectResult> {
  const request = buildLinkPriceRequest(destinationUrl, attribution);
  if (!request) return { kind: "fallback", status: 0, detail: "LINKPRICE_API_URL or LINKPRICE_API_KEY is not configured" };

  try {
    const response = await fetch(request.url, request.init);
    const headerLocation = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && headerLocation && isHttpUrl(headerLocation)) {
      return { kind: "redirect", location: headerLocation };
    }

    const body = await response.text();
    const location = extractLocation(body);
    if (response.ok && location) return { kind: "redirect", location };
    return { kind: "fallback", status: response.status, detail: body.slice(0, 240) || "LinkPrice returned no redirect URL" };
  } catch (error) {
    if (error instanceof Error) return { kind: "fallback", status: 0, detail: error.message.slice(0, 240) };
    return { kind: "fallback", status: 0, detail: "LinkPrice request failed" };
  }
}

function readConfig(): LinkPriceConfig {
  const parsed = linkPriceEnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  console.warn("[affiliate] invalid LinkPrice environment; using direct-link fallback");
  return linkPriceEnvSchema.parse({});
}

function extractLocation(body: string): string | null {
  const parsed = parseJson(body);
  if (parsed !== null) {
    const direct = findLocation(parsed);
    if (direct) return direct;
  }
  return isHttpUrl(body.trim()) ? body.trim() : null;
}

function findLocation(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of knownLocationKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && isHttpUrl(candidate)) return candidate;
  }
  return findLocation(record.data);
}

function parseJson(value: string): unknown | null {
  if (!value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
