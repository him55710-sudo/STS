import {
  deduplicateProductCandidates,
  normalizeRawProductCandidates,
} from "./discovery-normalize";
import type {
  DiscoveryMetrics,
  DiscoverySourceType,
  ProductDiscoveryCandidate,
  ProductDiscoveryProvider,
  ProductDiscoveryQuery,
  ProductDiscoveryResult,
  ProviderDiscoveryMetric,
  RawProductCandidate,
} from "./discovery-types";

const MAX_DISCOVERY_CANDIDATES = 50;
const SOFT_QUOTAS: Readonly<Record<DiscoverySourceType, number>> = {
  korean_commerce: 20,
  additional_commerce: 15,
  grounded_web: 10,
  fallback: 50,
};

type DiscoveryInput = {
  readonly query: ProductDiscoveryQuery;
  readonly providers: readonly ProductDiscoveryProvider[];
  readonly maxCandidates?: number;
};

type ProviderRun = {
  readonly provider: ProductDiscoveryProvider;
  readonly rawCandidates: readonly RawProductCandidate[];
  readonly normalizedCandidates: readonly ProductDiscoveryCandidate[];
  readonly metric: ProviderDiscoveryMetric;
};

export async function discoverProducts(input: DiscoveryInput): Promise<ProductDiscoveryResult> {
  const runs = await Promise.all(input.providers.map((provider) => runProvider(provider, input.query)));
  const rawCandidateCount = runs.reduce((total, run) => total + run.rawCandidates.length, 0);
  const normalized = runs.flatMap((run) => run.normalizedCandidates);
  const deduplicated = deduplicateProductCandidates(normalized);
  const limit = Math.min(MAX_DISCOVERY_CANDIDATES, Math.max(1, input.maxCandidates ?? MAX_DISCOVERY_CANDIDATES));
  const candidates = selectCandidatePool(deduplicated, limit);
  const providerMetrics = runs.map((run) => ({
    ...run.metric,
    accepted: candidates.filter((candidate) => candidate.sourceProviders.includes(run.provider.id)).length,
    rejected: run.normalizedCandidates.length - candidates.filter((candidate) => candidate.sourceProviders.includes(run.provider.id)).length,
  }));

  const metrics: DiscoveryMetrics = {
    rawCandidateCount,
    normalizedCandidateCount: normalized.length,
    deduplicatedCandidateCount: deduplicated.length,
    rejectedCandidateCount: normalized.length - deduplicated.length + deduplicated.length - candidates.length,
    validatedCandidateCount: 0,
    providerMetrics,
  };

  return { candidates, metrics };
}

async function runProvider(
  provider: ProductDiscoveryProvider,
  query: ProductDiscoveryQuery
): Promise<ProviderRun> {
  const startedAt = performance.now();
  try {
    const rawCandidates = await provider.search(query);
    const normalizedCandidates = normalizeRawProductCandidates(rawCandidates);
    return {
      provider,
      rawCandidates,
      normalizedCandidates,
      metric: {
        provider: provider.id,
        requested: true,
        returned: rawCandidates.length,
        accepted: normalizedCandidates.length,
        rejected: rawCandidates.length - normalizedCandidates.length,
        latencyMs: Math.round(performance.now() - startedAt),
        error: false,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`[discovery] provider ${provider.id} failed: ${error.message}`);
    } else {
      console.warn(`[discovery] provider ${provider.id} failed with a non-Error value`);
    }
    return {
      provider,
      rawCandidates: [],
      normalizedCandidates: [],
      metric: {
        provider: provider.id,
        requested: true,
        returned: 0,
        accepted: 0,
        rejected: 0,
        latencyMs: Math.round(performance.now() - startedAt),
        error: true,
      },
    };
  }
}

function selectCandidatePool(
  candidates: readonly ProductDiscoveryCandidate[],
  limit: number
): ProductDiscoveryCandidate[] {
  const selected: ProductDiscoveryCandidate[] = [];
  const selectedIds = new Set<string>();
  for (const sourceType of ["korean_commerce", "additional_commerce", "grounded_web", "fallback"] as const) {
    const quota = Math.min(SOFT_QUOTAS[sourceType], limit - selected.length);
    if (quota <= 0) break;
    for (const candidate of candidates.filter((item) => item.sourceType === sourceType).slice(0, quota)) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }
  if (selected.length >= limit) return selected;
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (!selectedIds.has(candidate.id)) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }
  return selected;
}
