import { describe, expect, it } from "vitest";
import {
  canClaimExactMatch,
  parseProductVerification,
} from "../../lib/retrieval/product-verifier";

describe("product identity verification", () => {
  it("parses bounded Gemini scores and maps image indexes to candidate IDs", () => {
    const result = parseProductVerification(
      JSON.stringify({
        matches: [
          {
            index: 0,
            visualSimilarity: 0.94,
            sameProductProbability: 0.91,
            evidence: ["same embroidered chest mark"],
            conflicts: [],
          },
        ],
      }),
      ["candidate-1"]
    );

    expect(result).toEqual([
      {
        candidateId: "candidate-1",
        visualSimilarity: 0.94,
        sameProductProbability: 0.91,
        evidence: ["same embroidered chest mark"],
        conflicts: [],
      },
    ]);
  });

  it("requires identity evidence before claiming an exact product", () => {
    expect(
      canClaimExactMatch({
        finalScore: 0.84,
        visualScore: 0.95,
        sameProductProbability: 0.96,
        brandScore: 0.8,
        logoScore: 0.7,
        textScore: 0.6,
        conflicts: [],
      })
    ).toBe(true);

    expect(
      canClaimExactMatch({
        finalScore: 0.84,
        visualScore: 0.95,
        sameProductProbability: 0.96,
        brandScore: 0,
        logoScore: 0,
        textScore: 0.4,
        conflicts: [],
      })
    ).toBe(false);

    expect(
      canClaimExactMatch({
        finalScore: 0.84,
        visualScore: 0.95,
        sameProductProbability: 0.96,
        brandScore: 0.8,
        logoScore: 0.7,
        textScore: 0.6,
        conflicts: ["different button layout"],
      })
    ).toBe(false);
  });

  it("treats verification timeouts and contradictory evidence as non-exact review-only candidates", () => {
    expect(
      canClaimExactMatch({
        finalScore: 0.96,
        visualScore: 0.95,
        sameProductProbability: 0.96,
        brandScore: 0.8,
        logoScore: 0.7,
        textScore: 0.6,
        conflicts: ["verifier timeout"],
      })
    ).toBe(false);

    expect(
      parseProductVerification(
        JSON.stringify({
          matches: [
            {
              index: 0,
              visualSimilarity: 0.94,
              sameProductProbability: 0.91,
              evidence: ["same embroidered chest mark"],
              conflicts: ["verifier timeout"],
            },
          ],
        }),
        ["candidate-1"]
      )
    ).toEqual([
      {
        candidateId: "candidate-1",
        visualSimilarity: 0.94,
        sameProductProbability: 0.91,
        evidence: ["same embroidered chest mark"],
        conflicts: ["verifier timeout"],
      },
    ]);
  });
});
