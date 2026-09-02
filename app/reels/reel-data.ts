import { buildTrackedOfferOutboundPath } from "@/lib/affiliate/outbound-url";
import { productById } from "@/lib/catalog";
import { getCanonicalProductForLegacyId, getCommerceOffersForCanonicalId } from "@/lib/commerce/canonical-repository";
import { resolvePurchaseCtaDecision } from "@/lib/commerce/cta-policy";
import { rankCommerceCandidates } from "@/lib/commerce/ranker";
import { getRepositorySeedRecords } from "@/lib/stories";
import type { MediaObjectTag, SocialMediaAsset } from "@/lib/types";

export type ReelItem = {
  readonly id: string;
  readonly creatorId: string;
  readonly caption: string;
  readonly title: string;
  readonly media: SocialMediaAsset;
  readonly objects: readonly MediaObjectTag[];
  readonly likes: number;
  readonly sourceLabel: string;
  readonly disclosure: string;
  readonly attribution: string;
  readonly rights: string;
};

type ReelPurchaseTarget = {
  readonly href: string;
  readonly productName: string;
};

export function getExactReelPurchaseTarget(reel: ReelItem): ReelPurchaseTarget | null {
  const exactTag = reel.objects.find((object) => object.exactness === "exact" && object.productId !== null);
  if (!exactTag?.productId) return null;

  const product = productById(exactTag.productId);
  const canonical = getCanonicalProductForLegacyId(exactTag.productId);
  if (!product || !canonical) return null;

  const offer = rankCommerceCandidates(getCommerceOffersForCanonicalId(canonical.id))[0] ?? null;
  const purchaseDecision = resolvePurchaseCtaDecision(offer);
  if (purchaseDecision.kind !== "purchase" || !offer || offer.providerProductId !== product.id) return null;

  return {
    href: buildTrackedOfferOutboundPath(offer.id, { postId: reel.id, objectId: exactTag.id, creatorId: reel.creatorId }),
    productName: product.name,
  };
}

function mediaForRecord(record: ReturnType<typeof getRepositorySeedRecords>[number]): SocialMediaAsset {
  const asset = record.media.assets[0];
  if (!asset) throw new Error(`Repository reel ${record.id} has no media asset.`);
  return {
    id: asset.id,
    order: asset.order,
    kind: asset.kind,
    url: asset.url,
    dimensions: asset.dimensions,
    poster: asset.poster ?? { url: asset.url, dimensions: asset.dimensions },
    durationMs: asset.durationMs,
    manifest: null,
    objectTags: objectTagsForAsset(asset.id, record.tags),
  };
}

function objectTagsForAsset(assetId: string, tags: readonly string[]): readonly MediaObjectTag[] {
  return tags.slice(0, 4).map((tag, index) => ({
    id: `${assetId}-reel-tag-${index + 1}`,
    ownerAssetId: assetId,
    label: tag.replaceAll("-", " "),
    x: 0.14 + index * 0.15,
    y: 0.2 + index * 0.09,
    w: 0.18,
    h: 0.12,
    productId: null,
    exactness: "unverified",
    confidence: 0.6,
  }));
}

function buildRepositoryReels(): readonly ReelItem[] {
  return getRepositorySeedRecords()
    .filter((record) => record.media.assets[0]?.kind === "image")
    .slice(0, 6)
    .map((record) => {
      const media = mediaForRecord(record);
      return {
        id: `reel-${record.id}`,
        creatorId: record.creator.id,
        caption: record.caption,
        title: `${record.category} repository reel`,
        media,
        objects: media.objectTags,
        likes: record.engagement.likes,
        sourceLabel: "Repository media",
        disclosure: "Demo fixture",
        attribution: `${record.source.provider} · ${record.source.identity}`,
        rights: record.rights.evidence,
      };
    });
}

export const REELS = buildRepositoryReels();
