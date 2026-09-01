import { z } from "zod";
import { socialSourceError } from "./errors";
import type {
  SocialOEmbedRequest,
  SocialOEmbedResponse,
  SocialSourceAdapter,
  SocialSourceError,
  SocialSourcePage,
  SocialSourceRecordItem,
  SocialSourceRowResult,
} from "./types";

type OfficialEmbedUrlInput = {
  readonly url: string;
  readonly canRedistribute?: boolean;
  readonly visibility?: "public" | "private";
};

type OfficialEmbedAdapterOptions = {
  readonly provider: "instagram";
  readonly urls: readonly OfficialEmbedUrlInput[];
  readonly request?: SocialOEmbedRequest;
  readonly timeoutMs?: number;
};

type InstagramPublicUrl = {
  readonly canonicalUrl: string;
  readonly providerId: string;
  readonly shortcode: string;
};

type EmbedResult =
  | { readonly kind: "accepted"; readonly record: SocialSourceRecordItem }
  | { readonly kind: "quarantine"; readonly error: SocialSourceError };

type OEmbedRequestOptions = {
  readonly timeoutMs: number;
  readonly maxAttempts: number;
};

const INSTAGRAM_OEMBED_ENDPOINT = "https://graph.facebook.com/v26.0/instagram_oembed";
const DEFAULT_OEMBED_TIMEOUT_MS = 5_000;
const INSTAGRAM_PROVIDER_NAME = "Instagram";
const oembedResponseSchema = z.object({
  html: z.string(),
  provider_name: z.literal(INSTAGRAM_PROVIDER_NAME),
  provider_url: z.string(),
  type: z.string(),
  version: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  author_name: z.string().optional(),
  author_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
});

export function createOfficialEmbedAdapter(options: OfficialEmbedAdapterOptions): SocialSourceAdapter {
  return {
    source: "official_embed",
    provider: options.provider,
    fetchPage: async () => buildEmbedPage(options),
  };
}

async function buildEmbedPage(options: OfficialEmbedAdapterOptions): Promise<SocialSourcePage> {
  const records: SocialSourceRecordItem[] = [];
  const rowResults: SocialSourceRowResult[] = [];
  const errors: SocialSourceError[] = [];
  const request =
    options.request ??
    ((url: URL) =>
      requestOEmbed(url, {
        timeoutMs: options.timeoutMs ?? DEFAULT_OEMBED_TIMEOUT_MS,
        maxAttempts: 2,
      }));
  for (const [index, input] of options.urls.entries()) {
    const rowNumber = index + 1;
    const result = await normalizeOfficialEmbed(input, rowNumber, request);
    if (result.kind === "accepted") {
      records.push(result.record);
      rowResults.push({ kind: "accepted", rowNumber, record: result.record });
    } else {
      errors.push(result.error);
      rowResults.push({ kind: "quarantine", rowNumber, error: result.error });
    }
  }
  return { source: "official_embed", provider: options.provider, records, rowResults, errors };
}

async function normalizeOfficialEmbed(input: OfficialEmbedUrlInput, rowNumber: number, request: SocialOEmbedRequest): Promise<EmbedResult> {
  const parsed = parseInstagramPublicUrl(input);
  if (!parsed) {
    return {
      kind: "quarantine",
      error: socialSourceError({
        rowNumber,
        code: "private_or_unsupported_url",
        field: "url",
        message: "only public Instagram post, reel, tv, or guide URLs are supported for official embeds",
      }),
    };
  }
  let response: SocialOEmbedResponse;
  try {
    response = await request(oEmbedUrl(parsed.canonicalUrl));
  } catch (error) {
    if (error instanceof Error) {
      return {
        kind: "quarantine",
        error: socialSourceError({
          rowNumber,
          code: "oembed_failed",
          field: "url",
          message: `official oEmbed request failed: ${error.message}`,
        }),
      };
    }
    throw error;
  }
  const responseError = validateOfficialOEmbedResponse(response, parsed.canonicalUrl, rowNumber);
  if (responseError) return { kind: "quarantine", error: responseError };
  return {
    kind: "accepted",
    record: {
      providerId: parsed.providerId,
      title: response.title ?? response.author_name ?? null,
      contentKind: "lookbook",
      sourceRecord: {
        kind: "official_embed",
        provider: "instagram",
        identity: parsed.providerId,
        canonicalUrl: parsed.canonicalUrl,
        externalId: parsed.shortcode,
      },
      rights: {
        kind: "official_embed",
        status: "approved",
        canDisplay: true,
        canUseForCommerceMatching: false,
        canRedistribute: false,
        evidence: "instagram_oembed",
        expiresAt: null,
      },
      rightsTerritory: [],
      takedown: false,
      embed: {
        html: response.html,
        providerName: response.provider_name,
        providerUrl: response.provider_url,
        width: response.width ?? null,
        height: response.height ?? null,
      },
      localMediaAssets: [],
      commerceMatchJobs: [],
    },
  };
}

function validateOfficialOEmbedResponse(response: SocialOEmbedResponse, canonicalUrl: string, rowNumber: number): SocialSourceError | null {
  if (
    response.provider_name !== INSTAGRAM_PROVIDER_NAME ||
    !isInstagramProviderUrl(response.provider_url) ||
    !response.html.includes("instagram-media") ||
    !htmlReferencesCanonicalInstagramPost(response.html, canonicalUrl)
  ) {
    return socialSourceError({
      rowNumber,
      code: "oembed_failed",
      field: "url",
      message: "official Instagram oEmbed response did not match the requested public URL",
    });
  }
  return null;
}

function isInstagramProviderUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "www.instagram.com";
}

function htmlReferencesCanonicalInstagramPost(html: string, canonicalUrl: string): boolean {
  const unescapedHtml = html.replaceAll("\\/", "/");
  return [...unescapedHtml.matchAll(/\bdata-instgrm-permalink=(["'])(?<url>https:\/\/www\.instagram\.com\/(?:p|reel|tv|guide)\/[^"'<>\s?]+\/?[^"'<>\s]*)\1/g)].some(
    (match) => {
      const permalink = match.groups?.url;
      return permalink ? normalizeInstagramUrlFromHtml(permalink) === canonicalUrl : false;
    },
  );
}

function normalizeInstagramUrlFromHtml(value: string): string | null {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  const parts = url.pathname.split("/").filter((part) => part.length > 0);
  const [kind, shortcode] = parts;
  if (!isSupportedInstagramKind(kind) || !shortcode || parts.length !== 2) return null;
  return `https://www.instagram.com/${kind}/${shortcode}/`;
}

function parseInstagramPublicUrl(input: OfficialEmbedUrlInput): InstagramPublicUrl | null {
  if (input.visibility === "private" || !URL.canParse(input.url)) return null;
  const url = new URL(input.url);
  if (url.protocol !== "https:" || url.hostname !== "www.instagram.com") return null;
  const parts = url.pathname.split("/").filter((part) => part.length > 0);
  const [kind, shortcode] = parts;
  if (!isSupportedInstagramKind(kind) || !shortcode || parts.length !== 2) return null;
  return {
    canonicalUrl: `https://www.instagram.com/${kind}/${shortcode}/`,
    providerId: `instagram:${kind}:${shortcode}`,
    shortcode,
  };
}

function isSupportedInstagramKind(value: string | undefined): value is "p" | "reel" | "tv" | "guide" {
  return value === "p" || value === "reel" || value === "tv" || value === "guide";
}

function oEmbedUrl(canonicalUrl: string): URL {
  const url = new URL(INSTAGRAM_OEMBED_ENDPOINT);
  url.searchParams.set("url", canonicalUrl);
  url.searchParams.set("omitscript", "true");
  return url;
}

async function requestOEmbed(url: URL, options: OEmbedRequestOptions): Promise<SocialOEmbedResponse> {
  const response = await fetchOEmbedWithRetry(url, options);
  return oembedResponseSchema.parse(await response.json());
}

async function fetchOEmbedWithRetry(url: URL, options: OEmbedRequestOptions): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      const response = await fetchOEmbedOnce(url, options.timeoutMs);
      if (response.ok) return response;
      const requestError = new OfficialOEmbedRequestError(response.status);
      if (!requestError.retryable || attempt === options.maxAttempts) throw requestError;
      lastError = requestError;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (!isRetryableOEmbedError(error) || attempt === options.maxAttempts) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new OfficialOEmbedRequestError(0);
}

async function fetchOEmbedOnce(url: URL, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryableOEmbedError(error: Error): boolean {
  return error.name === "AbortError" || (error instanceof OfficialOEmbedRequestError && error.retryable);
}

class OfficialOEmbedRequestError extends Error {
  readonly name = "OfficialOEmbedRequestError";
  readonly retryable: boolean;

  constructor(readonly status: number) {
    super(`status ${status}`);
    this.retryable = status === 429 || status >= 500 || status === 0;
  }
}
