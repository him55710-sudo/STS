import { z } from "zod";
import { classifyCommerceUrl } from "../commerce/url-policy";
import { normalizeFixtureRow } from "./fixture-row";
import type {
  CatalogPage,
  CatalogSource,
  CatalogSourceAdapter,
} from "./types";

const catalogProviderSchema = z.enum(["fixture", "catalog", "feed", "coupang", "oliveyoung"]);

const feedResponseSchema = z.object({
  rows: z.array(z.unknown()).optional(),
  items: z.array(z.unknown()).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  hasNextPage: z.boolean().optional(),
  nextPage: z.number().int().positive().nullable().optional(),
  checkpoint: z.string().trim().min(1).nullable().optional(),
  currentCheckpoint: z.string().trim().min(1).nullable().optional(),
}).passthrough();

export type CatalogFeedAdapterOptions = {
  readonly source: CatalogSource;
  readonly feedUrl: string;
  readonly request?: typeof fetch;
};

export type CatalogSourceAdapterOptions = {
  readonly provider: string;
  readonly feedUrl: string;
  readonly request?: typeof fetch;
};

export class CatalogCapabilityError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CatalogCapabilityError";
  }
}

export function createCatalogFeedAdapter(options: CatalogFeedAdapterOptions): CatalogSourceAdapter {
  const source = cleanText(options.source);
  if (!source) throw new CatalogCapabilityError("catalog feed adapter source must not be empty");
  const feedUrl = normalizeHttpsUrl(options.feedUrl);
  if (!feedUrl) throw new CatalogCapabilityError("catalog feed adapter requires a valid HTTPS feed URL");
  const request = options.request ?? fetch;
  return {
    source,
    fetchPage: async () => {
      const response = await request(feedUrl);
      if (!response.ok) {
        throw new CatalogCapabilityError(`catalog feed request failed with status ${response.status}`);
      }
      const parsed = feedResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new CatalogCapabilityError("catalog feed response is malformed");
      }
      const payload = parsed.data;
      const rows = payload.rows ?? payload.items ?? [];
      return buildPage(source, {
        rows,
        page: payload.page,
        pageSize: payload.pageSize,
        hasNextPage: payload.hasNextPage,
        nextPage: payload.nextPage ?? undefined,
        checkpoint: payload.checkpoint ?? undefined,
        currentCheckpoint: payload.currentCheckpoint ?? undefined,
      });
    },
  };
}

export function createCatalogSourceAdapter(options: CatalogSourceAdapterOptions): CatalogSourceAdapter {
  const provider = cleanText(options.provider);
  if (!provider) throw new CatalogCapabilityError("catalog source provider must not be empty");
  if (provider === "linkprice" || provider === "sovrn") {
    throw new CatalogCapabilityError(`provider ${provider} does not support catalog ingestion`);
  }
  if (!catalogProviderSchema.safeParse(provider).success) {
    throw new CatalogCapabilityError(`provider ${provider} does not support catalog ingestion`);
  }
  if (provider === "coupang" || provider === "oliveyoung") {
    // 공식 API/피드 계약이 있는 소스만 허용한다. 크롤링 URL은 여기서 받지 않는다.
    return createCatalogFeedAdapter({
      source: provider,
      feedUrl: options.feedUrl,
      request: options.request,
    });
  }
  return createCatalogFeedAdapter({
    source: provider,
    feedUrl: options.feedUrl,
    request: options.request,
  });
}

function buildPage(source: CatalogSource, input: {
  readonly rows: readonly unknown[];
  readonly page?: number;
  readonly pageSize?: number;
  readonly hasNextPage?: boolean;
  readonly nextPage?: number;
  readonly checkpoint?: string;
  readonly currentCheckpoint?: string;
}): CatalogPage {
  const rows: CatalogPage["rows"][number][] = [];
  const rowResults: CatalogPage["rowResults"][number][] = [];
  const errors: CatalogPage["errors"][number][] = [];
  input.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const normalized = normalizeFixtureRow(source, row, rowNumber);
    if (normalized.kind === "accepted") {
      rows.push(normalized.row);
      rowResults.push({ kind: "accepted", rowNumber, row: normalized.row });
    } else {
      errors.push(normalized.error);
      rowResults.push({ kind: "quarantine", rowNumber, error: normalized.error });
    }
  });
  return {
    rows,
    rowResults,
    errors,
    pagination: {
      page: input.page ?? 1,
      pageSize: input.pageSize ?? rows.length,
      hasNextPage: input.hasNextPage ?? false,
      nextPage: input.hasNextPage ? (input.nextPage ?? input.page ?? 2) : null,
    },
    checkpoint: {
      current: cleanText(input.currentCheckpoint ?? "") ?? null,
      next: cleanText(input.checkpoint ?? "") ?? null,
    },
  };
}

export type { CatalogSourceAdapter } from "./types";

function cleanText(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

function normalizeHttpsUrl(value: string): string | null {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "https:" ? url.toString() : null;
}

export function isCatalogDetailUrl(value: string): boolean {
  return classifyCommerceUrl(value).kind === "detail";
}
