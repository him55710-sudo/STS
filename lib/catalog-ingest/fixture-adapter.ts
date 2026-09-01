import type {
  CatalogPage,
  CatalogRowError,
  CatalogRowResult,
  CatalogSourceAdapter,
  FixtureAdapterOptions,
  FixtureInput,
} from "./types";
import { normalizeFixtureRow } from "./fixture-row";
import { readFixtureRows } from "./fixture-input";

export function createFixtureAdapter(options: FixtureAdapterOptions): CatalogSourceAdapter {
  const source = cleanText(options.source);
  if (!source) throw new FixtureAdapterConfigurationError("fixture adapter source must not be empty");
  return { source, fetchPage: async () => buildPage(source, options.input) };
}

export class FixtureAdapterConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FixtureAdapterConfigurationError";
  }
}

function buildPage(source: string, input: FixtureInput): CatalogPage {
  const payload = readFixtureRows(input);
  if ("error" in payload) {
    return {
      rows: [],
      rowResults: [{ kind: "quarantine", rowNumber: payload.error.rowNumber, error: payload.error }],
      errors: [payload.error],
      pagination: pagination(input, 0),
      checkpoint: checkpoint(input),
    };
  }

  const rows: CatalogPage["rows"][number][] = [];
  const rowResults: CatalogRowResult[] = [];
  const errors: CatalogRowError[] = [];
  payload.rows.forEach((record, index) => {
    const rowNumber = index + 1;
    const normalized = normalizeFixtureRow(source, record, rowNumber);
    if (normalized.kind === "accepted") {
      rows.push(normalized.row);
      rowResults.push({ kind: "accepted", rowNumber, row: normalized.row });
    } else {
      errors.push(normalized.error);
      rowResults.push({ kind: "quarantine", rowNumber, error: normalized.error });
    }
  });

  return { rows, rowResults, errors, pagination: pagination(input, rows.length), checkpoint: checkpoint(input) };
}

function pagination(input: FixtureInput, rowCount: number): CatalogPage["pagination"] {
  const page = positiveInteger(input.page, 1);
  const hasNextPage = input.hasNextPage ?? false;
  return {
    page,
    pageSize: positiveInteger(input.pageSize, rowCount),
    hasNextPage,
    nextPage: hasNextPage ? positiveInteger(input.nextPage, page + 1) : null,
  };
}

function checkpoint(input: FixtureInput): CatalogPage["checkpoint"] {
  return { current: cleanText(input.currentCheckpoint ?? ""), next: cleanText(input.checkpoint ?? "") };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;
}

function cleanText(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || null;
}
