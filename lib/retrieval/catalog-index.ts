import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { identifierKindSchema } from "../commerce/types";
import type { OfferLifecycle, ProductIdentifier } from "../commerce/types";

export const CATALOG_EMBEDDING_DIMENSION = 1536;
const REPOSITORY_MODEL_VERSION_MISMATCH_REASON = "repository model version mismatch";

export type CatalogEmbeddingModelVersion = string;
export type CatalogEmbeddingVector = readonly number[];
export type CatalogImageStatus = "active" | "approved" | "stale" | "quarantined";

export type CatalogImageRecord = {
  readonly offerId: string;
  readonly imageHash: string;
  readonly modelVersion: CatalogEmbeddingModelVersion;
  readonly vector: CatalogEmbeddingVector | null;
  readonly status: CatalogImageStatus;
  readonly sourcePath: string;
  readonly mimeType: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly identifiers: readonly ProductIdentifier[];
  readonly offerLifecycle: OfferLifecycle;
  readonly approved: boolean;
  readonly stale: boolean;
  readonly quarantined: boolean;
};

export type CatalogIndexBatch = {
  readonly offerId: string;
  readonly imagePath: string;
  readonly imageHash: string;
  readonly modelVersion: CatalogEmbeddingModelVersion;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly identifiers: readonly ProductIdentifier[];
  readonly offerLifecycle: OfferLifecycle;
  readonly approved: boolean;
  readonly stale: boolean;
  readonly quarantined: boolean;
};

export type CatalogEmbeddingRequest = {
  readonly offerId: string;
  readonly imagePath: string;
  readonly imageHash: string;
  readonly modelVersion: CatalogEmbeddingModelVersion;
};

export type CatalogEmbeddingFailure = {
  readonly kind: "retryable" | "rejected";
  readonly offerId: string;
  readonly imageHash: string;
  readonly modelVersion: CatalogEmbeddingModelVersion;
  readonly reason: string;
};

export type CatalogEmbeddingOutcome =
  | { readonly kind: "ok"; readonly vector: CatalogEmbeddingVector }
  | { readonly kind: "retryable"; readonly failure: CatalogEmbeddingFailure };

export type CatalogIndexResult =
  | { readonly kind: "stored"; readonly record: CatalogImageRecord }
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "failed"; readonly failure: CatalogEmbeddingFailure };

export type CatalogIndexReport = {
  readonly stored: readonly CatalogImageRecord[];
  readonly skipped: readonly { readonly offerId: string; readonly imageHash: string; readonly reason: string }[];
  readonly failures: readonly CatalogEmbeddingFailure[];
};

export type CatalogImageEmbedding = {
  readonly offerId: string;
  readonly imageHash: string;
  readonly modelVersion: CatalogEmbeddingModelVersion;
  readonly vector: CatalogEmbeddingVector;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly identifiers: readonly ProductIdentifier[];
  readonly offerLifecycle: OfferLifecycle;
  readonly approved: boolean;
  readonly stale: boolean;
  readonly quarantined: boolean;
};

const imageRecordSchema = z.object({
  offerId: z.string().trim().min(1),
  imageHash: z.string().trim().min(1),
  modelVersion: z.string().trim().min(1),
  vector: z.array(z.number().finite()).nullable(),
  status: z.enum(["active", "approved", "stale", "quarantined"]),
  sourcePath: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  identifiers: z.array(z.object({ kind: identifierKindSchema, value: z.string().trim().min(1) })),
  offerLifecycle: z.enum(["active", "stale", "quarantined"]),
  approved: z.boolean(),
  stale: z.boolean(),
  quarantined: z.boolean(),
});

export interface CatalogIndexRepository {
  readonly modelVersion: CatalogEmbeddingModelVersion;
  listByOffer(offerId: string): Promise<readonly CatalogImageRecord[]>;
  upsert(record: CatalogImageEmbedding): Promise<CatalogIndexResult>;
}

export interface CatalogEmbeddingAdapter {
  readonly modelVersion: CatalogEmbeddingModelVersion;
  embed(input: CatalogEmbeddingRequest): Promise<CatalogEmbeddingVector>;
}

export function createCatalogIndexRepository(modelVersion: CatalogEmbeddingModelVersion): CatalogIndexRepository {
  const store = new Map<string, CatalogImageRecord>();
  return {
    modelVersion,
    async listByOffer(offerId: string): Promise<readonly CatalogImageRecord[]> {
      return [...store.values()].filter((record) => record.offerId === offerId);
    },
    async upsert(record: CatalogImageEmbedding): Promise<CatalogIndexResult> {
      if (record.modelVersion !== modelVersion) {
        return {
          kind: "failed",
          failure: { kind: "rejected", offerId: record.offerId, imageHash: record.imageHash, modelVersion: record.modelVersion, reason: REPOSITORY_MODEL_VERSION_MISMATCH_REASON },
        };
      }
      const key = `${record.offerId}:${record.imageHash}:${record.modelVersion}`;
      const next: CatalogImageRecord = {
        offerId: record.offerId,
        imageHash: record.imageHash,
        modelVersion: record.modelVersion,
        vector: record.vector,
        status: record.quarantined ? "quarantined" : record.stale ? "stale" : record.approved ? "approved" : "active",
        sourcePath: String(record.metadata.sourcePath ?? ""),
        mimeType: String(record.metadata.mimeType ?? "application/octet-stream"),
        width: typeof record.metadata.width === "number" ? record.metadata.width : null,
        height: typeof record.metadata.height === "number" ? record.metadata.height : null,
        metadata: record.metadata,
        identifiers: record.identifiers,
        offerLifecycle: record.offerLifecycle,
        approved: record.approved,
        stale: record.stale,
        quarantined: record.quarantined,
      };
      const current = store.get(key);
      if (current) return { kind: "stored", record: current };
      store.set(key, next);
      return { kind: "stored", record: next };
    },
  };
}

export async function hashFileSha256(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

export function isIndexableCatalogImage(image: CatalogImageEmbedding): boolean {
  return image.approved && !image.stale && !image.quarantined && image.offerLifecycle === "active";
}

export async function indexCatalogImages(
  repository: CatalogIndexRepository,
  adapter: CatalogEmbeddingAdapter,
  inputs: readonly CatalogIndexBatch[]
): Promise<CatalogIndexReport> {
  const stored: CatalogImageRecord[] = [];
  const skipped: Array<{ readonly offerId: string; readonly imageHash: string; readonly reason: string }> = [];
  const failures: CatalogEmbeddingFailure[] = [];

  for (const input of inputs) {
    if (repository.modelVersion !== input.modelVersion || adapter.modelVersion !== input.modelVersion) {
      failures.push({
        kind: "rejected",
        offerId: input.offerId,
        imageHash: input.imageHash,
        modelVersion: input.modelVersion,
        reason: REPOSITORY_MODEL_VERSION_MISMATCH_REASON,
      });
      continue;
    }

    const outcome = await embedCatalogImage(adapter, input);
    if (outcome.kind === "retryable") {
      failures.push(outcome.failure);
      continue;
    }

    if (outcome.vector.length !== CATALOG_EMBEDDING_DIMENSION) {
      failures.push({
        kind: "rejected",
        offerId: input.offerId,
        imageHash: input.imageHash,
        modelVersion: input.modelVersion,
        reason: "embedding dimension mismatch",
      });
      continue;
    }

    const payload: CatalogImageEmbedding = {
      offerId: input.offerId,
      imageHash: input.imageHash,
      modelVersion: input.modelVersion,
      vector: outcome.vector,
      metadata: input.metadata,
      identifiers: input.identifiers,
      offerLifecycle: input.offerLifecycle,
      approved: input.approved,
      stale: input.stale,
      quarantined: input.quarantined,
    };

    if (!isIndexableCatalogImage(payload)) {
      skipped.push({ offerId: input.offerId, imageHash: input.imageHash, reason: "inactive image" });
      continue;
    }

    const result = await repository.upsert(payload);
    if (result.kind === "stored") stored.push(result.record);
    else if (result.kind === "failed") failures.push(result.failure);
    else skipped.push({ offerId: input.offerId, imageHash: input.imageHash, reason: result.reason });
  }

  return { stored, skipped, failures };
}

async function embedCatalogImage(adapter: CatalogEmbeddingAdapter, input: CatalogEmbeddingRequest): Promise<CatalogEmbeddingOutcome> {
  try {
    return { kind: "ok", vector: await adapter.embed(input) };
  } catch (error) {
    return {
      kind: "retryable",
      failure: {
        kind: "retryable",
        offerId: input.offerId,
        imageHash: input.imageHash,
        modelVersion: input.modelVersion,
        reason: error instanceof Error ? error.message : "catalog embedding service unavailable",
      },
    };
  }
}

export function createDeterministicMockEmbeddingAdapter(modelVersion: CatalogEmbeddingModelVersion): CatalogEmbeddingAdapter {
  return {
    modelVersion,
    async embed(input: CatalogEmbeddingRequest): Promise<CatalogEmbeddingVector> {
      const vector = createHash("sha256").update(`${input.offerId}:${input.imageHash}:${input.modelVersion}`).digest();
      const values: number[] = [];
      for (let index = 0; index < CATALOG_EMBEDDING_DIMENSION; index += 1) {
        const byte = vector[index % vector.length];
        values.push(Number((byte / 255).toFixed(6)));
      }
      return values;
    },
  };
}

export function normalizeCatalogImageRecord(input: unknown): CatalogImageEmbedding {
  const parsed = imageRecordSchema.parse(input);
  return {
    offerId: parsed.offerId,
    imageHash: parsed.imageHash,
    modelVersion: parsed.modelVersion,
    vector: parsed.vector ?? [],
    metadata: parsed.metadata,
    identifiers: parsed.identifiers,
    offerLifecycle: parsed.offerLifecycle,
    approved: parsed.approved,
    stale: parsed.stale,
    quarantined: parsed.quarantined,
  };
}
