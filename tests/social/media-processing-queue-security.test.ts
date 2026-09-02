import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMediaProcessingQueue } from "../../lib/media";
import type { ProcessingJobRow, ProcessingJobsClient } from "../../lib/media";

const claimableJob = {
  id: "job-1",
  media_asset_id: "asset-1",
  owner_id: "creator-1",
  post_id: "post-1",
  status: "queued",
  attempts: 0,
  error_code: null,
  available_at: "2026-09-02T00:00:00.000Z",
} satisfies ProcessingJobRow;

describe("Supabase media processing queue security", () => {
  it("enqueue uses the service-owned RPC instead of direct processing_jobs table writes", async () => {
    const rpcMock = vi.fn(async () => ({
      data: claimableJob,
      error: null,
    }));
    const fromMock = vi.fn(() => ({
      insert() {
        throw new Error("processing_jobs direct insert path was used");
      },
    }));
    const queue = createSupabaseMediaProcessingQueue({ from: fromMock, rpc: rpcMock });

    const result = await queue.enqueue({ id: "asset-1", ownerId: "creator-1", postId: "post-1" });

    expect(result).toMatchObject({ kind: "enqueued", job: { id: "job-1", assetId: "asset-1" } });
    expect(rpcMock).toHaveBeenCalledWith("enqueue_media_processing_job", { p_asset_id: "asset-1", p_owner_id: "creator-1" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("claims a queued job once when two workers race for the same Supabase RPC", async () => {
    const claimServer = new ClaimOnceRpc(claimableJob);
    const queue = createSupabaseMediaProcessingQueue({
      from() {
        throw new Error("claimNext must use the RPC claim contract");
      },
      rpc: claimServer.rpc,
    });

    const claims = await Promise.all([queue.claimNext(), queue.claimNext()]);

    expect(claimServer.callCount).toBe(2);
    expect(claims.filter((job) => job?.id === "job-1")).toHaveLength(1);
    expect(claims.filter((job) => job === null)).toHaveLength(1);
    expect(claims.find((job) => job?.id === "job-1")).toMatchObject({
      status: "running",
      attempts: 1,
      availableAt: "2026-09-02T00:00:00.000Z",
    });
  });
});

const liveDbConfig = readLiveDbConfig();

describe("live Supabase media processing queue concurrency", () => {
  if (liveDbConfig.kind === "skip") {
    it.skip(`skips live Supabase/Postgres concurrency: ${liveDbConfig.reason}`, () => {});
  } else {
    it("claims exactly one queued job when two service workers race against the configured database", async () => {
      const supabase = createClient(liveDbConfig.url, liveDbConfig.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const testId = randomUUID();
      const email = `task5-${testId}@example.test`;
      const password = `Task5-${testId}`;
      const createdUser = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (createdUser.error || !createdUser.data.user) throw new Error(createdUser.error?.message ?? "test user was not created");
      const ownerId = createdUser.data.user.id;
      const postId = `task5-${testId}`;
      let assetId: string | null = null;

      try {
        const insertedPost = await supabase.from("posts").insert({
          id: postId,
          creator_id: ownerId,
          caption: "Task 5 media queue concurrency",
          visibility: "private",
          display_state: "pending",
        });
        if (insertedPost.error) throw new Error(insertedPost.error.message);

        const insertedAsset = await supabase
          .from("media_assets")
          .insert({
            post_id: postId,
            storage_path: `task5/${testId}/reel.webm`,
            public_url: `https://example.test/task5/${testId}/reel.webm`,
            source: "user_upload",
            mime_type: "video/webm",
            byte_size: 32,
            processing_state: "processing",
            content_hash: `sha256:${"b".repeat(64)}`,
          })
          .select("id")
          .single();
        if (insertedAsset.error || !hasStringId(insertedAsset.data)) throw new Error(insertedAsset.error?.message ?? "test media asset was not created");
        assetId = insertedAsset.data.id;
        const claimedAssetId = assetId;

        const insertedJob = await supabase.from("processing_jobs").insert({
          job_kind: "media_processing",
          media_asset_id: claimedAssetId,
          post_id: postId,
          owner_id: ownerId,
          status: "queued",
          available_at: new Date(Date.now() - 1_000).toISOString(),
        });
        if (insertedJob.error) throw new Error(insertedJob.error.message);

        const claims = await Promise.all([
          supabase.rpc("claim_media_processing_job"),
          supabase.rpc("claim_media_processing_job"),
        ]);

        const claimRows = claims.flatMap((claim) => claimRowsForAsset(claim.data, claimedAssetId));
        expect(claims.every((claim) => claim.error === null)).toBe(true);
        expect(claimRows).toHaveLength(1);
        expect(claimRows[0]).toMatchObject({ media_asset_id: claimedAssetId, status: "running", attempts: 1 });
      } finally {
        if (assetId) await supabase.from("processing_jobs").delete().eq("media_asset_id", assetId);
        if (assetId) await supabase.from("media_assets").delete().eq("id", assetId);
        await supabase.from("posts").delete().eq("id", postId);
        await supabase.auth.admin.deleteUser(ownerId);
      }
    });
  }
});

type ClaimResult = Awaited<ReturnType<ProcessingJobsClient["rpc"]>>;
type ClaimResolver = (result: ClaimResult) => void;

class ClaimOnceRpc {
  private readonly waiters: ClaimResolver[] = [];
  private claimed = false;
  callCount = 0;

  constructor(private readonly job: ProcessingJobRow) {}

  readonly rpc: ProcessingJobsClient["rpc"] = (functionName) => {
    if (functionName !== "claim_media_processing_job") {
      return Promise.resolve({ data: null, error: { code: "unexpected_rpc" } });
    }
    this.callCount += 1;
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      if (this.waiters.length === 2) this.releaseClaims();
    });
  };

  private releaseClaims(): void {
    for (const resolve of this.waiters) {
      if (this.claimed) {
        resolve({ data: null, error: null });
      } else {
        this.claimed = true;
        resolve({ data: { ...this.job, status: "running", attempts: 1 }, error: null });
      }
    }
  }
}

type LiveDbConfig =
  | { readonly kind: "available"; readonly url: string; readonly serviceRoleKey: string }
  | { readonly kind: "skip"; readonly reason: string };

type ClaimedJobRow = Pick<ProcessingJobRow, "media_asset_id" | "status" | "attempts">;

function readLiveDbConfig(): LiveDbConfig {
  const url = (process.env.TASK5_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.trim();
  const serviceRoleKey = (process.env.TASK5_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!url) return { kind: "skip", reason: "set TASK5_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL" };
  if (!serviceRoleKey) return { kind: "skip", reason: "set TASK5_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY" };
  return { kind: "available", url, serviceRoleKey };
}

function claimRowsForAsset(data: unknown, assetId: string): readonly ClaimedJobRow[] {
  const rows: readonly unknown[] = Array.isArray(data) ? data : [data];
  return rows.flatMap((row) => {
    const claimed = parseClaimedJobRow(row);
    return claimed?.media_asset_id === assetId ? [claimed] : [];
  });
}

function parseClaimedJobRow(value: unknown): ClaimedJobRow | null {
  if (!isRecord(value)) return null;
  const mediaAssetId = value["media_asset_id"];
  const status = value["status"];
  const attempts = value["attempts"];
  if (typeof mediaAssetId !== "string" || !isProcessingJobStatus(status) || typeof attempts !== "number") return null;
  return { media_asset_id: mediaAssetId, status, attempts };
}

function isProcessingJobStatus(value: unknown): value is ProcessingJobRow["status"] {
  return value === "queued" || value === "running" || value === "succeeded" || value === "failed" || value === "blocked";
}

function hasStringId(value: unknown): value is { readonly id: string } {
  return isRecord(value) && typeof value["id"] === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
