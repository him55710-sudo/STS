import type { CatalogRowError } from "./types";

export type QuarantinedCatalogRow = {
  readonly rowNumber: number;
  readonly error: CatalogRowError;
  readonly payload: Readonly<Record<string, unknown>>;
};

export function quarantineCatalogRow(
  rowNumber: number,
  error: CatalogRowError,
  payload: Readonly<Record<string, unknown>> = {}
): QuarantinedCatalogRow {
  return { rowNumber, error, payload };
}
