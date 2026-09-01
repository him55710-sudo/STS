export type RankingBenchmarkCase = {
  readonly groundTruthId: string;
  readonly baselineIds: readonly string[];
  readonly visualIds: readonly string[];
  readonly baselineExactId?: string | null;
  readonly visualExactId?: string | null;
  readonly imageAvailable?: boolean;
  readonly baselineLatencyMs?: number;
  readonly visualLatencyMs?: number;
};

export type RankingMetricSet = {
  readonly candidateHitAt50: number;
  readonly recallAt1: number;
  readonly recallAt3: number;
  readonly recallAt5: number;
  readonly mrr: number;
  readonly exactSkuPrecision: number;
  readonly falseExactRate: number;
  readonly unverifiedRate: number;
  readonly visualImageCoverage: number;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
};

export function evaluateRankingCases(cases: readonly RankingBenchmarkCase[], mode: "baseline" | "visual"): RankingMetricSet {
  if (cases.length === 0) return emptyMetrics();
  const ranks = cases.map((item) => {
    const ranking = mode === "baseline" ? item.baselineIds : item.visualIds;
    const index = ranking.indexOf(item.groundTruthId);
    return index < 0 ? null : index + 1;
  });
  const exactIds = cases.map((item) => mode === "baseline" ? item.baselineExactId ?? null : item.visualExactId ?? null);
  const exactPredictions = exactIds.filter((value): value is string => Boolean(value));
  const correctExact = exactIds.filter((value, index) => value !== null && value === cases[index]?.groundTruthId).length;
  const latency = cases.map((item) => mode === "baseline" ? item.baselineLatencyMs : item.visualLatencyMs).filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  return {
    candidateHitAt50: rate(ranks.filter((rank) => rank !== null && rank <= 50).length, cases.length),
    recallAt1: rate(ranks.filter((rank) => rank === 1).length, cases.length),
    recallAt3: rate(ranks.filter((rank) => rank !== null && rank <= 3).length, cases.length),
    recallAt5: rate(ranks.filter((rank) => rank !== null && rank <= 5).length, cases.length),
    mrr: ranks.reduce<number>((sum, rank) => sum + (rank === null ? 0 : 1 / rank), 0) / cases.length,
    exactSkuPrecision: rate(correctExact, exactPredictions.length),
    falseExactRate: rate(exactPredictions.filter((value, index) => value !== cases[index]?.groundTruthId).length, cases.length),
    unverifiedRate: rate(exactIds.filter((value) => !value).length, cases.length),
    visualImageCoverage: rate(cases.filter((item) => item.imageAvailable).length, cases.length),
    latencyP50: percentile(latency, 0.5),
    latencyP95: percentile(latency, 0.95),
  };
}

function emptyMetrics(): RankingMetricSet {
  return { candidateHitAt50: 0, recallAt1: 0, recallAt3: 0, recallAt5: 0, mrr: 0, exactSkuPrecision: 0, falseExactRate: 0, unverifiedRate: 0, visualImageCoverage: 0, latencyP50: null, latencyP95: null };
}

function rate(numerator: number, denominator: number): number { return denominator === 0 ? 0 : numerator / denominator; }
function percentile(values: readonly number[], fraction: number): number | null { return values.length === 0 ? null : values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1))]; }
