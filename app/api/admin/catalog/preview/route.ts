import { NextRequest, NextResponse } from "next/server";
import { createFixtureAdapter } from "@/lib/catalog-ingest/fixture-adapter";
import { importCatalog } from "@/lib/catalog-ingest/import-service";
import { previewCatalogImport } from "@/lib/catalog-ingest/import-preview";
import { authorizeAdminRequest } from "@/lib/admin/authorize";
import { buildCatalogAdminPreviewResponse } from "@/lib/admin/observability";
import { readFile } from "node:fs/promises";

export const maxDuration = 10;

const fixtureToken = process.env.STS_ADMIN_TOKEN?.trim();

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, {
    localAdminToken: fixtureToken,
    production: process.env.NODE_ENV === "production",
  });
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.reason }, { status: authorization.status, headers: { "Cache-Control": "no-store" } });
  }

  const fixture = await loadPreviewFixture();
  const source = createFixtureAdapter({
    source: "fixture",
    input: {
      rows: fixture.rows,
      checkpoint: fixture.checkpoint ?? undefined,
      currentCheckpoint: fixture.currentCheckpoint ?? undefined,
    },
  });
  const imported = await importCatalog(source);
  const preview = previewCatalogImport(imported, "fixture");
  const response = buildCatalogAdminPreviewResponse({
    preview,
    metrics: {
      directDetailCoverage: preview.batch.rowCount === 0 ? 0 : preview.batch.acceptedCount / preview.batch.rowCount,
      affiliateCoverage: 0,
      quarantineRate: preview.batch.rowCount === 0 ? 0 : preview.batch.quarantinedCount / preview.batch.rowCount,
      exactAcceptanceRate: 0,
      falseExactCases: 0,
      providerLatencyMs: 0,
      providerErrors: preview.quarantined.length,
      outboundClicks: 0,
    },
  });

  return NextResponse.json(response, { status: 200, headers: { "Cache-Control": "no-store" } });
}

async function loadPreviewFixture(): Promise<{
  readonly rows: readonly Record<string, unknown>[];
  readonly checkpoint: string | null;
  readonly currentCheckpoint: string | null;
}> {
  const raw = await readFile(new URL("../../../../../tests/fixtures/catalog/manifest.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw) as Record<string, string>;
  return {
    rows: [
      {
        sourceProductId: "shirt-1",
        brand: "Polo Ralph Lauren",
        title: "Classic Fit Oxford",
        merchant: "Polo",
        detailUrl: "https://merchant.example.test/products/shirt-1",
        images: ["https://cdn.example.test/shirt-1.jpg"],
        category: "fashion",
        price: 259000,
        stock: "in_stock",
      },
      {
        sourceProductId: "blazer-1",
        brand: "Grey Studio",
        title: "Tailored Blazer",
        merchant: "Grey Studio",
        detailUrl: "https://merchant.example.test/products/blazer-1",
        images: ["https://cdn.example.test/blazer-1.jpg"],
        category: "fashion",
        price: 189000,
        stock: "in_stock",
      },
      {
        sourceProductId: "bad-1",
        title: "Missing merchant",
        detailUrl: "https://merchant.example.test/products/bad-1",
        images: ["https://cdn.example.test/bad-1.jpg"],
        category: "fashion",
        price: 1000,
        stock: "in_stock",
      },
    ],
    checkpoint: parsed["blue-oxford-reference.jpg"] ?? null,
    currentCheckpoint: "fixture:current",
  };
}
