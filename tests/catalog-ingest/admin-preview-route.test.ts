import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  authorizeAdminRequestMock,
  importCatalogMock,
  previewCatalogImportMock,
  buildCatalogAdminPreviewResponseMock,
} = vi.hoisted(() => ({
  authorizeAdminRequestMock: vi.fn(),
  importCatalogMock: vi.fn(),
  previewCatalogImportMock: vi.fn(),
  buildCatalogAdminPreviewResponseMock: vi.fn(),
}));

vi.mock("../../lib/admin/authorize", () => ({
  authorizeAdminRequest: authorizeAdminRequestMock,
}));

vi.mock("../../lib/catalog-ingest/import-service", () => ({
  importCatalog: importCatalogMock,
}));

vi.mock("../../lib/catalog-ingest/import-preview", () => ({
  previewCatalogImport: previewCatalogImportMock,
}));

vi.mock("../../lib/admin/observability", () => ({
  buildCatalogAdminPreviewResponse: buildCatalogAdminPreviewResponseMock,
}));

import { GET } from "../../app/api/admin/catalog/preview/route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin catalog preview route", () => {
  it("rejects unauthenticated requests", async () => {
    authorizeAdminRequestMock.mockResolvedValue({ ok: false, mode: "local", status: 401, reason: "missing-local-token" });

    const response = await GET(new NextRequest("https://example.com/api/admin/catalog/preview"));

    expect(response.status).toBe(401);
    expect(authorizeAdminRequestMock).toHaveBeenCalledTimes(1);
    expect(importCatalogMock).not.toHaveBeenCalled();
  });

  it("returns a redacted preview payload after authorization", async () => {
    authorizeAdminRequestMock.mockResolvedValue({ ok: true, mode: "local", userId: null });
    importCatalogMock.mockResolvedValue({
      rows: [],
      errors: [],
      pagination: { page: 1, pageSize: 0, hasNextPage: false, nextPage: null },
      checkpoint: { current: "fixture:current", next: "fixture:next" },
    });
    previewCatalogImportMock.mockReturnValue({
      batch: {
        source: "fixture",
        checkpointCurrent: "fixture:current",
        checkpointNext: "fixture:next",
        preview: true,
        rowCount: 0,
        acceptedCount: 0,
        quarantinedCount: 0,
      },
      products: [],
      quarantined: [],
    });
    buildCatalogAdminPreviewResponseMock.mockReturnValue({
      preview: { batch: { source: "fixture" }, products: [], quarantined: [] },
      metrics: { directDetailCoverage: 0, affiliateCoverage: 0, quarantineRate: 0, exactAcceptanceRate: 0, falseExactCases: 0, providerLatencyMs: 0, providerErrors: 0, outboundClicks: 0 },
    });

    const response = await GET(new NextRequest("https://example.com/api/admin/catalog/preview", {
      headers: { "x-sts-admin-token": "fixture-token" },
    }));

    expect(response.status).toBe(200);
    expect(buildCatalogAdminPreviewResponseMock).toHaveBeenCalledTimes(1);
  });
});
