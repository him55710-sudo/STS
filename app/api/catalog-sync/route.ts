import { NextRequest, NextResponse } from "next/server";
import { createCatalogSourceAdapter } from "@/lib/catalog-ingest/provider-adapter";
import { createFixtureAdapter } from "@/lib/catalog-ingest/fixture-adapter";
import { runCatalogSync } from "@/lib/catalog-ingest/sync";
import type { CatalogCheckpoint } from "@/lib/catalog-ingest/types";

export const maxDuration = 30;

type SyncRequestBody = {
  readonly batchSize?: number;
  readonly maxAttempts?: number;
  readonly retryDelayMs?: number;
  readonly checkpoint?: CatalogCheckpoint;
};

const ALLOWED_PROVIDER_ENV = {
  fixture: "CATALOG_FEED_URL",
  catalog: "CATALOG_FEED_URL",
  feed: "CATALOG_FEED_URL",
  coupang: "COUPANG_CATALOG_FEED_URL",
  oliveyoung: "OLIVEYOUNG_CATALOG_FEED_URL",
} as const;

type AdapterBuildResult =
  | { readonly kind: "ok"; readonly adapter: ReturnType<typeof createFixtureAdapter> | ReturnType<typeof createCatalogSourceAdapter> }
  | { readonly kind: "error"; readonly status: number; readonly error: string };

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;

export async function POST(req: NextRequest) {
  const secret = process.env.STS_CATALOG_SYNC_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STS_CATALOG_SYNC_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("x-sts-sync-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adapterResult = createCatalogAdapter();
  if (adapterResult.kind === "error") {
    return NextResponse.json({ error: adapterResult.error }, { status: adapterResult.status });
  }

  const body = await readBody(req);
  const result = await runCatalogSync(adapterResult.adapter, {
    checkpoint: body.checkpoint ?? { current: null, next: null },
    batchSize: clampInteger(body.batchSize, DEFAULT_BATCH_SIZE, 1, 50),
    maxAttempts: clampInteger(body.maxAttempts, DEFAULT_MAX_ATTEMPTS, 1, 5),
    retryDelayMs: clampInteger(body.retryDelayMs, DEFAULT_RETRY_DELAY_MS, 100, 30_000),
    now: new Date(),
  });

  return NextResponse.json(
    {
      source: result.source,
      checkpoint: result.checkpoint,
      appliedRows: result.appliedRows,
      quarantinedRows: result.quarantinedRows,
      skippedRows: result.skippedRows,
      retries: result.retries,
      retryDelayMs: result.retryDelayMs,
      offers: result.offers,
      errors: result.errors,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

function createCatalogAdapter(): AdapterBuildResult {
  const provider = process.env.CATALOG_PROVIDER?.trim();
  if (!provider || provider === "fixture") {
    return {
      kind: "ok",
      adapter: createFixtureAdapter({
        source: "fixture",
        input: {
          rows: [],
        },
      }),
    };
  }

  const feedEnv = ALLOWED_PROVIDER_ENV[provider as keyof typeof ALLOWED_PROVIDER_ENV];
  if (!feedEnv) {
    return { kind: "error", status: 503, error: `CATALOG_PROVIDER ${provider} is not supported` };
  }
  const feedUrl = process.env[feedEnv]?.trim();
  if (!feedUrl) {
    return { kind: "error", status: 503, error: `${feedEnv} is not configured` };
  }

  try {
    return {
      kind: "ok",
      adapter: createCatalogSourceAdapter({
        provider,
        feedUrl,
      }),
    };
  } catch (error) {
    return {
      kind: "error",
      status: 503,
      error: error instanceof Error ? error.message : "catalog adapter configuration failed",
    };
  }
}

async function readBody(req: NextRequest): Promise<SyncRequestBody> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object") return {};
    const bodyRecord = parsed;
    const checkpointRecord = getCheckpointRecord(bodyRecord);
    return {
      batchSize: getNumberField(bodyRecord, "batchSize"),
      maxAttempts: getNumberField(bodyRecord, "maxAttempts"),
      retryDelayMs: getNumberField(bodyRecord, "retryDelayMs"),
      checkpoint: checkpointRecord
          ? {
              current: getNullableStringField(checkpointRecord, "current"),
              next: getNullableStringField(checkpointRecord, "next"),
            }
          : undefined,
    };
  } catch {
    return {};
  }
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isInteger(value) || value < min) return fallback;
  return Math.min(value, max);
}

function getNumberField(input: object, key: string): number | undefined {
  const value = Reflect.get(input, key);
  return typeof value === "number" ? value : undefined;
}

function getCheckpointRecord(input: object): object | null {
  const checkpoint = Reflect.get(input, "checkpoint");
  return checkpoint && typeof checkpoint === "object" ? checkpoint : null;
}

function getNullableStringField(input: object, key: string): string | null {
  const value = Reflect.get(input, key);
  if (typeof value === "string") return value;
  return value === null ? null : null;
}
