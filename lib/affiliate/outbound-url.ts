import { getCanonicalProductForLegacyId, getCommerceOffersForCanonicalId } from "../commerce/canonical-repository";
import { rankCommerceCandidates } from "../commerce/ranker";

export interface OutboundContext {
  readonly postId?: string;
  readonly objectId?: string;
  readonly creatorId?: string;
}

export function buildTrackedOutboundPath(productId: string, context: OutboundContext = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return `/go/${encodeURIComponent(productId)}${suffix ? `?${suffix}` : ""}`;
}

export function buildTrackedOfferOutboundPath(offerId: string, context: OutboundContext = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return `/go/offer/${encodeURIComponent(offerId)}${suffix ? `?${suffix}` : ""}`;
}

export function buildTrackedProductOfferPath(productId: string, context: OutboundContext = {}): string | null {
  const canonical = getCanonicalProductForLegacyId(productId);
  if (!canonical) return null;

  const offer = rankCommerceCandidates(getCommerceOffersForCanonicalId(canonical.id))[0];
  return offer ? buildTrackedOfferOutboundPath(offer.id, context) : null;
}

export function buildTrackedCustomOutboundPath(
  productId: string,
  destinationUrl: string,
  context: OutboundContext = {}
): string {
  const query = new URLSearchParams({ destinationUrl });
  for (const [key, value] of Object.entries(context)) {
    if (value) query.set(key, value);
  }
  return `/go/${encodeURIComponent(productId)}?${query.toString()}`;
}
