import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin/authorize";
import {
  SOCIAL_ADMIN_ACTION_VALUES,
  buildSocialAdminDiagnostics,
  resolveSocialAdminAction,
  type SocialAdminAction,
  type SocialAdminDiagnostics,
  type SocialAdminDiagnosticsInput,
  type SocialAdminReviewItem,
} from "@/lib/admin/social-observability";

export const maxDuration = 10;

const actionRequestSchema = z.object({
  action: z.enum(SOCIAL_ADMIN_ACTION_VALUES),
  postId: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.ok) return authorization.response;

  const now = new Date();
  const diagnostics = buildSocialAdminDiagnostics(localSocialDiagnosticsInput(now), now);
  return NextResponse.json(diagnostics, { status: 200, headers: noStoreHeaders() });
}

export async function POST(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.ok) return authorization.response;

  const parsed = actionRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid-admin-action" }, { status: 400, headers: noStoreHeaders() });
  }

  const now = new Date();
  const diagnostics = buildSocialAdminDiagnostics(localSocialDiagnosticsInput(now), now);
  const item = diagnostics.reviewItems.find((candidate) => candidate.id === parsed.data.postId);
  if (!item) {
    return NextResponse.json({ error: "review-item-not-found" }, { status: 404, headers: noStoreHeaders() });
  }

  const result = resolveSocialAdminAction({
    item,
    action: parsed.data.action,
    actorId: authorization.userId ?? "local-admin",
    occurredAt: now.toISOString(),
  });

  return NextResponse.json(result, { status: 200, headers: noStoreHeaders() });
}

type Authorized =
  | { readonly ok: true; readonly userId: string | null }
  | { readonly ok: false; readonly response: NextResponse };

async function authorize(request: NextRequest): Promise<Authorized> {
  const authorization = await authorizeAdminRequest(request, {
    localAdminToken: process.env.STS_ADMIN_TOKEN?.trim(),
    production: process.env.NODE_ENV === "production",
  });

  if (authorization.ok) {
    return { ok: true, userId: authorization.userId };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: authorization.reason }, { status: authorization.status, headers: noStoreHeaders() }),
  };
}

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function localSocialDiagnosticsInput(now: Date): SocialAdminDiagnosticsInput {
  return {
    fetchedAt: now.toISOString(),
    sync: {
      source: "local-social-fixture",
      checkedRows: 7,
      acceptedRows: 4,
      quarantinedRows: 2,
      lastSyncedAt: new Date(now.getTime() - 90_000).toISOString(),
      providerLatencyMs: 132,
    },
    items: [
      {
        id: "post-pending-rights",
        creatorId: "creator-fixture-1",
        title: "Pending licensed jacket",
        visibility: "public",
        publishState: "published",
        displayState: "pending",
        publishedAt: new Date(now.getTime() - 180_000).toISOString(),
        expiresAt: null,
        disclosure: "affiliate",
        source: {
          kind: "licensed_editorial",
          provider: "fixture-partner",
          canonicalUrl: "https://publisher.example.test/jacket",
          externalId: "fixture-jacket-1",
          verifiedAt: new Date(now.getTime() - 120_000).toISOString(),
          metadata: {
            providerToken: "redacted-fixture-token",
            rawPayload: { ignored: true },
          },
        },
        rights: {
          id: "rights-fixture-1",
          status: "pending",
          licenseScope: "licensed",
          evidenceUrl: "https://publisher.example.test/licenses/jacket",
          note: "fixture note hidden from diagnostics",
          territories: ["KR", "US"],
          expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          takedownAt: null,
          canDisplay: false,
          canEmbed: false,
          canTag: false,
          canUseForCommerceMatching: false,
          canRedistribute: true,
          reviewedAt: null,
        },
        media: [{ id: "asset-fixture-1", kind: "photo", processingState: "processing", moderationState: "pending", variantsReady: 0 }],
        tags: [{ id: "tag-fixture-1", relation: "worn", reviewState: "pending", affiliateRelation: "affiliate" }],
      },
      hiddenFixture(now, "post-expired-rights", "expired"),
      hiddenFixture(now, "post-takedown-rights", "takedown"),
    ],
  };
}

function hiddenFixture(now: Date, id: string, status: "expired" | "takedown"): SocialAdminDiagnosticsInput["items"][number] {
  const occurredAt = new Date(now.getTime() - 60_000).toISOString();
  return {
    id,
    creatorId: "creator-fixture-2",
    title: status === "expired" ? "Expired campaign" : "Takedown campaign",
    visibility: "public",
    publishState: "published",
    displayState: "approved",
    publishedAt: new Date(now.getTime() - 300_000).toISOString(),
    expiresAt: status === "expired" ? occurredAt : null,
    disclosure: status === "expired" ? "none" : "sponsored",
    source: {
      kind: "brand_feed",
      provider: "fixture-brand",
      canonicalUrl: `https://brand.example.test/${id}`,
      externalId: id,
      verifiedAt: occurredAt,
      metadata: {},
    },
    rights: {
      id: `rights-${id}`,
      status,
      licenseScope: "licensed",
      evidenceUrl: null,
      note: null,
      territories: ["worldwide"],
      expiresAt: status === "expired" ? occurredAt : null,
      takedownAt: status === "takedown" ? occurredAt : null,
      canDisplay: status !== "takedown",
      canEmbed: false,
      canTag: false,
      canUseForCommerceMatching: false,
      canRedistribute: false,
      reviewedAt: occurredAt,
    },
    media: [{ id: `asset-${id}`, kind: "photo", processingState: "ready", moderationState: "approved", variantsReady: 1 }],
    tags: [],
  };
}

export type { SocialAdminAction, SocialAdminDiagnostics, SocialAdminReviewItem };
