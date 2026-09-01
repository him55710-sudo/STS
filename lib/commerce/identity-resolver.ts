import type { Category } from "../types";
import type { CanonicalProduct, IdentityEvidence, MatchState, ProductIdentifier } from "./types";

export type CandidateIdentityInput = {
  readonly canonical: CanonicalProduct;
  readonly title: string;
  readonly brand: string | null;
  readonly category: string | null;
  readonly color: string | null;
  readonly detailUrl: string | null;
  readonly detailPageVerified: boolean;
  readonly imageSimilarity: number;
  readonly identifiers: readonly ProductIdentifier[];
  readonly volume?: string | null;
};

export type CandidateMatchDecision = {
  readonly matchState: MatchState;
  readonly identityScore: number;
  readonly reasons: readonly string[];
  readonly evidence: readonly IdentityEvidence[];
};

const COLOR_GROUPS = [
  { name: "blue", values: ["blue", "skyblue", "lightblue", "블루", "하늘색", "스카이블루"] },
  { name: "gray", values: ["gray", "grey", "그레이", "회색", "차콜"] },
  { name: "black", values: ["black", "블랙", "검정"] },
  { name: "white", values: ["white", "화이트", "흰색"] },
  { name: "red", values: ["red", "레드", "빨강"] },
] as const;

const FAMILY_WORDS: Record<string, readonly string[]> = {
  shirt: ["shirt", "셔츠", "oxford", "buttondown", "top", "상의"],
  jacket: ["jacket", "blazer", "coat", "outerwear", "자켓", "재킷", "블레이저", "코트", "아우터"],
  pants: ["pants", "jeans", "trouser", "팬츠", "바지", "진"],
  dress: ["dress", "원피스"],
  shoe: ["shoe", "sneaker", "boots", "신발", "스니커즈", "부츠"],
  beauty: ["toner", "serum", "cream", "essence", "토너", "세럼", "크림", "에센스"],
};

export function resolveCandidateMatch(input: CandidateIdentityInput): CandidateMatchDecision {
  const canonicalText = compact([
    input.canonical.productName,
    input.canonical.attributes.productLine ?? "",
    ...input.canonical.aliases,
  ].join(" "));
  const candidateText = compact(`${input.brand ?? ""} ${input.title} ${input.color ?? ""} ${input.volume ?? ""}`);
  const brandMatch = Boolean(input.canonical.brand && candidateText.includes(compact(input.canonical.brand)));
  const modelMatch = canonicalText.split(" ").filter((token) => token.length >= 3).some((token) => candidateText.includes(token));
  const aliasMatch = input.canonical.aliases.some((alias) => candidateText.includes(compact(alias)));
  const colorMatch = compareColor(input.canonical.attributes.color, `${input.color ?? ""} ${input.title}`);
  const categoryConflict = hasCategoryConflict(input.canonical, `${input.title} ${input.category ?? ""}`);
  const identifierMatch = input.identifiers.some((candidate) =>
    input.canonical.identifiers.some((known) => known.kind === candidate.kind && known.value === candidate.value)
  );
  const detailMatch = input.detailPageVerified && Boolean(input.detailUrl);

  const evidence: IdentityEvidence[] = [];
  const reasons: string[] = [];
  if (identifierMatch) evidence.push({ signal: "identifier", value: "canonical identifier match", score: 1 });
  if (brandMatch) {
    evidence.push({ signal: "brand", value: input.canonical.brand ?? "brand", score: 0.9 });
    reasons.push("brand match");
  }
  if (modelMatch || aliasMatch) {
    evidence.push({ signal: "model", value: input.canonical.attributes.productLine ?? input.canonical.productName, score: 0.85 });
    reasons.push("model/product-line match");
  }
  if (colorMatch === "match") {
    evidence.push({ signal: "variant", value: input.canonical.attributes.color ?? "color", score: 0.8 });
    reasons.push("color variant match");
  }
  if (colorMatch === "conflict") {
    evidence.push({ signal: "conflict", value: "color conflict", score: 1 });
    reasons.push("color conflict");
  }
  if (categoryConflict) {
    evidence.push({ signal: "conflict", value: "product family conflict", score: 1 });
    reasons.push("category conflict");
  }
  if (input.imageSimilarity > 0) {
    evidence.push({ signal: "image", value: "candidate image comparison", score: input.imageSimilarity });
    reasons.push(`image similarity ${Math.round(input.imageSimilarity * 100)}%`);
  }
  if (detailMatch) evidence.push({ signal: "detail_page", value: input.detailUrl ?? "detail page", score: 1 });

  const identityScore = round(
    (identifierMatch ? 0.5 : 0) +
      (brandMatch ? 0.18 : 0) +
      (modelMatch || aliasMatch ? 0.17 : 0) +
      (colorMatch === "match" ? 0.05 : 0) +
      input.imageSimilarity * 0.1
  );
  const hasConflict = categoryConflict || colorMatch === "conflict";
  const exact = detailMatch && !hasConflict && (
    identifierMatch || (brandMatch && (modelMatch || aliasMatch) && input.imageSimilarity >= 0.9)
  );
  const likely = detailMatch && !hasConflict && (
    identifierMatch || brandMatch || modelMatch || aliasMatch || input.imageSimilarity >= 0.75
  );
  const matchState: MatchState = exact ? "exact" : likely ? "likely" : detailMatch ? "similar" : "unverified";

  return { matchState, identityScore, reasons, evidence };
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function compareColor(canonical: string | null, candidate: string): "match" | "conflict" | "unknown" {
  if (!canonical) return "unknown";
  const expected = colorGroup(canonical);
  const actual = colorGroup(candidate);
  if (!expected || !actual) return "unknown";
  return expected === actual ? "match" : "conflict";
}

function colorGroup(value: string): string | null {
  const normalized = compact(value);
  return COLOR_GROUPS.find((group) => group.values.some((candidate) => normalized.includes(compact(candidate))))?.name ?? null;
}

function hasCategoryConflict(canonical: CanonicalProduct, candidate: string): boolean {
  const canonicalFamily = familyOf(`${canonical.productName} ${canonical.attributes.productLine ?? ""}`, canonical.category);
  const candidateFamily = familyOf(candidate, null);
  return canonicalFamily !== null && candidateFamily !== null && canonicalFamily !== candidateFamily;
}

function familyOf(value: string, category: Category | null): string | null {
  if (category === "beauty") return "beauty";
  const normalized = compact(value);
  return Object.entries(FAMILY_WORDS).find(([, words]) => words.some((word) => normalized.includes(compact(word))))?.[0] ?? null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
