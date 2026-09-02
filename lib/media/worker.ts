import type {
  MediaAssetRecord,
  MediaProcessingJob,
  MediaProcessingJobRepository,
  MediaProcessingStatus,
  MediaProcessorAdapter,
  MediaRepository,
} from "./types";
import { MEDIA_PROCESSING_MAX_ATTEMPTS } from "./types";
import { createMediaProcessorAdapter, type MediaProcessorAdapter as TypedMediaProcessorAdapter } from "./processor-adapter";
import { createSupabaseWorkerStore, type MediaProcessingFailureDisposition, type SupabaseWorkerStore } from "./supabase-worker-adapter";
import { MediaAssetMissingError, processUploadedMedia } from "./workflow";

type WorkerOptions = {
  readonly queue: MediaProcessingJobRepository;
  readonly repository: MediaRepository;
  readonly processor: MediaProcessorAdapter;
};

export type MediaProcessingWorkerResult =
  | { readonly kind: "idle" }
  | { readonly kind: "processed"; readonly assetId: string; readonly status: MediaProcessingStatus }
  | { readonly kind: "failed"; readonly assetId: string; readonly code: string }
  | { readonly kind: "retrying"; readonly assetId: string; readonly code: string };

export type SupabaseMediaProcessingRunnerOptions = {
  readonly store?: SupabaseWorkerStore | null;
  readonly processor?: TypedMediaProcessorAdapter | null;
};

export type SupabaseMediaProcessingRunner = () => Promise<MediaProcessingWorkerResult>;

export class MediaProcessingWorkerConfigurationError extends Error {
  readonly name = "MediaProcessingWorkerConfigurationError";

  constructor() {
    super("A service-role media worker store must be configured before media processing can start");
  }
}

export function createSupabaseMediaProcessingRunner(
  options: SupabaseMediaProcessingRunnerOptions = {},
): SupabaseMediaProcessingRunner {
  const processor = createMediaProcessorAdapter({ processor: options.processor });
  const store = options.store ?? createSupabaseWorkerStore();
  if (!store) throw new MediaProcessingWorkerConfigurationError();

  return async () => processSupabaseMediaProcessingJob({ store, processor });
}

export async function processNextMediaProcessingJob(options: WorkerOptions): Promise<MediaProcessingWorkerResult> {
  const job = await options.queue.claimNext();
  if (!job) return { kind: "idle" };

  try {
    const processed = await processUploadedMedia({
      assetId: job.assetId,
      repository: options.repository,
      processor: options.processor,
    });
    return finishProcessedJob(options.queue, job, processed);
  } catch (error) {
    if (error instanceof MediaAssetMissingError) {
      await options.queue.markFailed(job, "media_asset_missing");
      return { kind: "failed", assetId: job.assetId, code: "media_asset_missing" };
    }
    if (error instanceof Error) {
      const asset = await options.repository.getById(job.assetId);
      const marked = await options.queue.markFailed(job, "media_processing_exception");
      if (marked.status === "queued") {
        if (asset) await options.repository.save({ ...asset, status: "processing", errorCode: "media_processing_exception" });
        return { kind: "retrying", assetId: job.assetId, code: "media_processing_exception" };
      }
      if (asset) await options.repository.save({ ...asset, status: "failed", errorCode: "media_processing_exception" });
      return { kind: "failed", assetId: job.assetId, code: "media_processing_exception" };
    }
    throw error;
  }
}

type SupabaseWorkerRunOptions = {
  readonly store: SupabaseWorkerStore;
  readonly processor: TypedMediaProcessorAdapter;
};

async function processSupabaseMediaProcessingJob(
  options: SupabaseWorkerRunOptions,
): Promise<MediaProcessingWorkerResult> {
  const job = await options.store.claimJob();
  if (!job) return { kind: "idle" };

  try {
    const asset = await options.store.loadAsset(job.assetId);
    if (!asset) return markSupabaseFailure(options.store, job, "media_asset_missing");

    const output = await options.processor.process(asset);
    switch (output.moderation.kind) {
      case "approved":
        return persistSupabaseReady({ store: options.store, job, output });
      case "review":
        return persistSupabaseReady({ store: options.store, job, output });
      case "blocked":
        await options.store.persistModeration(asset.id, output.moderation);
        await options.store.cleanupOutputs(asset.id);
        await options.store.markBlocked(asset.id, output.moderation.reason);
        return { kind: "processed", assetId: asset.id, status: "blocked" };
      default:
        return assertNever(output.moderation);
    }
  } catch (error) {
    return markSupabaseFailure(options.store, job, mediaProcessingErrorCode(error));
  }
}

type PersistSupabaseReadyOptions = {
  readonly store: SupabaseWorkerStore;
  readonly job: MediaProcessingJob;
  readonly output: import("./processor-adapter").MediaProcessingOutput;
};

async function persistSupabaseReady(options: PersistSupabaseReadyOptions): Promise<MediaProcessingWorkerResult> {
  await options.store.persistVariants(options.job.assetId, options.output);
  await options.store.persistModeration(options.job.assetId, options.output.moderation);
  await options.store.markReady(options.job.assetId);
  return { kind: "processed", assetId: options.job.assetId, status: "ready" };
}

async function markSupabaseFailure(
  store: SupabaseWorkerStore,
  job: MediaProcessingJob,
  code: string,
): Promise<MediaProcessingWorkerResult> {
  let disposition: MediaProcessingFailureDisposition | void;
  try {
    await store.cleanupOutputs(job.assetId);
  } finally {
    disposition = await store.markFailed(job.assetId, code);
  }

  const retrying = disposition === "retrying"
    || (disposition !== "failed" && code !== "media_asset_missing" && job.attempts < MEDIA_PROCESSING_MAX_ATTEMPTS);
  return retrying
    ? { kind: "retrying", assetId: job.assetId, code }
    : { kind: "failed", assetId: job.assetId, code };
}

function mediaProcessingErrorCode(error: unknown): string {
  return error instanceof Error ? "media_processing_exception" : "media_processing_unknown_error";
}

async function finishProcessedJob(
  queue: MediaProcessingJobRepository,
  job: MediaProcessingJob,
  asset: MediaAssetRecord
): Promise<MediaProcessingWorkerResult> {
  switch (asset.status) {
    case "ready":
      await queue.markSucceeded(job.id);
      return { kind: "processed", assetId: asset.id, status: asset.status };
    case "blocked":
      await queue.markBlocked(job.id, asset.errorCode ?? "media_blocked");
      return { kind: "processed", assetId: asset.id, status: asset.status };
    case "failed":
      return markRetryableFailure({ queue, job, asset, code: asset.errorCode ?? "media_processing_failed" });
    case "uploaded":
    case "processing":
      return markRetryableFailure({ queue, job, asset, code: "media_processing_incomplete" });
    default:
      return assertNever(asset.status);
  }
}

type RetryableFailureOptions = {
  readonly queue: MediaProcessingJobRepository;
  readonly job: MediaProcessingJob;
  readonly asset: MediaAssetRecord;
  readonly code: string;
};

async function markRetryableFailure(options: RetryableFailureOptions): Promise<MediaProcessingWorkerResult> {
  const marked = await options.queue.markFailed(options.job, options.code);
  if (marked.status === "queued") return { kind: "retrying", assetId: options.asset.id, code: options.code };
  return { kind: "processed", assetId: options.asset.id, status: options.asset.status };
}

function assertNever(value: never): never {
  throw new Error(`unexpected media worker state: ${JSON.stringify(value)}`);
}
