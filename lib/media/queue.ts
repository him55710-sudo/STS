import type {
  MediaProcessingEnqueueResult,
  MediaProcessingJob,
  MediaProcessingJobRepository,
} from "./types";

type SupabaseError = { readonly code?: string; readonly message?: string };
type SupabaseResult<T> = { readonly data: T | null; readonly error: SupabaseError | null };
type SupabaseRpcResult<T> = { readonly data: T; readonly error: SupabaseError | null };
export type ProcessingJobRow = {
  readonly id: string;
  readonly media_asset_id: string;
  readonly owner_id: string;
  readonly post_id: string;
  readonly status: "queued" | "running" | "succeeded" | "failed";
  readonly attempts: number | null;
  readonly error_code: string | null;
};
export type ProcessingJobInsert = {
  readonly job_kind: "media_processing";
  readonly media_asset_id: string;
  readonly owner_id: string;
  readonly post_id: string;
  readonly status: "queued";
};
type ProcessingJobUpdate = {
  readonly status: "running" | "succeeded" | "failed";
  readonly attempts?: number;
  readonly error_code?: string | null;
};
type AwaitableResult<T> = PromiseLike<SupabaseResult<T>>;
export type InsertSelect = { select(columns: string): { single(): AwaitableResult<ProcessingJobRow> } };
export type ProcessingJobsEnqueueTable = {
  insert(row: ProcessingJobInsert): InsertSelect;
};
type UpdateFilter = {
  eq(column: string, value: string): { select(columns: string): { single(): AwaitableResult<ProcessingJobRow> } };
};
type SelectFilter = {
  eq(column: string, value: string): SelectFilter;
  order(column: string, options: { readonly ascending: boolean }): SelectFilter;
  limit(count: number): SelectFilter;
  maybeSingle(): AwaitableResult<ProcessingJobRow>;
};
type ProcessingJobsTable = ProcessingJobsEnqueueTable & {
  update(row: ProcessingJobUpdate): UpdateFilter;
  select(columns: string): SelectFilter;
};
type ProcessingJobRpcData = ProcessingJobRow | readonly ProcessingJobRow[] | null;
export type ProcessingJobsClient = {
  from(table: "processing_jobs"): unknown;
  rpc(functionName: "claim_media_processing_job"): PromiseLike<SupabaseRpcResult<ProcessingJobRpcData>>;
};

const JOB_COLUMNS = "id, media_asset_id, owner_id, post_id, status, attempts, error_code";

export function createSupabaseMediaProcessingQueue(client: ProcessingJobsClient): MediaProcessingJobRepository {
  return {
    async enqueue(asset): Promise<MediaProcessingEnqueueResult> {
      const result = await fromProcessingJobsEnqueue(client)
        .insert({
          job_kind: "media_processing",
          media_asset_id: asset.id,
          owner_id: asset.ownerId,
          post_id: asset.postId,
          status: "queued",
        })
        .select(JOB_COLUMNS)
        .single();
      if (result.error || !result.data) return { kind: "failed", code: result.error?.code ?? "queue_insert_failed" };
      return { kind: "enqueued", job: toProcessingJob(result.data) };
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
    async markFailed(jobId, code): Promise<void> {
      await fromProcessingJobs(client).update({ status: "failed", error_code: code }).eq("id", jobId).select(JOB_COLUMNS).single();
    },
  };
}

function firstProcessingJobRow(data: ProcessingJobRpcData): ProcessingJobRow | null {
  if (!data) return null;
  if ("id" in data) return data;
  return data[0] ?? null;
}

function fromProcessingJobsEnqueue(client: ProcessingJobsClient): ProcessingJobsEnqueueTable {
  const table = client.from("processing_jobs");
  if (isProcessingJobsEnqueueTable(table)) return table;
  throw new TypeError("Supabase processing_jobs enqueue adapter is not queryable");
}

function fromProcessingJobs(client: ProcessingJobsClient): ProcessingJobsTable {
  const table = client.from("processing_jobs");
  if (isProcessingJobsTable(table)) return table;
  throw new TypeError("Supabase processing_jobs table adapter is not queryable");
}

function isProcessingJobsEnqueueTable(value: unknown): value is ProcessingJobsEnqueueTable {
  return hasProcessingJobInsert(value) && typeof value.insert === "function";
}

function isProcessingJobsTable(value: unknown): value is ProcessingJobsTable {
  if (!hasProcessingJobMethods(value)) return false;
  return typeof value.insert === "function" && typeof value.update === "function" && typeof value.select === "function";
}

function hasProcessingJobInsert(value: unknown): value is { readonly insert: unknown } {
  return typeof value === "object" && value !== null && "insert" in value;
}

function hasProcessingJobMethods(
  value: unknown
): value is { readonly insert: unknown; readonly update: unknown; readonly select: unknown } {
  return typeof value === "object" && value !== null && "insert" in value && "update" in value && "select" in value;
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
  };
}
