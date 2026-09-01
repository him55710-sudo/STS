import { z } from "zod";
import { rowsFromCsv } from "./csv";
import { socialSourceError } from "./errors";
import type { SocialSourceError, SocialSourceInput } from "./types";

const rowsSchema = z.array(z.record(z.string(), z.unknown()));
const envelopeSchema = z.object({ rows: rowsSchema }).passthrough();

type ReadRowsResult =
  | { readonly kind: "rows"; readonly rows: readonly Readonly<Record<string, unknown>>[] }
  | { readonly kind: "error"; readonly error: SocialSourceError };

export function readSocialSourceRows(input: SocialSourceInput): ReadRowsResult {
  if (input.rows !== undefined) {
    const parsed = rowsSchema.safeParse(input.rows);
    return parsed.success
      ? { kind: "rows", rows: parsed.data }
      : {
        kind: "error",
        error: socialSourceError({
          rowNumber: 1,
          code: "malformed_row",
          field: null,
          message: "social source rows must contain objects",
        }),
      };
  }
  if (input.json !== undefined) return parseJson(input.json);
  if (input.csv !== undefined) return parseCsv(input.csv);
  return { kind: "rows", rows: [] };
}

function parseJson(value: string): ReadRowsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        kind: "error",
        error: socialSourceError({
          rowNumber: 1,
          code: "malformed_json",
          field: null,
          message: "social source JSON is malformed",
        }),
      };
    }
    throw error;
  }
  const envelope = envelopeSchema.safeParse(parsed);
  if (envelope.success) return { kind: "rows", rows: envelope.data.rows };
  const rows = rowsSchema.safeParse(parsed);
  return rows.success
    ? { kind: "rows", rows: rows.data }
    : {
      kind: "error",
      error: socialSourceError({
        rowNumber: 1,
        code: "malformed_json",
        field: null,
        message: "social source JSON must contain a rows array",
      }),
    };
}

function parseCsv(value: string): ReadRowsResult {
  const parsed = rowsFromCsv(value);
  if (parsed.kind === "error") return parsed;
  const rows = rowsSchema.safeParse(parsed.records);
  return rows.success
    ? { kind: "rows", rows: rows.data }
    : {
      kind: "error",
      error: socialSourceError({
        rowNumber: 1,
        code: "malformed_csv",
        field: null,
        message: "social source CSV could not be converted into row objects",
      }),
    };
}
