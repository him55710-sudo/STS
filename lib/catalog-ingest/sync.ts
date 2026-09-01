import { classifyCommerceUrl } from "../commerce/url-policy";
import type { CommerceOffer } from "../commerce/types";
import type { CatalogCheckpoint, CatalogPage, CatalogRow, CatalogSourceAdapter } from "./types";

export type CatalogSyncErrorKind = "retryable" | "rate_limited" | "fatal";

export type CatalogSyncError = {
  readonly kind: CatalogSyncErrorKind;
  readonly message: string;
  readonly status?: number;
  readonly retryAfterMs?: number;
};

export type CatalogSyncPlan = {
  readonly source: string;
  readonly batchSize: number;
  readonly maxAttempts: number;
  readonly checkpoint: CatalogCheckpoint;
  readonly retryDelayMs: number;
};

export type CatalogSyncOfferUpdate = {
  readonly sourceIdentity: CatalogRow["sourceIdentity"];
  readonly price: number | null;
  readonly stock: CatalogRow["stock"];
  readonly availability: CatalogRow["availability"];
  readonly detailUrl: string;
  readonly affiliateUrl: string | null;
  readonly verifiedDetailUrl: boolean;
  readonly offerLifecycle: CommerceOffer["offerLifecycle"];
  readonly freshness: CommerceOffer["freshness"];
};

export type CatalogSyncResult = {
  readonly source: string;
  readonly checkpoint: CatalogCheckpoint;
  readonly appliedRows: number;
  readonly quarantinedRows: number;
  readonly skippedRows: number;
  readonly retries: number;
  readonly retryDelayMs: number;
  readonly offers: readonly CatalogSyncOfferUpdate[];
  readonly errors: readonly CatalogSyncError[];
};

export async function runCatalogSync(
  adapter: CatalogSourceAdapter,
  options: {
    readonly checkpoint?: CatalogCheckpoint;
    readonly batchSize: number;
    readonly maxAttempts: number;
    readonly retryDelayMs: number;
    readonly now?: Date;
  }
): Promise<CatalogSyncResult> {
  const checkpoint = options.checkpoint ?? { current: null, next: null };
  const errors: CatalogSyncError[] = [];
  let retries = 0;
  let page: CatalogPage | null = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      page = await adapter.fetchPage();
      break;
    } catch (error) {
      const syncError = classifySyncError(error);
      errors.push(syncError);
      if (syncError.kind === "fatal" || attempt === options.maxAttempts) {
        return {
          source: adapter.source,
          checkpoint,
          appliedRows: 0,
          quarantinedRows: 0,
          skippedRows: 0,
          retries,
          retryDelayMs: syncError.retryAfterMs ?? options.retryDelayMs,
          offers: [],
          errors,
        };
      }
      retries += 1;
      await waitMs(syncError.retryAfterMs ?? backoffMs(options.retryDelayMs, attempt));
    }
  }

  if (!page) {
    return {
      source: adapter.source,
      checkpoint,
      appliedRows: 0,
      quarantinedRows: 0,
      skippedRows: 0,
      retries,
      retryDelayMs: options.retryDelayMs,
      offers: [],
      errors,
    };
  }

  const acceptedRows = page.rowResults.filter((result): result is { readonly kind: "accepted"; readonly rowNumber: number; readonly row: CatalogRow } => result.kind === "accepted");
  const quarantinedRows = page.rowResults.filter((result) => result.kind === "quarantine").length;
  const limitedRows = acceptedRows.slice(0, options.batchSize);
  const offers = limitedRows.map((result) => refreshCatalogOffer(result.row, options.now ?? new Date()));

  return {
    source: adapter.source,
    checkpoint: {
      current: page.checkpoint.current ?? checkpoint.next ?? checkpoint.current,
      next: page.checkpoint.next ?? null,
    },
    appliedRows: offers.length,
    quarantinedRows,
    skippedRows: acceptedRows.length - offers.length,
    retries,
    retryDelayMs: options.retryDelayMs,
    offers,
    errors,
  };
}

export function refreshCatalogOffer(row: CatalogRow, now: Date): CatalogSyncOfferUpdate {
  const detailClassification = classifyCommerceUrl(row.detailUrl);
  const verifiedDetailUrl = detailClassification.kind === "detail";
  const affiliateUrl = normalizeAffiliateUrl(row.affiliateUrl);
  const offerLifecycle: CommerceOffer["offerLifecycle"] =
    row.stock === "out_of_stock" || !verifiedDetailUrl
      ? "stale"
      : "active";
  return {
    sourceIdentity: row.sourceIdentity,
    price: row.price,
    stock: row.stock,
    availability: row.availability,
    detailUrl: row.detailUrl,
    affiliateUrl,
    verifiedDetailUrl,
    offerLifecycle,
    freshness: {
      observedAt: now.toISOString(),
      staleAfter: row.stock === "in_stock" && verifiedDetailUrl ? null : now.toISOString(),
    },
  };
}

export function advanceCatalogCheckpoint(current: CatalogCheckpoint, page: CatalogPage): CatalogCheckpoint {
  return {
    current: page.checkpoint.current ?? current.next ?? current.current,
    next: page.checkpoint.next ?? null,
  };
}

export function computeCatalogBackoff(baseDelayMs: number, attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return retryAfterMs;
  return Math.min(baseDelayMs * 2 ** Math.max(0, attempt - 1), 30_000);
}

function classifySyncError(error: unknown): CatalogSyncError {
  if (error instanceof Error && "status" in error) {
    const statusValue = Reflect.get(error, "status");
    const retryAfterValue = Reflect.get(error, "retryAfterMs");
    const status = readNumber(statusValue);
    const retryAfterMs = readNumber(retryAfterValue);
    if (status === 429) {
      return { kind: "rate_limited", message: error.message, status, retryAfterMs };
    }
    if (status !== undefined && status >= 500) {
      return { kind: "retryable", message: error.message, status, retryAfterMs };
    }
  }
  if (error instanceof Error) {
    return { kind: "fatal", message: error.message };
  }
  return { kind: "fatal", message: "unknown catalog sync error" };
}

function normalizeAffiliateUrl(value: string | null): string | null {
  if (!value) return null;
  const classification = classifyCommerceUrl(value);
  return classification.kind === "detail" ? classification.url : null;
}

function backoffMs(baseDelayMs: number, attempt: number): number {
  return Math.min(baseDelayMs * 2 ** Math.max(0, attempt - 1), 30_000);
}

async function waitMs(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;
  await new Promise((resolve) => {
    setTimeout(resolve, Math.min(delayMs, 25));
  });
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
