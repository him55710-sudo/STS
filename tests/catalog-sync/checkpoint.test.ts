import { describe, expect, it } from "vitest";
import { advanceCatalogCheckpoint } from "../../lib/catalog-ingest/sync";

describe("catalog sync checkpoint", () => {
  it("advances from the previous checkpoint to the next page checkpoint", () => {
    const result = advanceCatalogCheckpoint(
      { current: "seed:v1", next: "seed:v2" },
      {
        rows: [],
        rowResults: [],
        errors: [],
        pagination: { page: 1, pageSize: 0, hasNextPage: false, nextPage: null },
        checkpoint: { current: "seed:v2", next: "seed:v3" },
      }
    );

    expect(result).toEqual({ current: "seed:v2", next: "seed:v3" });
  });

  it("preserves the prior checkpoint when the adapter omits a continuation", () => {
    const result = advanceCatalogCheckpoint(
      { current: "seed:v1", next: "seed:v2" },
      {
        rows: [],
        rowResults: [],
        errors: [],
        pagination: { page: 1, pageSize: 0, hasNextPage: false, nextPage: null },
        checkpoint: { current: null, next: null },
      }
    );

    expect(result).toEqual({ current: "seed:v2", next: null });
  });
});
