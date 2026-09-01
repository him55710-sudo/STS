import { resolveCandidateMatch } from "./identity-resolver";
import type {
  CanonicalProduct,
  IdentityEvidence,
  MatchState,
  ProductIdentifier,
} from "./types";

type GateCandidate = {
  readonly id: string;
  readonly brand: string | null;
  readonly productName: string;
  readonly category: string | null;
  readonly color: string | null;
  readonly detailUrl: string | null;
  readonly detailPageVerified: boolean;
  readonly identifiers?: readonly ProductIdentifier[];
  readonly volume?: string | null;
  readonly visualScore?: number;
  readonly visualConflicts?: readonly string[];
  readonly affiliate?: boolean;
  readonly purchaseEligible?: boolean;
  readonly matchState?: MatchState;
};

type CandidateGateInput<TCandidate extends GateCandidate> = {
  readonly canonical: CanonicalProduct;
  readonly candidates: readonly TCandidate[];
};

type GatedCandidate<TCandidate extends GateCandidate> = TCandidate & {
  readonly matchState: MatchState;
  readonly identityScore: number;
  readonly matchReason: readonly string[];
  readonly verificationEvidence: readonly IdentityEvidence[];
  readonly purchaseEligible: boolean;
};

export function gateCommerceCandidates<TCandidate extends GateCandidate>(
  input: CandidateGateInput<TCandidate>
): readonly GatedCandidate<TCandidate>[] {
  return input.candidates.flatMap((candidate) => {
    const decision = resolveCandidateMatch({
      canonical: input.canonical,
      title: candidate.productName,
      brand: candidate.brand,
      category: candidate.category,
      color: candidate.color,
      detailUrl: candidate.detailUrl,
      detailPageVerified: candidate.detailPageVerified,
      imageSimilarity: candidate.visualScore ?? 0,
      identifiers: candidate.identifiers ?? [],
      volume: candidate.volume,
    });
    const visualConflicts = candidate.visualConflicts ?? [];
    const hasConflict = decision.evidence.some((item) => item.signal === "conflict") || visualConflicts.length > 0;
    if (hasConflict) return [];

    const hasPersistedCanonicalIdentity = input.canonical.sourceIdentity !== null;
    const matchState = hasPersistedCanonicalIdentity
      ? decision.matchState
      : decision.evidence.length > 0
        ? "review"
        : "unverified";
    const purchaseEligible = hasPersistedCanonicalIdentity
      && candidate.affiliate === true
      && candidate.purchaseEligible === true
      && matchState === "exact"
      && candidate.detailPageVerified
      && candidate.detailUrl !== null;

    return [{
      ...candidate,
      matchState,
      identityScore: decision.identityScore,
      matchReason: decision.reasons,
      verificationEvidence: decision.evidence,
      purchaseEligible,
    }];
  });
}
