import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CATALOG_EMBEDDING_DIMENSION,
  createCatalogIndexRepository,
  createDeterministicMockEmbeddingAdapter,
  hashFileSha256,
  indexCatalogImages,
} from "../../lib/retrieval/catalog-index";
import { readFile } from "node:fs/promises";
import type { ProductIdentifier } from "../../lib/commerce/types";

const modelVersion = "mock-clip-v1";

const baseBatch = {
  offerId: "offer:blue-oxford",
  imagePath: "tests/fixtures/catalog/blue-oxford-reference.jpg",
  imageHash: "fixture-hash-blue",
  modelVersion,
  metadata: { sourcePath: "tests/fixtures/catalog/blue-oxford-reference.jpg", mimeType: "image/jpeg", width: 640, height: 640 },
  identifiers: [{ kind: "sku", value: "plw-polo-oxford" }] satisfies readonly ProductIdentifier[],
  offerLifecycle: "active" as const,
  approved: true,
  stale: false,
  quarantined: false,
};

describe("catalog index", () => {
  it("stores deterministic embeddings only for active approved images and stays idempotent by offerId/imageHash/modelVersion", async () => {
    const repository = createCatalogIndexRepository(modelVersion);
    const adapter = createDeterministicMockEmbeddingAdapter(modelVersion);

    const first = await indexCatalogImages(repository, adapter, [baseBatch]);
    const second = await indexCatalogImages(repository, adapter, [baseBatch]);

    expect(first.failures).toEqual([]);
    expect(first.skipped).toEqual([]);
    expect(first.stored).toHaveLength(1);
    expect(first.stored[0]?.vector).toHaveLength(CATALOG_EMBEDDING_DIMENSION);
    expect(second.stored).toHaveLength(1);
    expect(await repository.listByOffer(baseBatch.offerId)).toHaveLength(1);
  });

  it("skips stale and quarantined images without asking the adapter to index them", async () => {
    const repository = createCatalogIndexRepository(modelVersion);
    const adapter = createDeterministicMockEmbeddingAdapter(modelVersion);
    const result = await indexCatalogImages(repository, adapter, [
      { ...baseBatch, imageHash: "fixture-hash-stale", stale: true },
      { ...baseBatch, imageHash: "fixture-hash-quarantine", quarantined: true, approved: false },
    ]);

    expect(result.stored).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(result.skipped.map((entry) => entry.reason)).toEqual(["inactive image", "inactive image"]);
  });

  it("rejects model version mismatches before storing records", async () => {
    const repository = createCatalogIndexRepository(modelVersion);
    const adapter = createDeterministicMockEmbeddingAdapter("other-model");
    const result = await indexCatalogImages(repository, adapter, [{ ...baseBatch, modelVersion: "other-model" }]);

    expect(result.stored).toEqual([]);
    expect(result.failures[0]).toMatchObject({ kind: "rejected", reason: "repository model version mismatch" });
  });

  it("converts embedding outages into retryable failures", async () => {
    const repository = createCatalogIndexRepository(modelVersion);
    const adapter = {
      modelVersion,
      async embed(): Promise<readonly number[]> {
        throw new Error("offline");
      },
    };

    const result = await indexCatalogImages(repository, adapter, [baseBatch]);
    expect(result.failures[0]).toMatchObject({ kind: "retryable", reason: "offline" });
  });

  it("hashes fixture assets deterministically", async () => {
    const hash = await hashFileSha256("tests/fixtures/catalog/blue-oxford-reference.jpg");
    const bytes = await readFile("tests/fixtures/catalog/blue-oxford-reference.jpg");
    expect(hash).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
});
