import { describe, expect, it } from "vitest";
import {
  buildSocialAdminDiagnostics,
  isPubliclyVisibleAfterAdminReview,
  resolveSocialAdminAction,
  type SocialAdminDiagnosticsInput,
} from "../../../lib/admin/social-observability";

const now = new Date("2026-09-02T10:00:00.000Z");

function diagnosticsInput(): SocialAdminDiagnosticsInput {
  return {
    fetchedAt: now.toISOString(),
    sync: {
      source: "partner-feed",
      checkedRows: 6,
      acceptedRows: 3,
      quarantinedRows: 2,
      lastSyncedAt: "2026-09-02T09:58:00.000Z",
      providerLatencyMs: 140,
    },
    items: [
      {
        id: "post-pending",
        creatorId: "creator-1",
        title: "Runway jacket review",
        visibility: "public",
        publishState: "published",
        displayState: "pending",
        publishedAt: "2026-09-02T09:00:00.000Z",
        expiresAt: null,
        disclosure: "affiliate",
        source: {
          kind: "licensed_editorial",
          provider: "lookbook-partner",
          canonicalUrl: "https://publisher.example.test/runway-jacket",
          externalId: "ext-1",
          verifiedAt: "2026-09-02T09:55:00.000Z",
          metadata: {
            providerToken: "secret-provider-token",
            rawPayload: { nested: true },
            campaign: "fall",
          },
        },
        rights: {
          id: "rights-1",
          status: "pending",
          licenseScope: "licensed",
          evidenceUrl: "https://publisher.example.test/license/runway-jacket",
          note: "creator supplied license ticket",
          territories: ["KR", "US"],
          expiresAt: "2026-09-12T00:00:00.000Z",
          takedownAt: null,
          canDisplay: false,
          canEmbed: false,
          canTag: false,
          canUseForCommerceMatching: false,
          canRedistribute: true,
          reviewedAt: null,
        },
        media: [
          { id: "asset-1", kind: "photo", processingState: "processing", moderationState: "pending", variantsReady: 0 },
        ],
        tags: [{ id: "tag-1", relation: "worn", reviewState: "pending", affiliateRelation: "affiliate" }],
      },
      {
        id: "post-takedown",
        creatorId: "creator-2",
        title: "Removed campaign",
        visibility: "public",
        publishState: "published",
        displayState: "approved",
        publishedAt: "2026-09-01T08:00:00.000Z",
        expiresAt: null,
        disclosure: "sponsored",
        source: {
          kind: "brand_feed",
          provider: "brand",
          canonicalUrl: "https://brand.example.test/removed",
          externalId: "ext-2",
          verifiedAt: null,
          metadata: {},
        },
        rights: {
          id: "rights-2",
          status: "takedown",
          licenseScope: "licensed",
          evidenceUrl: null,
          note: null,
          territories: ["worldwide"],
          expiresAt: null,
          takedownAt: "2026-09-02T08:30:00.000Z",
          canDisplay: true,
          canEmbed: false,
          canTag: true,
          canUseForCommerceMatching: false,
          canRedistribute: false,
          reviewedAt: "2026-09-02T08:35:00.000Z",
        },
        media: [{ id: "asset-2", kind: "video", processingState: "ready", moderationState: "approved", variantsReady: 2 }],
        tags: [],
      },
      {
        id: "post-expired",
        creatorId: "creator-3",
        title: "Expired story",
        visibility: "public",
        publishState: "published",
        displayState: "approved",
        publishedAt: "2026-09-01T08:00:00.000Z",
        expiresAt: "2026-09-02T08:00:00.000Z",
        disclosure: "none",
        source: null,
        rights: {
          id: "rights-3",
          status: "approved",
          licenseScope: "user_owned",
          evidenceUrl: null,
          note: null,
          territories: ["worldwide"],
          expiresAt: "2026-09-02T08:00:00.000Z",
          takedownAt: null,
          canDisplay: true,
          canEmbed: false,
          canTag: true,
          canUseForCommerceMatching: true,
          canRedistribute: false,
          reviewedAt: "2026-09-01T09:00:00.000Z",
        },
        media: [{ id: "asset-3", kind: "photo", processingState: "ready", moderationState: "approved", variantsReady: 1 }],
        tags: [],
      },
    ],
  };
}

describe("social admin diagnostics", () => {
  it("returns redacted review queues with source URLs and actionable counts", () => {
    const result = buildSocialAdminDiagnostics(diagnosticsInput(), now);

    expect(result.counts).toMatchObject({
      pendingRights: 1,
      pendingMedia: 1,
      pendingModeration: 1,
      pendingTags: 1,
      takedowns: 1,
      hiddenForExpiryOrTakedown: 2,
      quarantinedRows: 2,
      syncedRows: 3,
    });
    expect(result.reviewItems[0]).toMatchObject({
      id: "post-pending",
      sourceUrl: "https://publisher.example.test/runway-jacket",
      affiliateRelation: "affiliate",
      lastVerifiedAt: "2026-09-02T09:55:00.000Z",
      publicVerified: null,
      actions: ["approve_display", "approve_tagging", "reject_rights", "request_recheck", "mark_takedown", "expire_rights"],
    });
    expect(JSON.stringify(result)).not.toContain("secret-provider-token");
    expect(JSON.stringify(result)).not.toContain("rawPayload");
    expect(JSON.stringify(result)).not.toContain('"publicVerified":false');
  });

  it("keeps expired and takedown rows out of public visibility and writes audit reasons", () => {
    const result = buildSocialAdminDiagnostics(diagnosticsInput(), now);

    expect(isPubliclyVisibleAfterAdminReview(result.reviewItems[1], now)).toBe(false);
    expect(isPubliclyVisibleAfterAdminReview(result.reviewItems[2], now)).toBe(false);
    expect(result.auditEvents).toEqual([
      {
        action: "hide_from_public",
        postId: "post-takedown",
        reason: "takedown",
        occurredAt: now.toISOString(),
      },
      {
        action: "hide_from_public",
        postId: "post-expired",
        reason: "expired",
        occurredAt: now.toISOString(),
      },
    ]);
  });

  it("resolves admin rights actions without exposing public false verification", () => {
    const [pending] = buildSocialAdminDiagnostics(diagnosticsInput(), now).reviewItems;
    if (!pending) throw new Error("expected a pending admin review item");

    const result = resolveSocialAdminAction({
      item: pending,
      action: "approve_display",
      actorId: "admin-1",
      occurredAt: now.toISOString(),
    });

    expect(result.item.rights.status).toBe("approved");
    expect(result.item.rights.canDisplay).toBe(true);
    expect(result.item.publicVerified).toBe(true);
    expect(result.auditEvent).toMatchObject({
      action: "approve_display",
      actorId: "admin-1",
      postId: "post-pending",
    });
  });
});
