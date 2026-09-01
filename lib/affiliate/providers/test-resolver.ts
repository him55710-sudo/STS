import type { CommerceOffer } from "../../commerce/types";

const FIXTURE_HOST = "127.0.0.1:3100";

export function resolveTestAffiliateUrl(offer: CommerceOffer): string | null {
  if (process.env.CATALOG_E2E_FIXTURES !== "1") return null;
  if (offer.provider !== "direct") return null;
  if (!offer.id.startsWith("offer:catalog:plw-")) return null;
  if (offer.matchState !== "exact") return null;
  if (!offer.detailPageVerified || !offer.detailUrl) return null;

  const url = new URL(offer.detailUrl);
  return `http://${FIXTURE_HOST}/go/test-affiliate?offerId=${encodeURIComponent(offer.id)}&destination=${encodeURIComponent(
    url.toString()
  )}`;
}
