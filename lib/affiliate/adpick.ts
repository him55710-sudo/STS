import { z } from "zod";
import { isMarketplaceDetailUrl } from "../marketplace-links";
import type { Product } from "../types";

const ADPICK_BASE_URL = "https://biz.adpick.co.kr/api";
const adpickProductSchema = z.object({
  title: z.string().optional(),
  price: z.string().optional(),
  photo: z.string().optional(),
  cp_code: z.string().optional(),
  cp_name: z.string().optional(),
  commissionlink: z.string().optional(),
});

const adpickSearchSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(adpickProductSchema).optional(),
});

const adpickConversionSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export interface AffiliateAttribution {
  readonly productId: string;
  readonly postId?: string;
  readonly objectId?: string;
  readonly creatorId?: string;
}

export interface AdpickProduct {
  readonly title: string;
  readonly price: number | null;
  readonly imageUrl: string | null;
  readonly retailer: string;
  readonly commissionUrl: string | null;
  readonly commissionRate: number | null;
  readonly source: "adpick";
}

export type AdpickRedirectResult =
  | { readonly kind: "redirect"; readonly location: string }
  | { readonly kind: "fallback"; readonly status: number; readonly detail: string };

const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function adpickApiKey(): string | null {
  return clean(process.env.ADPICK_API_KEY);
}

export function isAdpickConfigured(): boolean {
  return adpickApiKey() !== null;
}

export function buildPData(input: AffiliateAttribution): string {
  const part = (value: string | undefined): string =>
    (value ?? "na").replace(/[^a-zA-Z0-9._~-]/g, "_");
  return `sts_${part(input.productId)}_${part(input.postId)}_${part(input.objectId)}_${part(input.creatorId)}`.slice(0, 50);
}

export function buildAdpickDirectLinkUrl(destinationUrl: string, pData: string): string | null {
  const key = adpickApiKey();
  if (!key) return null;
  const url = new URL(`${ADPICK_BASE_URL}/${encodeURIComponent(key)}/directlink`);
  url.searchParams.set("url", destinationUrl);
  url.searchParams.set("p_data", pData);
  if (process.env.ADPICK_FORCEREDIRECT?.trim().toLowerCase() === "true") {
    url.searchParams.set("forceredirect", "true");
  }
  return url.toString();
}

export async function resolveAdpickRedirect(
  destinationUrl: string,
  attribution: AffiliateAttribution
): Promise<AdpickRedirectResult> {
  const directLinkUrl = buildAdpickDirectLinkUrl(destinationUrl, buildPData(attribution));
  if (!directLinkUrl) return { kind: "fallback", status: 0, detail: "ADPICK_API_KEY is not configured" };

  try {
    const response = await fetch(directLinkUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      return { kind: "redirect", location };
    }
    const detail = (await response.text()).slice(0, 240);
    return { kind: "fallback", status: response.status, detail };
  } catch (error) {
    if (error instanceof Error) {
      return { kind: "fallback", status: 0, detail: error.message.slice(0, 240) };
    }
    return { kind: "fallback", status: 0, detail: "ADPICK request failed" };
  }
}

export function productDestinationUrl(product: Product): string {
  const overrides = readProductUrlOverrides();
  const override = overrides[product.id];
  return override ?? product.url;
}

export function isAffiliateEligibleUrl(destinationUrl: string): boolean {
  return isMarketplaceDetailUrl(destinationUrl);
}

export async function searchAdpickProducts(query: string, pData = "sts_search"): Promise<AdpickProduct[]> {
  const key = adpickApiKey();
  if (!key || !query.trim()) return [];
  const url = new URL(`${ADPICK_BASE_URL}/${encodeURIComponent(key)}/search`);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "10");
  url.searchParams.set("p_data", pData.slice(0, 50));

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) return [];
    const parsed = adpickSearchSchema.safeParse(await response.json());
    if (!parsed.success) return [];
    return (parsed.data.data ?? [])
      .filter((item) => item.title?.trim())
      .map((item) => ({
        title: item.title?.trim() ?? "",
        price: parseWon(item.price),
        imageUrl: validUrl(item.photo),
        retailer: item.cp_name?.trim() || "ADPICK 제휴몰",
        commissionUrl: validUrl(item.commissionlink),
        commissionRate: null,
        source: "adpick" as const,
      }));
  } catch (error) {
    if (error instanceof Error) console.warn(`[affiliate] ADPICK search failed: ${error.message}`);
    return [];
  }
}

export async function fetchAdpickConversions(params: {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly pData?: string;
  readonly page?: number;
  readonly limit?: number;
}): Promise<{ readonly ok: boolean; readonly status: number; readonly payload: unknown }> {
  const key = adpickApiKey();
  if (!key) return { ok: false, status: 503, payload: { error: "ADPICK_API_KEY is not configured" } };
  const url = new URL(`${ADPICK_BASE_URL}/${encodeURIComponent(key)}/conversion`);
  const query = {
    sdate: params.startDate,
    edate: params.endDate,
    p_data: params.pData,
    page: params.page,
    limit: params.limit,
  };
  Object.entries(query).forEach(([name, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    const parsed = adpickConversionSchema.safeParse(await response.json());
    return { ok: response.ok && parsed.success, status: response.status, payload: parsed.success ? parsed.data : { error: "invalid ADPICK response" } };
  } catch (error) {
    if (error instanceof Error) return { ok: false, status: 502, payload: { error: error.message } };
    return { ok: false, status: 502, payload: { error: "ADPICK conversion request failed" } };
  }
}

function parseWon(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function readProductUrlOverrides(): Record<string, string> {
  const raw = clean(process.env.STS_PRODUCT_URL_OVERRIDES_JSON);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    const result: Record<string, string> = {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return result;
    Object.entries(parsed).forEach(([id, value]) => {
      if (typeof value === "string" && isAffiliateEligibleUrl(value)) result[id] = value;
    });
    return result;
  } catch {
    return {};
  }
}
