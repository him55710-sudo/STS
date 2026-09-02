import type {
  MediaProcessingEnqueueResult,
  MediaProcessingJob,
  MediaProcessingJobRepository,
} from "./types";
import { MEDIA_PROCESSING_MAX_ATTEMPTS } from "./types";

type SupabaseError = { readonly code?: string; readonly message?: string };
type SupabaseResult<T> = { readonly data: T | null; readonly error: SupabaseError | null };
type SupabaseRpcResult<T> = { readonly data: T; readonly error: SupabaseError | null };
export type ProcessingJobRow = {
  readonly id: string;
  readonly media_asset_id: string;
  readonly owner_id: string;
  readonly post_id: string;
  readonly status: "queued" | "running" | "succeeded" | "failed" | "blocked";
  readonly attempts: number | null;
  readonly error_code: string | null;
  readonly available_at: string;
};
type ProcessingJobUpdate = {
  readonly status: "running" | "succeeded" | "failed" | "queued" | "blocked";
  readonly attempts?: number;
  readonly error_code?: string | null;
  readonly available_at?: string;
};
type EnqueueMediaProcessingJobArgs = {
  readonly p_asset_id: string;
  readonly p_owner_id: string;
};
type AwaitableResult<T> = PromiseLike<SupabaseResult<T>>;
type UpdateFilter = {
  eq(column: string, value: string): { select(columns: string): { single(): AwaitableResult<ProcessingJobRow> } };
};
type SelectFilter = {
  eq(column: string, value: string): SelectFilter;
  order(column: string, options: { readonly ascending: boolean }): SelectFilter;
  limit(count: number): SelectFilter;
  maybeSingle(): AwaitableResult<ProcessingJobRow>;
};
type ProcessingJobsTable = {
  update(row: ProcessingJobUpdate): UpdateFilter;
  select(columns: string): SelectFilter;
};
type ProcessingJobRpcData = ProcessingJobRow | readonly ProcessingJobRow[] | null;
export type ProcessingJobsClient = {
  from(table: "processing_jobs"): unknown;
  rpc(functionName: "claim_media_processing_job"): PromiseLike<SupabaseRpcResult<ProcessingJobRpcData>>;
  rpc(functionName: "enqueue_media_processing_job", args: EnqueueMediaProcessingJobArgs): PromiseLike<SupabaseRpcResult<ProcessingJobRpcData>>;
};

const JOB_COLUMNS = "id, media_asset_id, owner_id, post_id, status, attempts, error_code, available_at";

export function createSupabaseMediaProcessingQueue(client: ProcessingJobsClient): MediaProcessingJobRepository {
  return {
    async enqueue(asset): Promise<MediaProcessingEnqueueResult> {
      const result = await client.rpc("enqueue_media_processing_job", { p_asset_id: asset.id, p_owner_id: asset.ownerId });
      const row = firstProcessingJobRow(result.data);
      if (result.error || !row) return { kind: "failed", code: result.error?.code ?? "queue_enqueue_failed" };
      return { kind: "enqueued", job: toProcessingJob(row) };
    },
    async claimNext(): Promise<MediaProcessingJob | null> {
      const claimed = await client.rpc("claim_media_processing_job");
      if (claimed.error) return null;
      const row = firstProcessingJobRow(claimed.data);
      return row ? toProcessingJob(row) : null;
    },
    async markSucceeded(jobId): Promise<void> {
      await fromProcessingJobs(client).update({ status: "succeeded", error_code: null }).eq("id", jobId).select(JOB_COLUMNS).single();
    },
    async markFailed(job, code): Promise<MediaProcessingJob> {
      const retryable = code !== "media_asset_missing" && job.attempts < MEDIA_PROCESSING_MAX_ATTEMPTS;
      const result = await fromProcessingJobs(client)
        .update({
          status: retryable ? "queued" : "failed",
          error_code: code,
          available_at: retryable ? nextAvailableAt(job.attempts) : new Date().toISOString(),
        })
        .eq("id", job.id)
        .select(JOB_COLUMNS)
        .single();
      return result.data ? toProcessingJob(result.data) : { ...job, status: "failed", errorCode: code };
    },
    async markBlocked(jobId, code): Promise<void> {
      await fromProcessingJobs(client).update({ status: "blocked", error_code: code }).eq("id", jobId).select(JOB_COLUMNS).single();
    },
  };
}

function firstProcessingJobRow(data: ProcessingJobRpcData): ProcessingJobRow | null {
  if (!data) return null;
  if ("id" in data) return data;
  return data[0] ?? null;
}

function fromProcessingJobs(client: ProcessingJobsClient): ProcessingJobsTable {
  const table = client.from("processing_jobs");
  if (isProcessingJobsTable(table)) return table;
  throw new TypeError("Supabase processing_jobs table adapter is not queryable");
}

function isProcessingJobsTable(value: unknown): value is ProcessingJobsTable {
  if (!hasProcessingJobMethods(value)) return false;
  return typeof value.update === "function" && typeof value.select === "function";
}

function hasProcessingJobMethods(
  value: unknown
): value is { readonly update: unknown; readonly select: unknown } {
  return typeof value === "object" && value !== null && "update" in value && "select" in value;
}

export function toProcessingJob(row: ProcessingJobRow): MediaProcessingJob {
  return {
    id: row.id,
    assetId: row.media_asset_id,
    ownerId: row.owner_id,
    postId: row.post_id,
    status: row.status,
    attempts: row.attempts ?? 0,
    errorCode: row.error_code,
    availableAt: row.available_at,
  };
}

function nextAvailableAt(attempts: number): string {
  return new Date(Date.now() + backoffMs(attempts)).toISOString();
}

export function backoffMs(attempts: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attempts - 1));
}
