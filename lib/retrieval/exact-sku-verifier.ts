import { FINAL_IDENTITY_WEIGHTS, VISUAL_RERANK_POLICY } from "../vision-config";
import type { ProductDiscoveryQuery } from "./discovery-types";
import type { WebCandidate } from "./web-candidates";

export const IDENTITY_STATUSES = ["VERIFIED", "LIKELY", "POSSIBLE", "CONFLICT", "UNVERIFIED"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];
export type EvidenceMatch = "exact" | "conflict" | "unknown";

export type ExactSkuVerification = {
  readonly brandMatch: number;
  readonly classMatch: number;
  readonly colorwayMatch: number | null;
  readonly modelNameMatch: number | null;
  readonly modelCodeMatch: EvidenceMatch;
  readonly identifierMatch: EvidenceMatch;
  readonly logoTextMatch: number | null;
  readonly visualScore: number | null;
  readonly sourceAgreementScore: number;
  readonly conflicts: readonly string[];
  readonly reasons: readonly string[];
  readonly finalIdentityScore: number;
  readonly identityStatus: IdentityStatus;
  readonly variantExactness: boolean;
};

export function verifyExactSku(input: {
  readonly query: ProductDiscoveryQuery;
  readonly candidate: WebCandidate;
}): ExactSkuVerification {
  const { query, candidate } = input;
  const conflicts: string[] = [];
  const reasons: string[] = [];
  const candidateText = normalize([candidate.brand, candidate.productName, candidate.modelName, candidate.modelCode, candidate.color].join(" "));
  const expectedBrands = query.brandCandidates.map((item) => normalize(item.brand)).filter(Boolean);
  const brandMatch = expectedBrands.length === 0
    ? 0
    : expectedBrands.some((brand) => candidateText.includes(brand))
      ? Math.max(...query.brandCandidates.filter((item) => candidateText.includes(normalize(item.brand))).map((item) => clamp(item.confidence + 0.1)))
      : 0;
  if (brandMatch >= 0.5) reasons.push("brand agreement");
  else if (expectedBrands.length > 0) conflicts.push("brand conflict");

  const classMatch = classScore(query.canonicalClass, candidate.canonicalClass ?? candidate.category ?? candidate.productName);
  if (classMatch >= 0.7) reasons.push("canonical class agreement");
  else if (query.canonicalClass && candidate.canonicalClass) conflicts.push("canonical class conflict");

  const modelCodeMatch = strongCodeMatch(query, candidate);
  if (modelCodeMatch === "exact") reasons.push("model code exact");
  if (modelCodeMatch === "conflict") conflicts.push("model code conflict");

  const identifierMatch = identifierMatchFor(query, candidate);
  if (identifierMatch === "exact") reasons.push("strong identifier exact");
  if (identifierMatch === "conflict") conflicts.push("strong identifier conflict");

  const modelNameMatch = modelNameScore(query.modelGuess, candidate);
  if (modelNameMatch !== null && modelNameMatch >= 0.75) reasons.push("model name agreement");
  const colorwayMatch = colorScore(query.primaryColor, candidate.color ?? candidate.productName);
  if (colorwayMatch !== null && colorwayMatch >= 0.75) reasons.push("colorway agreement");
  else if (colorwayMatch === 0 && query.primaryColor && candidate.color) conflicts.push("colorway conflict");

  const logoTextMatch = logoScore(query.visibleText, candidateText);
  if (logoTextMatch !== null && logoTextMatch >= 0.75) reasons.push("visible text agreement");
  const visualScore = candidate.visualSiglipScore ?? candidate.visualScore ?? null;
  const sourceAgreementScore = clamp((candidate.sourceAgreementCount ?? candidate.sourceProviders?.length ?? 1) / 3);
  const modelScore = modelCodeMatch === "exact" ? 1 : modelNameMatch ?? 0;
  const identifierScore = identifierMatch === "exact" ? 1 : identifierMatch === "conflict" ? 0 : 0;
  const finalIdentityScore = round(
    (visualScore ?? 0) * FINAL_IDENTITY_WEIGHTS.visualSiglip +
    brandMatch * FINAL_IDENTITY_WEIGHTS.brand +
    classMatch * FINAL_IDENTITY_WEIGHTS.canonicalClass +
    modelScore * FINAL_IDENTITY_WEIGHTS.model +
    identifierScore * FINAL_IDENTITY_WEIGHTS.identifier +
    (logoTextMatch ?? 0) * FINAL_IDENTITY_WEIGHTS.logo +
    (colorwayMatch ?? 0) * FINAL_IDENTITY_WEIGHTS.colorway +
    sourceAgreementScore * FINAL_IDENTITY_WEIGHTS.sourceAgreement
  );
  const hasStrongConflict = conflicts.some((value) => value === "model code conflict" || value === "strong identifier conflict");
  const metadataSupport = brandMatch >= 0.65 && classMatch >= 0.65;
  const identityStatus: IdentityStatus = hasStrongConflict
    ? "CONFLICT"
    : (identifierMatch === "exact" || (modelCodeMatch === "exact" && metadataSupport && (visualScore ?? 0) >= VISUAL_RERANK_POLICY.verifiedVisualMin && finalIdentityScore >= VISUAL_RERANK_POLICY.verifiedFinalMin))
      ? "VERIFIED"
      : metadataSupport && (visualScore ?? 0) >= VISUAL_RERANK_POLICY.likelyVisualMin && finalIdentityScore >= VISUAL_RERANK_POLICY.likelyFinalMin
        ? "LIKELY"
        : finalIdentityScore >= 0.35 ? "POSSIBLE" : "UNVERIFIED";
  const variantExactness = !hasStrongConflict && (colorwayMatch === null || colorwayMatch >= 0.75) && (modelCodeMatch !== "conflict") && (identifierMatch !== "conflict");
  return {
    brandMatch: round(brandMatch),
    classMatch: round(classMatch),
    colorwayMatch: colorwayMatch === null ? null : round(colorwayMatch),
    modelNameMatch: modelNameMatch === null ? null : round(modelNameMatch),
    modelCodeMatch,
    identifierMatch,
    logoTextMatch: logoTextMatch === null ? null : round(logoTextMatch),
    visualScore: visualScore === null ? null : round(visualScore),
    sourceAgreementScore: round(sourceAgreementScore),
    conflicts: [...new Set(conflicts)],
    reasons: [...new Set(reasons)],
    finalIdentityScore,
    identityStatus,
    variantExactness,
  };
}

function strongCodeMatch(query: ProductDiscoveryQuery, candidate: WebCandidate): EvidenceMatch {
  const expected = [...(query.modelIdentifiers ?? []), query.modelGuess ?? ""].map(normalize).filter(Boolean);
  if (expected.length === 0) return "unknown";
  const actual = [candidate.modelCode, candidate.sku].map((value) => normalize(value ?? "")).filter(Boolean);
  if (actual.some((value) => expected.includes(value))) return "exact";
  if (actual.length > 0) return "conflict";
  return "unknown";
}

function identifierMatchFor(query: ProductDiscoveryQuery, candidate: WebCandidate): EvidenceMatch {
  const expected = query.modelIdentifiers.map(normalize).filter(Boolean);
  const actual = [candidate.gtin, candidate.ean, candidate.upc, candidate.sku, ...(candidate.identifiers ?? []).map((item) => item.value)].filter((value): value is string => Boolean(value)).map(normalize).filter(Boolean);
  if (expected.length === 0) return "unknown";
  if (actual.some((value) => expected.includes(value))) return "exact";
  if (actual.length > 0) return "conflict";
  return "unknown";
}

function modelNameScore(expected: string | null, candidate: WebCandidate): number | null {
  if (!expected) return null;
  const value = normalize([candidate.modelName, candidate.productName].join(" "));
  return value.includes(normalize(expected)) ? 1 : 0;
}

function classScore(expected: string, actual: string): number {
  const left = normalize(expected);
  const right = normalize(actual);
  if (!left || !right) return 0;
  if (right.includes(left) || left.includes(right)) return 1;
  const family = (value: string) => value.includes("shoe") || value.includes("sneaker") ? "shoe" : value.includes("shirt") || value.includes("blouse") ? "shirt" : value.includes("bag") ? "bag" : value;
  return family(left) === family(right) ? 0.75 : 0;
}

function colorScore(expected: string | null, actual: string): number | null {
  if (!expected) return null;
  const left = colorFamily(expected);
  const right = colorFamily(actual);
  if (!left || !right) return null;
  return left === right ? 1 : 0;
}

function colorFamily(value: string): string | null {
  const text = normalize(value);
  const groups = [["black", "블랙", "검정"], ["white", "화이트", "흰색"], ["blue", "블루", "파랑", "skyblue", "스카이블루", "하늘색"], ["navy", "네이비"], ["gray", "grey", "그레이", "회색"], ["red", "레드", "빨강"], ["brown", "브라운", "갈색"]];
  return groups.find((group) => group.some((item) => text.includes(normalize(item))))?.[0] ?? null;
}

function logoScore(expected: readonly string[], actual: string): number | null {
  if (expected.length === 0) return null;
  const matches = expected.filter((item) => actual.includes(normalize(item))).length;
  return matches / expected.length;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function clamp(value: number): number { return Math.min(1, Math.max(0, value)); }
function round(value: number): number { return Math.round(clamp(value) * 1000) / 1000; }
