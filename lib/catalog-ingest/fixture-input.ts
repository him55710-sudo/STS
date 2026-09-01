import { z } from "zod";
import type { CatalogRowError, CatalogRowErrorCode, FixtureInput, FixtureRecord } from "./types";

const recordSchema = z.record(z.string(), z.unknown());
const rowsSchema = z.array(recordSchema);
const envelopeSchema = z.object({ rows: rowsSchema }).passthrough();

export type FixtureRows = { readonly rows: readonly FixtureRecord[] };
export type FixtureRowsResult = FixtureRows | { readonly kind: "error"; readonly error: CatalogRowError };

export function readFixtureRows(input: FixtureInput): FixtureRowsResult {
  if (input.rows !== undefined) {
    const parsed = rowsSchema.safeParse(input.rows);
    return parsed.success
      ? { rows: parsed.data }
      : { kind: "error", error: errorAt(1, "malformed_row", null, "fixture rows must contain objects") };
  }
  if (input.json !== undefined) return parseJson(input.json);
  if (input.csv !== undefined) return parseCsv(input.csv);
  return { rows: [] };
}

function parseJson(value: string): FixtureRowsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "error", error: errorAt(1, "malformed_json", null, "fixture JSON is malformed") };
    }
    throw error;
  }

  const envelope = envelopeSchema.safeParse(parsed);
  if (envelope.success) return { rows: envelope.data.rows };
  const rows = rowsSchema.safeParse(parsed);
  return rows.success
    ? { rows: rows.data }
    : { kind: "error", error: errorAt(1, "malformed_json", null, "fixture JSON must contain a rows array") };
}

function parseCsv(value: string): FixtureRowsResult {
  const records = csvRecords(value);
  if (records.kind === "error") return records;
  const [header, ...data] = records.records;
  if (!header || header.length === 0) return { rows: [] };
  const headers = header.map((cell, index) => cleanText(cell) ?? `column_${index + 1}`);
  const rows = data.map((cells) => {
    const row: Record<string, unknown> = {};
    headers.forEach((name, index) => {
      row[name] = cells[index] ?? "";
    });
    return row;
  });
  return { rows };
}

function csvRecords(value: string):
  | { readonly kind: "records"; readonly records: readonly (readonly string[])[] }
  | { readonly kind: "error"; readonly error: CatalogRowError } {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && value[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) records.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) return { kind: "error", error: errorAt(1, "malformed_csv", null, "fixture CSV has an unterminated quoted field") };
  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((item) => item.trim())) records.push(row);
  }
  return { kind: "records", records };
}

function cleanText(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

function errorAt(rowNumber: number, code: CatalogRowErrorCode, field: string | null, message: string): CatalogRowError {
  return { kind: "quarantine", rowNumber, code, field, message };
}
