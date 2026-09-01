import type { CatalogImportResult } from "./import-service";
import { buildCatalogImportBatchRecord, buildCatalogProductRecord, buildCatalogQuarantineRecord } from "./catalog-repository";

export type CatalogImportPreview = {
  readonly batch: ReturnType<typeof buildCatalogImportBatchRecord>;
  readonly products: ReturnType<typeof buildCatalogProductRecord>[];
  readonly quarantined: ReturnType<typeof buildCatalogQuarantineRecord>[];
};

export function previewCatalogImport(result: CatalogImportResult, source: string): CatalogImportPreview {
  return {
    batch: buildCatalogImportBatchRecord({
      source,
      checkpointCurrent: result.checkpoint.current,
      checkpointNext: result.checkpoint.next,
      preview: true,
      rowCount: result.rows.length + result.errors.length,
      acceptedCount: result.rows.length,
      quarantinedCount: result.errors.length,
    }),
    products: result.rows.map((row) => buildCatalogProductRecord(row, "similar")),
    quarantined: result.errors.map((error) =>
      buildCatalogQuarantineRecord(error.rowNumber, error, {
        kind: error.kind,
        source: source,
      })
    ),
  };
}
