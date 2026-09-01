import { VISUAL_RERANK_POLICY, VISUAL_RERANK_WEIGHTS } from "../vision-config";
import { fetchRemoteProductImage } from "./remote-image";
import { cosineSimilarity, normalizeEmbedding, normalizedVisualScore, type VisualEmbeddingProvider } from "./visual-embedding";
import type { ProductDiscoveryQuery } from "./discovery-types";
import type { WebCandidate } from "./web-candidates";
import type { ProductImageEmbeddingStore } from "./image-embedding-cache";

export type QueryCropMode = "polygon" | "bbox";

export type VisualRerankResult = {
  readonly candidates: readonly WebCandidate[];
  readonly topTen: readonly WebCandidate[];
  readonly status: "success" | "partial" | "unavailable";
  readonly scoredCount: number;
  readonly imageCoverage: number;
  readonly latencyMs: number;
};

export async function rerankProductCandidates(input: {
  readonly query: ProductDiscoveryQuery;
  readonly queryImage: string | null;
  readonly cropMode: QueryCropMode;
  readonly candidates: readonly WebCandidate[];
  readonly provider: VisualEmbeddingProvider | null;
  readonly store: ProductImageEmbeddingStore;
  readonly imageLoader?: (url: string) => Promise<Buffer | null>;
}): Promise<VisualRerankResult> {
  const started = Date.now();
  const imageCandidates = input.candidates.filter((candidate) => Boolean(candidate.primaryImageUrl ?? candidate.imageUrls[0]));
  if (!input.provider || !input.queryImage) {
    const ranked = rankPreliminary(input.candidates, input.query, null);
    return result(ranked, 0, imageCandidates.length, "unavailable", started);
  }
  const provider = input.provider;

  let queryEmbedding: number[];
  try {
    queryEmbedding = normalizeEmbedding(await provider.embedImage({ image: input.queryImage }));
  } catch {
    const ranked = rankPreliminary(input.candidates, input.query, null);
    return result(ranked, 0, imageCandidates.length, "unavailable", started);
  }
  if (queryEmbedding.length === 0) {
    const ranked = rankPreliminary(input.candidates, input.query, null);
    return result(ranked, 0, imageCandidates.length, "unavailable", started);
  }

  const loader = input.imageLoader ?? (async (url: string) => (await fetchRemoteProductImage(url))?.bytes ?? null);
  const scored = new Array<WebCandidate>(input.candidates.length);
  let next = 0;
  let scoredCount = 0;
  const worker = async () => {
    while (true) {
      const index = next++;
      if (index >= input.candidates.length) return;
      const candidate = input.candidates[index];
      const imageUrl = candidate.primaryImageUrl ?? candidate.imageUrls[0] ?? null;
      if (!imageUrl) {
        scored[index] = withPreliminary(candidate, input.query, null);
        continue;
      }
      const cachedEmbedding = await input.store.get(imageUrl, provider.modelVersion);
      let embedding: number[] = [];
      if (!cachedEmbedding) {
        const bytes = await loader(imageUrl).catch(() => null);
        if (bytes) {
          embedding = normalizeEmbedding(await provider.embedImage({ image: bytes }).catch(() => []));
          if (embedding.length > 0) await input.store.set(imageUrl, provider.modelVersion, embedding);
        }
      } else {
        embedding = normalizeEmbedding(cachedEmbedding);
      }
      const similarity = embedding.length > 0 ? cosineSimilarity(queryEmbedding, embedding) : null;
      const visualScore = similarity === null ? null : normalizedVisualScore(similarity);
      if (visualScore !== null) scoredCount += 1;
      scored[index] = withPreliminary(candidate, input.query, visualScore, input.cropMode, Boolean(imageUrl));
    }
  };
  await Promise.all(Array.from({ length: Math.min(VISUAL_RERANK_POLICY.maxImageConcurrency, Math.max(1, input.candidates.length)) }, worker));
  const ranked = rankPreliminary(scored, input.query, input.cropMode);
  const status = scoredCount === 0 ? "unavailable" : scoredCount === imageCandidates.length ? "success" : "partial";
  return result(ranked, scoredCount, imageCandidates.length, status, started);
}

function result(
  ranked: readonly WebCandidate[],
  scoredCount: number,
  imageCount: number,
  status: VisualRerankResult["status"],
  started: number
): VisualRerankResult {
  return { candidates: ranked, topTen: ranked.slice(0, VISUAL_RERANK_POLICY.preliminaryTopK), status, scoredCount, imageCoverage: imageCount === 0 ? 0 : scoredCount / imageCount, latencyMs: Date.now() - started };
}

function rankPreliminary(candidates: readonly WebCandidate[], query: ProductDiscoveryQuery, cropMode: QueryCropMode | null): WebCandidate[] {
  return candidates
    .map((candidate) => withPreliminary(candidate, query, candidate.visualSiglipScore ?? candidate.visualScore ?? null, cropMode ?? undefined, Boolean(candidate.primaryImageUrl ?? candidate.imageUrls[0])))
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => strongIdentifierPriority(right.candidate, query) - strongIdentifierPriority(left.candidate, query) || (right.candidate.preliminaryIdentityScore ?? 0) - (left.candidate.preliminaryIdentityScore ?? 0) || left.index - right.index)
    .map(({ candidate }) => candidate);
}

function withPreliminary(candidate: WebCandidate, query: ProductDiscoveryQuery, visualScore: number | null, cropMode?: QueryCropMode, candidateImageAvailable = false): WebCandidate {
  const text = normalize([candidate.brand, candidate.productName, candidate.modelName, candidate.modelCode, candidate.color].join(" "));
  const brand = query.brandCandidates.length === 0 ? 0 : query.brandCandidates.some((item) => text.includes(normalize(item.brand))) ? Math.max(...query.brandCandidates.filter((item) => text.includes(normalize(item.brand))).map((item) => item.confidence)) : 0;
  const canonicalClass = classScore(query.canonicalClass, candidate.canonicalClass ?? candidate.category ?? candidate.productName);
  const logoOrText = query.visibleText.length === 0 ? 0 : query.visibleText.filter((item) => text.includes(normalize(item))).length / query.visibleText.length;
  const attributes = query.distinctiveFeatures.length === 0 ? 0 : query.distinctiveFeatures.filter((item) => text.includes(normalize(item))).length / query.distinctiveFeatures.length;
  const color = query.primaryColor && candidate.color && colorFamily(query.primaryColor) === colorFamily(candidate.color) ? 1 : 0;
  const sourceAgreement = Math.min(1, (candidate.sourceAgreementCount ?? candidate.sourceProviders?.length ?? 1) / 3);
  const preliminaryIdentityScore = round(
    (visualScore ?? 0) * VISUAL_RERANK_WEIGHTS.visualSiglip +
    brand * VISUAL_RERANK_WEIGHTS.brand +
    canonicalClass * VISUAL_RERANK_WEIGHTS.canonicalClass +
    logoOrText * VISUAL_RERANK_WEIGHTS.logoOrText +
    attributes * VISUAL_RERANK_WEIGHTS.attributes +
    color * VISUAL_RERANK_WEIGHTS.color +
    sourceAgreement * VISUAL_RERANK_WEIGHTS.sourceAgreement
  );
  return {
    ...candidate,
    visualSiglipScore: visualScore,
    visualScore: visualScore ?? candidate.visualScore,
    visualSource: visualScore === null ? candidate.visualSource : "siglip2-base",
    preliminaryIdentityScore,
    ...(visualScore === null ? {} : {
      visualEvidenceDetail: {
        model: "siglip2-base",
        score: visualScore,
        queryCropMode: cropMode ?? "bbox",
        candidateImageAvailable,
      },
    }),
  };
}

function classScore(expected: string, actual: string): number {
  const left = normalize(expected);
  const right = normalize(actual);
  if (!left || !right) return 0;
  if (right.includes(left) || left.includes(right)) return 1;
  const family = (value: string) => value.includes("shoe") || value.includes("sneaker") ? "shoe" : value.includes("shirt") || value.includes("blouse") ? "shirt" : value.includes("bag") ? "bag" : value;
  return family(left) === family(right) ? 0.75 : 0;
}

function strongIdentifierPriority(candidate: WebCandidate, query: ProductDiscoveryQuery): number {
  const expected = new Set((query.modelIdentifiers ?? []).map(normalize).filter(Boolean));
  if (expected.size === 0 && !query.modelGuess) return 0;
  const actual = [candidate.modelCode, candidate.sku, candidate.gtin, candidate.ean, candidate.upc, ...(candidate.identifiers ?? []).map((item) => item.value)].map((value) => normalize(value ?? ""));
  return actual.some((value) => expected.has(value) || (query.modelGuess ? value === normalize(query.modelGuess) : false)) ? 1 : 0;
}

function colorFamily(value: string): string | null {
  const text = normalize(value);
  const groups = [["black", "블랙", "검정"], ["white", "화이트", "흰색"], ["blue", "블루", "파랑", "skyblue", "스카이블루", "하늘색"], ["navy", "네이비"], ["gray", "grey", "그레이", "회색"], ["red", "레드", "빨강"], ["brown", "브라운", "갈색"]];
  return groups.find((group) => group.some((item) => text.includes(normalize(item))))?.[0] ?? null;
}

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, ""); }
function round(value: number): number { return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000; }
