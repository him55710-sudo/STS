import type { DetectedObject } from "../types";
import { MATCH_TIERS } from "../vision-config";
import { RETRIEVAL_CONCURRENCY } from "../vision-config";
import { searchCatalog, searchPersistedCatalog } from "./catalog-provider";
import { buildRetrievalQuery } from "./queries";
import { canClaimExactMatch } from "./product-verifier";
import type { CandidateScores, ProductCandidate, RetrievalQuery } from "./types";
import { cropModeForObject, cropObjectImage } from "./object-crop";
import { webResponseSchema } from "./web-response-schema";

const cache = new Map<string, ProductCandidate[]>();

function isFixtureMode(): boolean {
  return process.env.CATALOG_E2E_FIXTURES === "1" || process.env.NEXT_PUBLIC_CATALOG_E2E_FIXTURES === "1";
}

export async function retrieveCandidates(obj: DetectedObject, sourceImage?: string | null): Promise<{
  query: RetrievalQuery;
  candidates: ProductCandidate[];
}> {
  const query = buildRetrievalQuery(obj);
  const key = JSON.stringify([query.queries, query.tone, query.canonicalClass, isFixtureMode()]);
  if (!sourceImage) {
    const cached = cache.get(key);
    if (cached) return { query, candidates: cached };
  }

  const catalog = isFixtureMode()
    ? searchCatalog(query, 6)
    : await searchPersistedCatalog(query, 6);
  const web = catalog.length > 0 ? [] : await fetchWebCandidates(query, obj, sourceImage ?? null);
  const merged = catalog.length > 0 ? mergeCanonicalCandidates(catalog) : mergeDiscoveryCandidates(web);

  if (!sourceImage) cache.set(key, merged);
  return { query, candidates: merged };
}

async function fetchWebCandidates(query: RetrievalQuery, obj: DetectedObject, sourceImage: string | null): Promise<readonly ProductCandidate[]> {
  try {
    const croppedImage = sourceImage ? await cropObjectImage(sourceImage, obj) : null;
    const res = await fetch("/api/product-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: query.queries,
        tone: query.tone,
        category: obj.category,
        canonicalClass: query.canonicalClass,
        attributes: obj.attributes,
        image: croppedImage ?? undefined,
        cropMode: sourceImage ? cropModeForObject(obj) : undefined,
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    const parsed = webResponseSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    return parsed.data.candidates.map((candidate) => scoreWebCandidate(candidate, query));
  } catch {
    return [];
  }
}

function mergeCanonicalCandidates(catalog: readonly ProductCandidate[], total = 8): ProductCandidate[] {
  return [...catalog]
    .sort((left, right) => {
      const verifiedDelta = Number(Boolean(right.detailPageVerified)) - Number(Boolean(left.detailPageVerified));
      if (verifiedDelta !== 0) return verifiedDelta;
      const tierDelta = tierWeight(right.tier) - tierWeight(left.tier);
      if (tierDelta !== 0) return tierDelta;
      const eligibleDelta = Number(Boolean(right.purchaseEligible)) - Number(Boolean(left.purchaseEligible));
      if (eligibleDelta !== 0) return eligibleDelta;
      return right.scores.final - left.scores.final;
    })
    .slice(0, total);
}

function mergeDiscoveryCandidates(web: readonly ProductCandidate[], total = 8): ProductCandidate[] {
  return [...web]
    .map((candidate) => ({
      ...candidate,
      purchaseEligible: false,
      detailPageVerified: false,
      tier: discoveryTier(candidate),
      matchState: discoveryMatchState(candidate),
    }))
    .sort((left, right) => {
      const tierDelta = tierWeight(right.tier) - tierWeight(left.tier);
      if (tierDelta !== 0) return tierDelta;
      return right.scores.final - left.scores.final;
    })
    .slice(0, total);
}

function scoreWebCandidate(
  c: Omit<ProductCandidate, "scores" | "tier" | "matchReason"> & { pageTrust?: number },
  q: RetrievalQuery
): ProductCandidate {
  const reason: string[] = [];
  const hay = `${c.brand ?? ""} ${c.productName}`.toLowerCase();

  let brand = 0;
  for (const bc of q.attributes?.brandCandidates ?? []) {
    const b = bc.brand.toLowerCase();
    if (hay.includes(b)) {
      brand = Math.max(brand, Math.min(1, bc.confidence + 0.15));
      reason.push(`브랜드 일치: ${bc.brand}`);
    }
  }

  const tokens = q.queries.join(" ").toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const uniq = [...new Set(tokens)];
  const matched = uniq.filter((t) => hay.includes(t));
  const text = uniq.length ? Math.min(1, matched.length / Math.min(uniq.length, 6)) : 0;
  if (matched.length >= 2) reason.push(`상품명 근거: ${matched.slice(0, 3).join(", ")}`);

  let color = 0;
  if (q.tone && c.color) {
    const toneMatch = c.color.toLowerCase().includes(q.tone.toLowerCase());
    color = toneMatch ? 0.8 : 0;
  }

  let logo = 0;
  const logoSig = q.attributes?.logo;
  if (logoSig?.detected && logoSig.text && hay.includes(logoSig.text.toLowerCase())) {
    logo = 0.9;
    reason.push(`로고 텍스트 일치: ${logoSig.text}`);
  }

  const pageTrust = c.pageTrust ?? 0.6;
  const visual = typeof c.visualScore === "number" ? c.visualScore : 0;
  const sameProductProbability = typeof c.sameProductProbability === "number" ? c.sameProductProbability : 0;
  const identityVisual = c.visualSource === "gemini-product-identity"
    ? visual * 0.45 + sameProductProbability * 0.55
    : visual;
  if (identityVisual >= 0.6) reason.push(`이미지 근거 ${Math.round(identityVisual * 100)}%`);
  const final =
    0.3 * identityVisual +
    0.2 * brand +
    0.15 * logo +
    0.1 * (text * 0.5) +
    0.1 * color +
    0.1 * text +
    0.05 * pageTrust;

  const scores: CandidateScores = {
    visual: r2(identityVisual),
    brand: r2(brand),
    logo: r2(logo),
    color: r2(color),
    attributes: r2(text * 0.5),
    text: r2(text),
    pageTrust,
    final: r2(final),
  };

  const exactVerified = canClaimExactMatch({
    finalScore: scores.final,
    visualScore: visual,
    sameProductProbability,
    brandScore: brand,
    logoScore: logo,
    textScore: text,
    conflicts: c.visualConflicts ?? [],
  });

  return {
    ...c,
    scores,
    tier: c.detailPageVerified && exactVerified ? "likely" : discoveryTier({ ...c, scores }),
    matchState: c.detailPageVerified && exactVerified ? "likely" : discoveryMatchState({ ...c, scores }),
    purchaseEligible: false,
    matchReason: reason.slice(0, 4),
  };
}

function discoveryMatchState(candidate: Pick<ProductCandidate, "scores" | "visualScore" | "sameProductProbability" | "visualEvidence" | "visualConflicts">): ProductCandidate["matchState"] {
  if ((candidate.visualConflicts?.length ?? 0) > 0) return "review";
  const strongIdentity = candidate.scores.brand >= 0.55 || candidate.scores.text >= 0.65 || candidate.scores.logo >= 0.5;
  const strongVisual = (candidate.visualScore ?? 0) >= 0.72 || (candidate.sameProductProbability ?? 0) >= 0.8;
  if (strongIdentity && strongVisual) return "review";
  if (strongIdentity || strongVisual || (candidate.visualEvidence?.length ?? 0) > 0) return "review";
  return "unverified";
}

function discoveryTier(candidate: Pick<ProductCandidate, "scores" | "visualScore" | "sameProductProbability" | "visualEvidence" | "visualConflicts">): ProductCandidate["tier"] {
  const state = discoveryMatchState(candidate);
  if (state === "similar") return "similar";
  if (state === "review") return "review";
  return "unverified";
}

function tierWeight(tier: ProductCandidate["tier"]): number {
  switch (tier) {
    case "exact":
      return 4;
    case "likely":
      return 3;
    case "similar":
      return 2;
    case "review":
      return 1;
    case "unverified":
      return 0;
    default:
      return 0;
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** 객체 배열에 대해 동시 실행 상한을 지키며 retrieval 실행 */
export async function retrieveAll(
  objects: DetectedObject[],
  sourceImage?: string | null
): Promise<Map<number, Awaited<ReturnType<typeof retrieveCandidates>>>> {
  const out = new Map<number, Awaited<ReturnType<typeof retrieveCandidates>>>();
  let idx = 0;
  const workers = Array.from({ length: Math.min(RETRIEVAL_CONCURRENCY, objects.length) }, async () => {
    while (idx < objects.length) {
      const i = idx++;
      try {
        out.set(i, await retrieveCandidates(objects[i], sourceImage));
      } catch {
        // 개별 실패 무시
      }
    }
  });
  await Promise.all(workers);
  return out;
}

export { MATCH_TIERS };
export type { ProductCandidate, RetrievalQuery };
