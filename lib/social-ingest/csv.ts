import { socialSourceError } from "./errors";
import type { SocialSourceError } from "./types";

type CsvRecordsResult =
  | { readonly kind: "records"; readonly records: readonly (readonly string[])[] }
  | { readonly kind: "error"; readonly error: SocialSourceError };

type CsvRowsResult =
  | { readonly kind: "records"; readonly records: readonly Readonly<Record<string, string>>[] }
  | { readonly kind: "error"; readonly error: SocialSourceError };

export function parseCsvRows(value: string): CsvRecordsResult {
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
    } else if (character !== undefined) {
      cell += character;
    }
  }
  if (quoted) {
    return {
      kind: "error",
      error: socialSourceError({
        rowNumber: 1,
        code: "malformed_csv",
        field: null,
        message: "social source CSV has an unterminated quoted field",
      }),
    };
  }
  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((item) => item.trim())) records.push(row);
  }
  return { kind: "records", records };
}

export function rowsFromCsv(value: string): CsvRowsResult {
  const parsed = parseCsvRows(value);
  if (parsed.kind === "error") return parsed;
  const [header, ...data] = parsed.records;
  if (!header || header.length === 0) return { kind: "records", records: [] };
  const headers = header.map((cell, index) => cleanHeader(cell, index));
  return {
    kind: "records",
    records: data.map((cells) => recordFromCells(headers, cells)),
  };
}

function recordFromCells(headers: readonly string[], cells: readonly string[]): Readonly<Record<string, string>> {
  const row: Record<string, string> = {};
  headers.forEach((name, index) => {
    row[name] = cells[index] ?? "";
  });
  return row;
}

function cleanHeader(value: string, index: number): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || `column_${index + 1}`;
}
