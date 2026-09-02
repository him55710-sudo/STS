import "server-only";

import type {
  SocialDisplayState,
  SocialProcessingState,
  SocialPublishState,
  SocialRightsStatus,
  SocialSourceKind,
  SocialVisibility,
} from "@/lib/social-repository";

export const SOCIAL_ADMIN_ACTION_VALUES = [
  "approve_display",
  "approve_tagging",
  "reject_rights",
  "mark_takedown",
  "expire_rights",
  "request_recheck",
] as const;

export type SocialAdminAction = (typeof SOCIAL_ADMIN_ACTION_VALUES)[number];
export type SocialDisclosure = "none" | "affiliate" | "sponsored" | "partner" | "official" | "editorial" | "demo";
export type SocialAdminSyncInput = { readonly source: string; readonly checkedRows: number; readonly acceptedRows: number; readonly quarantinedRows: number; readonly lastSyncedAt: string | null; readonly providerLatencyMs: number };
export type SocialAdminSource = { readonly kind: SocialSourceKind; readonly provider: string; readonly canonicalUrl: string | null; readonly externalId: string | null; readonly verifiedAt: string | null; readonly metadata: Record<string, unknown> };
export type SocialAdminRights = { readonly id: string; readonly status: SocialRightsStatus; readonly licenseScope: string; readonly evidenceUrl: string | null; readonly note: string | null; readonly territories: readonly string[]; readonly expiresAt: string | null; readonly takedownAt: string | null; readonly canDisplay: boolean; readonly canEmbed: boolean; readonly canTag: boolean; readonly canUseForCommerceMatching: boolean; readonly canRedistribute: boolean; readonly reviewedAt: string | null };
export type SocialAdminMedia = { readonly id: string; readonly kind: "photo" | "video" | "embed" | "poster" | "thumbnail"; readonly processingState: SocialProcessingState; readonly moderationState: "pending" | "approved" | "blocked"; readonly variantsReady: number };
export type SocialAdminTag = { readonly id: string; readonly relation: string; readonly reviewState: "pending" | "approved" | "blocked"; readonly affiliateRelation: "none" | "affiliate" | "sponsored" | "partner" };
export type SocialAdminSourceItem = { readonly id: string; readonly creatorId: string; readonly title: string | null; readonly visibility: SocialVisibility; readonly publishState: SocialPublishState; readonly displayState: SocialDisplayState; readonly publishedAt: string | null; readonly expiresAt: string | null; readonly disclosure: SocialDisclosure; readonly source: SocialAdminSource | null; readonly rights: SocialAdminRights | null; readonly media: readonly SocialAdminMedia[]; readonly tags: readonly SocialAdminTag[] };
export type SocialAdminDiagnosticsInput = { readonly fetchedAt: string; readonly sync: SocialAdminSyncInput; readonly items: readonly SocialAdminSourceItem[] };
export type SocialAdminCounts = { readonly pendingRights: number; readonly pendingMedia: number; readonly pendingModeration: number; readonly pendingTags: number; readonly takedowns: number; readonly expiringRights: number; readonly hiddenForExpiryOrTakedown: number; readonly quarantinedRows: number; readonly syncedRows: number };
export type RedactedSocialAdminRights = Omit<SocialAdminRights, "note">;
export type SocialAdminReviewItem = { readonly id: string; readonly title: string | null; readonly creatorId: string; readonly sourceUrl: string | null; readonly sourceKind: SocialSourceKind | null; readonly sourceProvider: string | null; readonly externalId: string | null; readonly affiliateRelation: SocialDisclosure; readonly lastVerifiedAt: string | null; readonly publicVerified: true | null; readonly visibility: SocialVisibility; readonly publishState: SocialPublishState; readonly displayState: SocialDisplayState; readonly publishedAt: string | null; readonly expiresAt: string | null; readonly rights: RedactedSocialAdminRights; readonly media: readonly SocialAdminMedia[]; readonly tags: readonly SocialAdminTag[]; readonly actions: readonly SocialAdminAction[] };
export type SocialAdminAuditEvent = { readonly action: SocialAdminAction | "hide_from_public"; readonly postId: string; readonly actorId?: string; readonly reason: "admin_review" | "expired" | "takedown"; readonly occurredAt: string };
export type SocialAdminDiagnostics = { readonly fetchedAt: string; readonly counts: SocialAdminCounts; readonly reviewItems: readonly SocialAdminReviewItem[]; readonly auditEvents: readonly SocialAdminAuditEvent[]; readonly redactedDiagnostics: { readonly source: string; readonly providerLatencyMs: number; readonly metadataKeysRetained: readonly string[] } };
export type SocialAdminActionInput = { readonly item: SocialAdminReviewItem; readonly action: SocialAdminAction; readonly actorId: string; readonly occurredAt: string };

export function buildSocialAdminDiagnostics(input: SocialAdminDiagnosticsInput, now: Date): SocialAdminDiagnostics {
  const reviewItems = input.items.map((item) => buildReviewItem(item, now));
  return {
    fetchedAt: input.fetchedAt,
    counts: countsFor(reviewItems, input.sync, now),
    reviewItems,
    auditEvents: reviewItems.filter((item) => isHiddenForExpiryOrTakedown(item, now)).map((item) => ({
      action: "hide_from_public",
      postId: item.id,
      reason: isTakenDown(item) ? "takedown" : "expired",
      occurredAt: now.toISOString(),
    })),
    redactedDiagnostics: {
      source: input.sync.source,
      providerLatencyMs: input.sync.providerLatencyMs,
      metadataKeysRetained: ["canonicalUrl", "externalId", "verifiedAt"],
    },
  };
}

export function isPubliclyVisibleAfterAdminReview(item: SocialAdminReviewItem, now: Date): boolean {
  return (
    item.visibility === "public" &&
    item.publishState === "published" &&
    item.displayState === "approved" &&
    item.publishedAt !== null &&
    item.rights.status === "approved" &&
    item.rights.canDisplay &&
    item.rights.takedownAt === null &&
    isActiveUntil(item.expiresAt, now) &&
    isActiveUntil(item.rights.expiresAt, now)
  );
}

export function resolveSocialAdminAction(input: SocialAdminActionInput): {
  readonly item: SocialAdminReviewItem;
  readonly auditEvent: SocialAdminAuditEvent;
} {
  const rights = resolveRightsAction(input.item.rights, input.action, input.occurredAt);
  const item = {
    ...input.item,
    displayState: input.action === "approve_display" ? "approved" : input.item.displayState,
    publicVerified: input.action === "approve_display" ? true : input.item.publicVerified,
    rights,
    actions: actionsFor({ ...input.item, rights }, new Date(input.occurredAt)),
  };
  return {
    item,
    auditEvent: {
      action: input.action,
      postId: input.item.id,
      actorId: input.actorId,
      reason: input.action === "mark_takedown" ? "takedown" : "admin_review",
      occurredAt: input.occurredAt,
    },
  };
}

function countsFor(items: readonly SocialAdminReviewItem[], sync: SocialAdminSyncInput, now: Date): SocialAdminCounts {
  return {
    pendingRights: items.filter((item) => item.rights.status === "pending").length,
    pendingMedia: items.filter(hasPendingMedia).length,
    pendingModeration: items.filter(hasPendingModeration).length,
    pendingTags: items.filter(hasPendingTag).length,
    takedowns: items.filter(isTakenDown).length,
    expiringRights: items.filter((item) => isExpiringSoon(item.rights.expiresAt, now)).length,
    hiddenForExpiryOrTakedown: items.filter((item) => isHiddenForExpiryOrTakedown(item, now)).length,
    quarantinedRows: sync.quarantinedRows,
    syncedRows: sync.acceptedRows,
  };
}

function buildReviewItem(item: SocialAdminSourceItem, now: Date): SocialAdminReviewItem {
  const rights = item.rights ?? pendingRights(item.id);
  const partial = redactedReviewItem(item, rights, isDisplayVerified(item, rights, now) ? true : null);
  return { ...partial, actions: actionsFor(partial, now) };
}

function redactedReviewItem(
  item: SocialAdminSourceItem,
  rights: SocialAdminRights,
  publicVerified: true | null,
): SocialAdminReviewItem {
  return {
    id: item.id,
    title: item.title,
    creatorId: item.creatorId,
    sourceUrl: item.source?.canonicalUrl ?? item.rights?.evidenceUrl ?? null,
    sourceKind: item.source?.kind ?? null,
    sourceProvider: item.source?.provider ?? null,
    externalId: item.source?.externalId ?? null,
    affiliateRelation: item.disclosure,
    lastVerifiedAt: item.source?.verifiedAt ?? rights.reviewedAt,
    publicVerified,
    visibility: item.visibility,
    publishState: item.publishState,
    displayState: item.displayState,
    publishedAt: item.publishedAt,
    expiresAt: item.expiresAt,
    rights: redactedRights(rights),
    media: item.media,
    tags: item.tags,
    actions: [],
  };
}

function pendingRights(postId: string): SocialAdminRights {
  return {
    id: `pending:${postId}`,
    status: "pending",
    licenseScope: "user_owned",
    evidenceUrl: null,
    note: null,
    territories: [],
    expiresAt: null,
    takedownAt: null,
    canDisplay: false,
    canEmbed: false,
    canTag: false,
    canUseForCommerceMatching: false,
    canRedistribute: false,
    reviewedAt: null,
  };
}

function redactedRights(rights: SocialAdminRights): RedactedSocialAdminRights {
  return {
    id: rights.id,
    status: rights.status,
    licenseScope: rights.licenseScope,
    evidenceUrl: rights.evidenceUrl,
    territories: rights.territories,
    expiresAt: rights.expiresAt,
    takedownAt: rights.takedownAt,
    canDisplay: rights.canDisplay,
    canEmbed: rights.canEmbed,
    canTag: rights.canTag,
    canUseForCommerceMatching: rights.canUseForCommerceMatching,
    canRedistribute: rights.canRedistribute,
    reviewedAt: rights.reviewedAt,
  };
}

function actionsFor(item: SocialAdminReviewItem, now: Date): readonly SocialAdminAction[] {
  const actions: SocialAdminAction[] = ["request_recheck"];
  if (item.rights.status === "pending") actions.unshift("reject_rights");
  if (item.rights.status === "pending" || !item.rights.canDisplay) actions.unshift("approve_display");
  if (hasPendingTag(item) && !item.rights.canTag) actions.splice(1, 0, "approve_tagging");
  if (!isTakenDown(item)) actions.push("mark_takedown");
  if (isActiveUntil(item.rights.expiresAt, now)) actions.push("expire_rights");
  return actions;
}

function resolveRightsAction(
  rights: RedactedSocialAdminRights,
  action: SocialAdminAction,
  occurredAt: string,
): RedactedSocialAdminRights {
  switch (action) {
    case "approve_display":
      return { ...rights, status: "approved", canDisplay: true, reviewedAt: occurredAt };
    case "approve_tagging":
      return { ...rights, canTag: true, reviewedAt: occurredAt };
    case "reject_rights":
      return { ...rights, status: "rejected", canDisplay: false, canTag: false, reviewedAt: occurredAt };
    case "mark_takedown":
      return { ...rights, status: "takedown", canDisplay: false, takedownAt: occurredAt, reviewedAt: occurredAt };
    case "expire_rights":
      return { ...rights, status: "expired", canDisplay: false, expiresAt: occurredAt, reviewedAt: occurredAt };
    case "request_recheck":
      return { ...rights, reviewedAt: occurredAt };
    default:
      return assertNever(action);
  }
}

function hasPendingMedia(item: SocialAdminReviewItem): boolean {
  return item.media.some((media) => media.processingState === "uploaded" || media.processingState === "processing");
}

function hasPendingModeration(item: SocialAdminReviewItem): boolean {
  return item.media.some((media) => media.moderationState === "pending");
}

function hasPendingTag(item: SocialAdminReviewItem): boolean {
  return item.tags.some((tag) => tag.reviewState === "pending");
}

function isTakenDown(item: SocialAdminReviewItem): boolean {
  return item.rights.status === "takedown" || item.rights.takedownAt !== null;
}

function isHiddenForExpiryOrTakedown(item: SocialAdminReviewItem, now: Date): boolean {
  return isTakenDown(item) || !isActiveUntil(item.expiresAt, now) || !isActiveUntil(item.rights.expiresAt, now);
}

function isExpiringSoon(timestamp: string | null, now: Date): boolean {
  if (timestamp === null) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = Date.parse(timestamp);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime() && expiresAt <= now.getTime() + sevenDaysMs;
}

function isActiveUntil(timestamp: string | null, now: Date): boolean {
  return timestamp === null || Date.parse(timestamp) > now.getTime();
}

function isDisplayVerified(item: SocialAdminSourceItem, rights: SocialAdminRights, now: Date): boolean {
  return (
    item.displayState === "approved" &&
    rights.status === "approved" &&
    rights.canDisplay &&
    rights.takedownAt === null &&
    isActiveUntil(item.expiresAt, now) &&
    isActiveUntil(rights.expiresAt, now)
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled social admin action: ${JSON.stringify(value)}`);
}
