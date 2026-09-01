import { isPurchaseEligibleOffer } from "./url-policy";
import type { CommerceOffer } from "./types";

export function rankCommerceCandidates(offers: readonly CommerceOffer[]): CommerceOffer[] {
  const eligible = offers.filter(isPurchaseEligibleOffer);
  const exact = eligible.filter((offer) => offer.matchState === "exact");
  const pool = exact.length > 0
    ? [...exact, ...eligible.filter((offer) => offer.matchState === "likely")]
    : eligible.filter((offer) => offer.matchState === "likely");

  return deduplicate(pool).sort((left, right) => {
    const stateDelta = stateWeight(right.matchState) - stateWeight(left.matchState);
    if (stateDelta !== 0) return stateDelta;
    if (right.identityScore !== left.identityScore) return right.identityScore - left.identityScore;
    if (right.availability !== left.availability) return availabilityWeight(right.availability) - availabilityWeight(left.availability);
    return (right.commissionRate ?? 0) - (left.commissionRate ?? 0);
  });
}

function deduplicate(offers: readonly CommerceOffer[]): CommerceOffer[] {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = `${offer.canonicalProductId ?? "unknown"}:${offer.merchant}:${offer.detailUrl ?? offer.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stateWeight(state: CommerceOffer["matchState"]): number {
  switch (state) {
    case "exact": return 4;
    case "likely": return 3;
    case "similar": return 2;
    case "review": return 1;
    case "unverified": return 0;
    default: return assertNever(state);
  }
}

function availabilityWeight(value: CommerceOffer["availability"]): number {
  switch (value) {
    case "in_stock": return 2;
    case "unknown": return 1;
    case "out_of_stock": return 0;
    default: return assertNever(value);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected commerce variant: ${String(value)}`);
}
