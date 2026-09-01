import { classifyCommerceUrl } from "../commerce/url-policy";
import type {
  DiscoverySource,
  ProductDiscoveryCandidate,
  RawProductCandidate,
} from "./discovery-types";

export function normalizeRawProductCandidate(
  raw: RawProductCandidate
): ProductDiscoveryCandidate | null {
  const title = clean(raw.title);
  const detailUrl = detailUrlOf(raw.productDetailUrl);
  const searchUrl = discoveryUrlOf(raw.searchUrl) ?? discoveryUrlOf(raw.productDetailUrl);
  const displayUrl = detailUrl ?? searchUrl;
  if (!title || !displayUrl) return null;

  const imageUrls = uniqueUrls(raw.imageUrls);
  const primaryImageUrl = validHttpUrl(raw.primaryImageUrl) ?? imageUrls[0] ?? null;
  const source: DiscoverySource = {
    provider: raw.provider,
    sourceType: raw.sourceType,
    merchant: clean(raw.merchant) ?? "알 수 없는 판매처",
    detailUrl,
    searchUrl,
  };

  return {
    id: candidateId(raw.provider, raw, detailUrl, searchUrl),
    provider: raw.provider,
    sourceType: raw.sourceType,
    merchant: source.merchant,
    merchantProductId: clean(raw.merchantProductId),
    productId: clean(raw.productId),
    title,
    brand: clean(raw.brand),
    canonicalClass: clean(raw.canonicalClass),
    category: clean(raw.category),
    color: clean(raw.color),
    modelName: clean(raw.modelName),
    modelCode: clean(raw.modelCode),
    sku: clean(raw.sku),
    gtin: clean(raw.gtin),
    ean: clean(raw.ean),
    upc: clean(raw.upc),
    identifiers: identifiersOf(raw),
    productDetailUrl: detailUrl,
    searchUrl,
    url: displayUrl,
    detailUrl,
    discoveryUrl: searchUrl,
    imageUrls,
    primaryImageUrl,
    imageAvailable: imageUrls.length > 0,
    price: { value: finitePrice(raw.price), currency: clean(raw.currency) },
    rawMetadata: raw.rawMetadata,
    sourceConfidence: boundedScore(raw.sourceConfidence),
    sources: [source],
    sourceProviders: [raw.provider],
    sourceAgreementCount: 1,
    detailPageVerified: false,
    purchaseEligible: false,
    matchState: "unverified",
  };
}

function identifiersOf(raw: RawProductCandidate): readonly { readonly kind: "gtin" | "ean" | "upc"; readonly value: string }[] {
  return [
    raw.gtin ? { kind: "gtin" as const, value: raw.gtin } : null,
    raw.ean ? { kind: "ean" as const, value: raw.ean } : null,
    raw.upc ? { kind: "upc" as const, value: raw.upc } : null,
  ].flatMap((identifier) => identifier ? [identifier] : []);
}

export function normalizeRawProductCandidates(
  rawCandidates: readonly RawProductCandidate[]
): ProductDiscoveryCandidate[] {
  return rawCandidates.flatMap((candidate) => {
    const normalized = normalizeRawProductCandidate(candidate);
    return normalized ? [normalized] : [];
  });
}

export function deduplicateProductCandidates(
  candidates: readonly ProductDiscoveryCandidate[]
): ProductDiscoveryCandidate[] {
  const output: ProductDiscoveryCandidate[] = [];
  for (const candidate of candidates) {
    const keys = identityKeys(candidate);
    const duplicateIndex = output.findIndex((existing) =>
      keys.some((key) => identityKeys(existing).includes(key))
    );
    if (duplicateIndex < 0) {
      output.push(candidate);
      continue;
    }
    const existing = output[duplicateIndex];
    if (existing) output[duplicateIndex] = mergeCandidates(existing, candidate);
  }
  return output;
}

function mergeCandidates(
  left: ProductDiscoveryCandidate,
  right: ProductDiscoveryCandidate
): ProductDiscoveryCandidate {
  const sources = [...left.sources, ...right.sources].filter((source, index, all) =>
    all.findIndex((item) => item.provider === source.provider && item.detailUrl === source.detailUrl && item.searchUrl === source.searchUrl) === index
  );
  const sourceProviders = [...new Set(sources.map((source) => source.provider))];
  const imageUrls = [...new Set([...left.imageUrls, ...right.imageUrls])];
  const preferred = preferCandidate(left, right);
  const rawMetadata = { ...left.rawMetadata, ...right.rawMetadata };

  return {
    ...preferred,
    brand: preferred.brand ?? left.brand ?? right.brand,
    productDetailUrl: left.productDetailUrl ?? right.productDetailUrl,
    detailUrl: left.detailUrl ?? right.detailUrl,
    url: left.productDetailUrl ?? right.productDetailUrl ?? left.url,
    searchUrl: left.searchUrl ?? right.searchUrl,
    discoveryUrl: left.searchUrl ?? right.searchUrl,
    imageUrls,
    primaryImageUrl: left.primaryImageUrl ?? right.primaryImageUrl ?? imageUrls[0] ?? null,
    imageAvailable: imageUrls.length > 0,
    rawMetadata,
    sources,
    sourceProviders,
    sourceAgreementCount: sourceProviders.length,
  };
}

function preferCandidate(
  left: ProductDiscoveryCandidate,
  right: ProductDiscoveryCandidate
): ProductDiscoveryCandidate {
  const leftRank = candidateRank(left);
  const rightRank = candidateRank(right);
  return rightRank > leftRank ? right : left;
}

function candidateRank(candidate: ProductDiscoveryCandidate): number {
  return Number(Boolean(candidate.productDetailUrl)) * 4
    + Number(candidate.imageAvailable) * 2
    + Number(candidate.merchantProductId !== null)
    + (candidate.sourceConfidence ?? 0);
}

function identityKeys(candidate: ProductDiscoveryCandidate): string[] {
  const keys: string[] = [];
  for (const [kind, value] of [["gtin", candidate.gtin], ["ean", candidate.ean], ["upc", candidate.upc]] as const) {
    if (value) keys.push(`${kind}:${compact(value)}`);
  }
  if (candidate.merchantProductId) keys.push(`merchant:${compact(candidate.merchant)}:${compact(candidate.merchantProductId)}`);
  if (candidate.productDetailUrl) keys.push(`url:${canonicalUrl(candidate.productDetailUrl)}`);
  if (candidate.modelCode && candidate.brand) {
    keys.push(`model:${compact(candidate.brand)}:${compact(candidate.modelCode)}:${compact(candidate.color ?? "")}`);
  }
  keys.push(`title:${compact(candidate.brand ?? "")} : ${compact(candidate.title)} : ${compact(candidate.color ?? "")}`);
  return keys;
}

function candidateId(provider: string, raw: RawProductCandidate, detailUrl: string | null, searchUrl: string | null): string {
  const stable = raw.gtin ?? raw.ean ?? raw.upc ?? raw.merchantProductId ?? raw.productId ?? detailUrl ?? searchUrl ?? raw.title;
  return `discovery:${compact(provider)}:${compact(stable)}`;
}

function detailUrlOf(value: string | null): string | null {
  const url = validHttpUrl(value);
  if (!url) return null;
  return classifyCommerceUrl(url).kind === "detail" ? url : null;
}

function discoveryUrlOf(value: string | null): string | null {
  const url = validHttpUrl(value);
  if (!url) return null;
  const classification = classifyCommerceUrl(url);
  return classification.kind === "discovery" ? classification.url : null;
}

function validHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "").toLowerCase();
}

function uniqueUrls(values: readonly string[]): string[] {
  return [...new Set(values.flatMap((value) => {
    const url = validHttpUrl(value);
    return url ? [url] : [];
  }))];
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : null;
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function finitePrice(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function boundedScore(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}
