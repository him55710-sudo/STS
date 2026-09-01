import { z } from "zod";
import type { CatalogRow, CatalogRowError } from "./types";

export const catalogExactnessSchema = z.enum(["exact", "likely", "similar", "review", "unverified"]);

export type CatalogSourceIdentity = {
  readonly source: string;
  readonly sourceProductId: string;
  readonly fallbackSourceProductId: string | null;
};

export type CatalogProductRecord = {
  readonly canonicalSku: string;
  readonly brand: string | null;
  readonly name: string;
  readonly merchant: string;
  readonly category: string;
  readonly currency: string;
  readonly price: number | null;
  readonly detailUrl: string;
  readonly affiliateUrl: string | null;
  readonly exactness: z.infer<typeof catalogExactnessSchema>;
  readonly verifiedDetailUrl: boolean;
  readonly sourceIdentity: CatalogSourceIdentity;
  readonly sourceIdentityVerified: boolean;
  readonly images: readonly string[];
  readonly vectorMetadata: Readonly<Record<string, unknown>>;
};

export type CatalogImportBatchRecord = {
  readonly source: string;
  readonly checkpointCurrent: string | null;
  readonly checkpointNext: string | null;
  readonly preview: boolean;
  readonly rowCount: number;
  readonly acceptedCount: number;
  readonly quarantinedCount: number;
};

export type CatalogQuarantineRecord = {
  readonly rowNumber: number;
  readonly code: CatalogRowError["code"];
  readonly field: string | null;
  readonly message: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

const safeText = z.string().trim().min(1);

export function buildCatalogProductRecord(row: CatalogRow, exactness: CatalogProductRecord["exactness"]): CatalogProductRecord {
  const primaryImage = row.images[0] ?? null;
  return {
    canonicalSku: `${row.source}:${row.sourceProductId}`,
    brand: row.brand,
    name: row.title,
    merchant: row.merchant,
    category: row.category,
    currency: row.currency ?? "KRW",
    price: row.price,
    detailUrl: row.detailUrl,
    affiliateUrl: row.affiliateUrl,
    exactness,
    verifiedDetailUrl: exactness === "exact" || exactness === "likely",
    sourceIdentity: {
      source: row.sourceIdentity.source,
      sourceProductId: row.sourceIdentity.sourceProductId,
      fallbackSourceProductId: row.sourceIdentity.sourceProductId,
    },
    sourceIdentityVerified: exactness === "exact" || exactness === "likely",
    images: row.images,
    vectorMetadata: {
      source: row.source,
      sourceProductId: row.sourceProductId,
      title: row.title,
      merchant: row.merchant,
      category: row.category,
      exactness,
      imageCount: row.images.length,
      primaryImage,
      imageVariants: row.imageVariants,
    },
  };
}

export function buildCatalogImportBatchRecord(input: CatalogImportBatchRecord): CatalogImportBatchRecord {
  return input;
}

export function buildCatalogQuarantineRecord(
  rowNumber: number,
  error: CatalogRowError,
  payload: Readonly<Record<string, unknown>> = {}
): CatalogQuarantineRecord {
  return {
    rowNumber,
    code: error.code,
    field: error.field,
    message: error.message,
    payload,
  };
}

export function isVerifiedCatalogExactness(value: string): value is "exact" | "likely" {
  return value === "exact" || value === "likely";
}

export function validateCanonicalSku(value: string): string {
  return safeText.parse(value);
}
