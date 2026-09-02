"use client";

import { useEffect, useMemo, useState } from "react";

type SocialAdminAction =
  | "approve_display"
  | "approve_tagging"
  | "reject_rights"
  | "mark_takedown"
  | "expire_rights"
  | "request_recheck";

type SocialAdminDiagnostics = {
  readonly fetchedAt: string;
  readonly counts: {
    readonly pendingRights: number;
    readonly pendingMedia: number;
    readonly pendingModeration: number;
    readonly pendingTags: number;
    readonly takedowns: number;
    readonly expiringRights: number;
    readonly hiddenForExpiryOrTakedown: number;
    readonly quarantinedRows: number;
    readonly syncedRows: number;
  };
  readonly reviewItems: readonly SocialAdminReviewItem[];
  readonly auditEvents: readonly {
    readonly action: string;
    readonly postId: string;
    readonly reason: string;
    readonly occurredAt: string;
  }[];
  readonly redactedDiagnostics: {
    readonly source: string;
    readonly providerLatencyMs: number;
    readonly metadataKeysRetained: readonly string[];
  };
};

type SocialAdminReviewItem = {
  readonly id: string;
  readonly title: string | null;
  readonly sourceUrl: string | null;
  readonly affiliateRelation: string;
  readonly lastVerifiedAt: string | null;
  readonly publicVerified: true | null;
  readonly displayState: string;
  readonly rights: {
    readonly status: string;
    readonly evidenceUrl: string | null;
    readonly expiresAt: string | null;
    readonly takedownAt: string | null;
    readonly canDisplay: boolean;
    readonly canTag: boolean;
    readonly canUseForCommerceMatching: boolean;
  };
  readonly media: readonly {
    readonly id: string;
    readonly kind: string;
    readonly processingState: string;
    readonly moderationState: string;
    readonly variantsReady: number;
  }[];
  readonly tags: readonly {
    readonly id: string;
    readonly relation: string;
    readonly reviewState: string;
    readonly affiliateRelation: string;
  }[];
  readonly actions: readonly SocialAdminAction[];
};

const actionLabel: Record<SocialAdminAction, string> = {
  approve_display: "Display approve",
  approve_tagging: "Tag approve",
  reject_rights: "Reject",
  mark_takedown: "Takedown",
  expire_rights: "Expire",
  request_recheck: "Recheck",
};

export function SocialAdminPanel() {
  const [token, setToken] = useState("");
  const [diagnostics, setDiagnostics] = useState<SocialAdminDiagnostics | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [message, setMessage] = useState("Loading social diagnostics.");

  const authHeaders = useMemo(() => {
    const trimmed = token.trim();
    return trimmed.length > 0 ? { "x-sts-admin-token": trimmed } : undefined;
  }, [token]);

  async function loadDiagnostics(nextMessage?: string) {
    setStatus("loading");
    const response = await fetch("/api/admin/social/diagnostics", {
      cache: "no-store",
      headers: authHeaders,
    });
    if (response.status === 401 || response.status === 403) {
      setStatus("denied");
      setMessage("Admin rights are required for social diagnostics.");
      return;
    }
    if (!response.ok) {
      setStatus("error");
      setMessage("Social diagnostics could not be loaded.");
      return;
    }
    const body = (await response.json()) as SocialAdminDiagnostics;
    setDiagnostics(body);
    setStatus("ready");
    setMessage(nextMessage ?? `Verified ${body.counts.syncedRows} synced rows with ${body.counts.quarantinedRows} quarantined rows.`);
  }

  async function applyAction(postId: string, action: SocialAdminAction) {
    const response = await fetch("/api/admin/social/diagnostics", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authHeaders ?? {}),
      },
      body: JSON.stringify({ postId, action }),
    });
    if (!response.ok) {
      setMessage("Action was rejected by the admin API.");
      return;
    }
    await loadDiagnostics(`${actionLabel[action]} was audited for ${postId}.`);
  }

  useEffect(() => {
    void loadDiagnostics();
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-(--radius-card) border border-line bg-surface p-3">
        <label className="block text-[11px] font-medium text-ink-2" htmlFor="social-admin-token">
          Local admin token
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="social-admin-token"
            value={token}
            onChange={(event) => setToken(event.currentTarget.value)}
            className="min-w-0 flex-1 rounded-[10px] border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
            type="password"
            autoComplete="off"
          />
          <button
            className="rounded-[10px] bg-ink px-3 py-2 text-[12px] font-semibold text-white"
            onClick={() => {
              void loadDiagnostics();
            }}
            type="button"
          >
            Load
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-2">{message}</p>
      </div>

      {status === "ready" && diagnostics ? (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <Metric label="Rights" value={diagnostics.counts.pendingRights} />
            <Metric label="Media" value={diagnostics.counts.pendingMedia} />
            <Metric label="Hidden" value={diagnostics.counts.hiddenForExpiryOrTakedown} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Metric label="Moderation" value={diagnostics.counts.pendingModeration} />
            <Metric label="Tags" value={diagnostics.counts.pendingTags} />
            <Metric label="Quarantine" value={diagnostics.counts.quarantinedRows} />
          </div>

          <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
            {diagnostics.reviewItems.map((item) => (
              <ReviewRow key={item.id} item={item} onAction={applyAction} />
            ))}
          </div>

          <div className="rounded-(--radius-card) border border-line bg-surface p-3 text-[11px] text-ink-2">
            <p className="font-semibold text-ink">Redacted diagnostics</p>
            <p className="mt-1">
              {diagnostics.redactedDiagnostics.source} · {diagnostics.redactedDiagnostics.providerLatencyMs}ms · retained{" "}
              {diagnostics.redactedDiagnostics.metadataKeysRetained.join(", ")}
            </p>
            <p className="mt-1">Audits: {diagnostics.auditEvents.map((event) => `${event.postId}:${event.reason}`).join(", ") || "none"}</p>
          </div>
        </>
      ) : (
        <p className="rounded-(--radius-card) border border-line bg-surface px-3 py-6 text-center text-[12px] text-ink-2">
          {status === "loading" ? "Social diagnostics are loading." : "Only admins can read or mutate social diagnostics."}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-3.5">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className="mt-0.5 text-[20px] font-bold">{value}</p>
    </div>
  );
}

function ReviewRow({ item, onAction }: { readonly item: SocialAdminReviewItem; readonly onAction: (postId: string, action: SocialAdminAction) => Promise<void> }) {
  return (
    <div className="border-b border-line px-3 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold">{item.title ?? item.id}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-2">{item.sourceUrl ?? item.rights.evidenceUrl ?? "No source URL"}</p>
        </div>
        <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">{item.rights.status}</span>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] text-ink-2 sm:grid-cols-2">
        <p>Affiliate: {item.affiliateRelation}</p>
        <p>Verified: {item.lastVerifiedAt ?? "pending"}</p>
        <p>Media: {item.media.map((media) => `${media.kind}/${media.processingState}/${media.moderationState}`).join(", ")}</p>
        <p>Tags: {item.tags.map((tag) => `${tag.relation}/${tag.reviewState}/${tag.affiliateRelation}`).join(", ") || "none"}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.actions.map((action) => (
          <button
            key={action}
            className="rounded-[8px] border border-line bg-bg px-2 py-1 text-[11px] font-medium text-ink hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
            onClick={() => {
              void onAction(item.id, action);
            }}
            type="button"
          >
            {actionLabel[action]}
          </button>
        ))}
      </div>
    </div>
  );
}
