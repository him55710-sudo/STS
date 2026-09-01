import { buildTrackedOfferOutboundPath, type OutboundContext } from "../affiliate/outbound-url";
import type { MediaObjectTag, SocialMediaAsset, SocialRights, SocialSourceRecord } from "../types";
import { resolvePurchaseCtaDecision, type PurchaseCtaDecision } from "./cta-policy";
import type { CommerceOffer, IdentityEvidence, MatchState } from "./types";

type NormalizedGeometry = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

type SocialTagGateInput = {
  readonly asset: SocialMediaAsset;
  readonly tag: MediaObjectTag;
  readonly rights: SocialRights;
  readonly sourceRecord: SocialSourceRecord;
  readonly offer: CommerceOffer | null;
  readonly context?: OutboundContext;
};

export type SocialTagGateResult = {
  readonly assetId: string;
  readonly tagId: string;
  readonly label: string;
  readonly geometry: NormalizedGeometry;
  readonly confidence: number;
  readonly matchState: MatchState;
  readonly evidence: readonly IdentityEvidence[];
  readonly purchaseEligible: boolean;
  readonly destination: string | null;
  readonly cta: PurchaseCtaDecision;
  readonly reason: string;
  readonly offerId: string | null;
  readonly canonicalProductId: string | null;
};

export function resolveSocialTagGate(input: SocialTagGateInput): SocialTagGateResult {
  const sourceDecision = resolveSocialSourceEligibility(input);
  const offerCta = resolvePurchaseCtaDecision(input.offer);
  const cta: PurchaseCtaDecision = sourceDecision.eligible ? offerCta : {
    kind: "review_only",
    reason: sourceDecision.reason,
  };
  const purchaseEligible = sourceDecision.eligible && cta.kind === "purchase";
  return {
    assetId: input.asset.id,
    tagId: input.tag.id,
    label: input.tag.label,
    geometry: {
      x: input.tag.x,
      y: input.tag.y,
      w: input.tag.w,
      h: input.tag.h,
    },
    confidence: input.tag.confidence,
    matchState: input.offer?.matchState ?? "unverified",
    evidence: input.offer?.evidence ?? [],
    purchaseEligible,
    destination: purchaseEligible && input.offer ? buildTrackedOfferOutboundPath(input.offer.id, input.context) : null,
    cta,
    reason: cta.reason,
    offerId: input.offer?.id ?? null,
    canonicalProductId: input.offer?.canonicalProductId ?? null,
  };
}

type SourceEligibilityDecision = {
  readonly eligible: boolean;
  readonly reason: string;
};

function resolveSocialSourceEligibility(input: SocialTagGateInput): SourceEligibilityDecision {
  if (input.tag.ownerAssetId !== input.asset.id) {
    return { eligible: false, reason: "tag is not owned by the resolved media asset" };
  }
  if (!hasNormalizedGeometry(input.tag)) {
    return { eligible: false, reason: "tag geometry is not normalized to its media asset" };
  }
  if (!input.rights.canDisplay) {
    return { eligible: false, reason: "media rights do not permit display" };
  }
  if (input.rights.status !== "approved") {
    return { eligible: false, reason: `media rights are ${input.rights.status}` };
  }
  if (isExpired(input.rights.expiresAt)) {
    return { eligible: false, reason: "media rights are expired" };
  }
  if (!input.rights.canUseForCommerceMatching) {
    return { eligible: false, reason: "rights.canUseForCommerceMatching is required" };
  }
  if (isDisplayOnlySource(input)) {
    return { eligible: false, reason: "display-only social sources cannot render purchase CTAs" };
  }
  return { eligible: true, reason: "social media rights permit commerce matching" };
}

function hasNormalizedGeometry(tag: MediaObjectTag): boolean {
  return isNormalizedCoordinate(tag.x)
    && isNormalizedCoordinate(tag.y)
    && isNormalizedCoordinate(tag.w)
    && isNormalizedCoordinate(tag.h)
    && tag.x + tag.w <= 1
    && tag.y + tag.h <= 1;
}

function isNormalizedCoordinate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isDisplayOnlySource(input: SocialTagGateInput): boolean {
  return input.sourceRecord.kind === "official_embed"
    || input.sourceRecord.kind === "demo_seed"
    || input.rights.kind === "official_embed"
    || input.rights.kind === "demo";
}

function isExpired(value: string | null): boolean {
  if (!value) return false;
  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}
