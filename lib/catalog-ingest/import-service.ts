import type { CatalogPage, CatalogSourceAdapter } from "./types";

export type CatalogImportResult = Pick<CatalogPage, "rows" | "errors" | "pagination" | "checkpoint">;

export async function importCatalog(adapter: CatalogSourceAdapter): Promise<CatalogImportResult> {
  const page = await adapter.fetchPage();
  return {
    rows: page.rows,
    errors: page.errors,
    pagination: page.pagination,
    checkpoint: page.checkpoint,
  };
}
