import type { CatalogImportPreview } from "../catalog-ingest/import-preview";
import type { CatalogQuarantineRecord } from "../catalog-ingest/catalog-repository";

export type CatalogAdminMetrics = {
  readonly directDetailCoverage: number;
  readonly affiliateCoverage: number;
  readonly quarantineRate: number;
  readonly exactAcceptanceRate: number;
  readonly falseExactCases: number;
  readonly providerLatencyMs: number;
  readonly providerErrors: number;
  readonly outboundClicks: number;
};

export type RedactedCatalogPreviewProduct = {
  readonly canonicalSku: string;
  readonly brand: string | null;
  readonly name: string;
  readonly merchant: string;
  readonly category: string;
  readonly exactness: string;
  readonly verifiedDetailUrl: boolean;
  readonly sourceProductId: string;
  readonly imageCount: number;
};

export type CatalogAdminPreviewPayload = {
  readonly preview: {
    readonly batch: CatalogImportPreview["batch"];
    readonly products: readonly RedactedCatalogPreviewProduct[];
    readonly quarantined: readonly RedactedCatalogQuarantine[];
  };
  readonly metrics: CatalogAdminMetrics;
};

type RedactedCatalogQuarantine = Pick<CatalogQuarantineRecord, "rowNumber" | "code" | "field" | "message">;

export function buildCatalogAdminPreviewResponse(input: {
  readonly preview: CatalogImportPreview;
  readonly metrics: CatalogAdminMetrics;
}): CatalogAdminPreviewPayload {
  return {
    preview: {
      batch: input.preview.batch,
      products: input.preview.products.map((product) => ({
        canonicalSku: product.canonicalSku,
        brand: product.brand,
        name: product.name,
        merchant: product.merchant,
        category: product.category,
        exactness: product.exactness,
        verifiedDetailUrl: product.verifiedDetailUrl,
        sourceProductId: product.sourceIdentity.sourceProductId,
        imageCount: product.images.length,
      })),
      quarantined: input.preview.quarantined.map((item) => ({
        rowNumber: item.rowNumber,
        code: item.code,
        field: item.field,
        message: item.message,
      })),
    },
    metrics: input.metrics,
  };
}
