import { describe, expect, it } from "vitest";
import { buildRetrievalQuery } from "../../lib/retrieval/queries";

describe("identity-aware retrieval queries", () => {
  it("puts an observed model identifier in the highest-priority query", () => {
    const query = buildRetrievalQuery({
      label: "sneakers",
      labelKo: "스니커즈",
      category: "fashion",
      x: 0.2,
      y: 0.6,
      w: 0.4,
      h: 0.25,
      confidence: 0.9,
      attributes: {
        brandCandidates: [{ brand: "Adidas", confidence: 0.9, evidence: ["heel logo"] }],
        modelIdentifiers: ["GX1234"],
        distinctiveFeatures: ["gum sole"],
      },
    });

    expect(query.queries[0]).toContain("GX1234");
    expect(query.queries[0]).toContain("Adidas");
  });
});
