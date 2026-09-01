import { affiliateNetworkForUrl, isMarketplaceDetailUrl, isTrustedOutboundUrl } from "../marketplace-links";
import type { CommerceOffer } from "./types";

export type CommerceUrlKind = "detail" | "discovery" | "unknown";
export type CommerceUrlClassification =
  | { readonly kind: "detail"; readonly url: string }
  | { readonly kind: "discovery"; readonly url: string }
  | { readonly kind: "unknown"; readonly url: string };

const discoveryPath = /\/(?:search|list|category|categor|ranking|best|event|plan)(?:\/|$)/i;
const discoveryQuery = /(?:^|&)(?:keyword|query|q|search|searchWord)=/i;
const genericDetailPath = /\/(?:product|products|goods|item|detail|dp|vp\/products|app\/goods)\/[-\w]+/i;
const approvedAffiliateHostSuffixes = ["adpick.co.kr", "linkprice.com"] as const;
const affiliateDestinationKeys = [
  "u",
  "url",
  "destination",
  "destination_url",
  "destinationUrl",
  "deeplink",
  "deep_link",
  "redirect_url",
  "location",
  "target",
  "target_url",
] as const;

export function classifyCommerceUrl(value: string): CommerceUrlClassification {
  try {
    const url = new URL(value);
    const normalized = url.toString();
    if (url.protocol !== "https:") return { kind: "unknown", url: normalized };
    if (isMarketplaceDetailUrl(normalized) || genericDetailPath.test(url.pathname)) {
      return { kind: "detail", url: normalized };
    }
    if (discoveryPath.test(url.pathname) || discoveryQuery.test(url.search.slice(1))) {
      return { kind: "discovery", url: normalized };
    }
    return { kind: "unknown", url: normalized };
  } catch {
    return { kind: "unknown", url: value };
  }
}

export function isVerifiedExactOffer(offer: CommerceOffer): boolean {
  if (!offer.canonicalProductId || !offer.sourceIdentity || !offer.detailPageVerified || !offer.detailUrl) return false;
  if (offer.offerLifecycle !== "active" || offer.matchState !== "exact") return false;
  if (offer.evidence.some((item) => item.signal === "conflict")) return false;
  if (!offer.evidence.some((item) =>
    item.signal === "identifier" ||
    item.signal === "brand" ||
    item.signal === "model" ||
    item.signal === "variant" ||
    item.signal === "image"
  )) return false;
  if (offer.verificationEvidence.length === 0) return false;
  return isTrustedOutboundUrl(offer.detailUrl) && classifyCommerceUrl(offer.detailUrl).kind === "detail";
}

export function isPurchaseEligibleOffer(offer: CommerceOffer): boolean {
  if (!isVerifiedExactOffer(offer) || !offer.affiliateUrl) return false;
  return isApprovedAffiliatePath(offer.affiliateUrl, offer.detailUrl);
}

export function isSafeAffiliateDestination(value: string): boolean {
  return isTrustedOutboundUrl(value) || classifyCommerceUrl(value).kind === "detail";
}

function isApprovedAffiliatePath(value: string, detailUrl: string | null): boolean {
  if (!detailUrl || value === detailUrl) return false;
  if (affiliateNetworkForUrl(value)) {
    return isExactEmbeddedDetailUrl(value, detailUrl);
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "sovrn.co") {
      const target = url.searchParams.get("u");
      return target !== null
        && target === detailUrl
        && isTrustedOutboundUrl(target)
        && classifyCommerceUrl(target).kind === "detail";
    }
    if (!approvedAffiliateHostSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) return false;
    return isExactEmbeddedDetailUrl(value, detailUrl);
  } catch {
    return false;
  }
}

function embeddedAffiliateDestination(url: URL): string | null {
  for (const [key, value] of url.searchParams.entries()) {
    if (affiliateDestinationKeys.some((candidate) => candidate === key) && value) return value;
  }
  return null;
}

function isExactEmbeddedDetailUrl(value: string, detailUrl: string): boolean {
  const parsed = new URL(value);
  const target = embeddedAffiliateDestination(parsed);
  return target === detailUrl
    && isTrustedOutboundUrl(target)
    && classifyCommerceUrl(target).kind === "detail";
}
