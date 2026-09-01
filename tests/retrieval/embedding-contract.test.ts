import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CATALOG_EMBEDDING_DIMENSION, createDeterministicMockEmbeddingAdapter } from "../../lib/retrieval/catalog-index";

const embeddingContractSchema = z.object({
  offerId: z.string().min(1),
  imageHash: z.string().min(1),
  modelVersion: z.string().min(1),
  vector: z.array(z.number().finite()),
});

describe("embedding contract", () => {
  it("produces bounded deterministic vectors with the expected dimension", async () => {
    const adapter = createDeterministicMockEmbeddingAdapter("mock-clip-v1");
    const embedding = await adapter.embed({
      offerId: "offer:blue-oxford",
      imagePath: "tests/fixtures/catalog/blue-oxford-reference.jpg",
      imageHash: "fixture-hash-blue",
      modelVersion: "mock-clip-v1",
    });

    const parsed = embeddingContractSchema.parse({
      offerId: "offer:blue-oxford",
      imageHash: "fixture-hash-blue",
      modelVersion: "mock-clip-v1",
      vector: embedding,
    });

    expect(parsed.vector).toHaveLength(CATALOG_EMBEDDING_DIMENSION);
    expect(parsed.vector.every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});
