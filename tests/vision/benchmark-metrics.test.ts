import { describe, expect, it } from "vitest";
import { evaluateRankingCases } from "../../lib/retrieval/benchmark-metrics";

describe("visual rerank benchmark metrics", () => {
  it("compares ranking recall and false exact predictions without inventing missing labels", () => {
    const cases = [{
      groundTruthId: "sku-1",
      baselineIds: ["sku-2", "sku-1"],
      visualIds: ["sku-1", "sku-2"],
      baselineExactId: "sku-2",
      visualExactId: "sku-1",
      imageAvailable: true,
    }];
    const baseline = evaluateRankingCases(cases, "baseline");
    const visual = evaluateRankingCases(cases, "visual");
    expect(baseline.recallAt1).toBe(0);
    expect(visual.recallAt1).toBe(1);
    expect(baseline.falseExactRate).toBe(1);
    expect(visual.falseExactRate).toBe(0);
    expect(visual.visualImageCoverage).toBe(1);
  });
});
