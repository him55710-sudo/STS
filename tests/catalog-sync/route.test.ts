import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const runCatalogSyncMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/catalog-ingest/sync", () => ({
  runCatalogSync: runCatalogSyncMock,
}));

import { POST } from "../../app/api/catalog-sync/route";

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.STS_CATALOG_SYNC_SECRET;
  delete process.env.CATALOG_PROVIDER;
  delete process.env.CATALOG_FEED_URL;
});

describe("catalog sync route", () => {
  it("rejects requests without the shared secret", async () => {
    process.env.STS_CATALOG_SYNC_SECRET = "test-secret";

    const response = await POST(
      new NextRequest("https://example.com/api/catalog-sync", {
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    expect(runCatalogSyncMock).not.toHaveBeenCalled();
  });

  it("returns a bounded sync response for the configured secret", async () => {
    process.env.STS_CATALOG_SYNC_SECRET = "test-secret";

    runCatalogSyncMock.mockResolvedValue({
      source: "fixture",
      checkpoint: { current: "seed:v2", next: null },
      appliedRows: 1,
      quarantinedRows: 0,
      skippedRows: 0,
      retries: 0,
      retryDelayMs: 1000,
      offers: [],
      errors: [],
    });

    const response = await POST(
      new NextRequest("https://example.com/api/catalog-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-sts-sync-secret": "test-secret",
        },
        body: JSON.stringify({ batchSize: 5 }),
      })
    );

    expect(response.status).toBe(200);
    expect(runCatalogSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "fixture" }),
      expect.objectContaining({ batchSize: 5, maxAttempts: 3, retryDelayMs: 1000 })
    );
  });
});
