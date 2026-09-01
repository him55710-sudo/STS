import { describe, expect, it } from "vitest";
import { previewCatalogImport } from "../../lib/catalog-ingest/import-preview";

describe("catalog import preview", () => {
  it("derives preview results without introducing writes", () => {
    const preview = previewCatalogImport(
      {
        rows: [],
        errors: [
          {
            kind: "quarantine",
            rowNumber: 3,
            code: "missing_title",
            field: "title",
            message: "title is required",
          },
        ],
        pagination: { page: 1, pageSize: 1, hasNextPage: false, nextPage: null },
        checkpoint: { current: "seed:v1", next: "seed:v2" },
      },
      "fixture"
    );

    expect(preview.batch.preview).toBe(true);
    expect(preview.batch.acceptedCount).toBe(0);
    expect(preview.quarantined[0]).toMatchObject({ rowNumber: 3, code: "missing_title" });
    expect(preview.products).toEqual([]);
  });
});
