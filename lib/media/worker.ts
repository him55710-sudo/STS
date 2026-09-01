import type { MediaAssetRecord, MediaProcessingJobRepository, MediaProcessingStatus, MediaProcessorAdapter, MediaRepository } from "./types";
import { MediaAssetMissingError, processUploadedMedia } from "./workflow";

type WorkerOptions = {
  readonly queue: MediaProcessingJobRepository;
  readonly repository: MediaRepository;
  readonly processor: MediaProcessorAdapter;
};

export type MediaProcessingWorkerResult =
  | { readonly kind: "idle" }
  | { readonly kind: "processed"; readonly assetId: string; readonly status: MediaProcessingStatus }
  | { readonly kind: "failed"; readonly assetId: string; readonly code: string };

export async function processNextMediaProcessingJob(options: WorkerOptions): Promise<MediaProcessingWorkerResult> {
  const job = await options.queue.claimNext();
  if (!job) return { kind: "idle" };

  try {
    const processed = await processUploadedMedia({
      assetId: job.assetId,
      repository: options.repository,
      processor: options.processor,
    });
    return finishProcessedJob(options.queue, job.id, processed);
  } catch (error) {
    if (error instanceof MediaAssetMissingError) {
      await options.queue.markFailed(job.id, "media_asset_missing");
      return { kind: "failed", assetId: job.assetId, code: "media_asset_missing" };
    }
    if (error instanceof Error) {
      const asset = await options.repository.getById(job.assetId);
      if (asset) await options.repository.save({ ...asset, status: "failed", errorCode: "media_processing_exception" });
      await options.queue.markFailed(job.id, "media_processing_exception");
      return { kind: "failed", assetId: job.assetId, code: "media_processing_exception" };
    }
    throw error;
  }
}

async function finishProcessedJob(
  queue: MediaProcessingJobRepository,
  jobId: string,
  asset: MediaAssetRecord
): Promise<MediaProcessingWorkerResult> {
  switch (asset.status) {
    case "ready":
    case "blocked":
      await queue.markSucceeded(jobId);
      return { kind: "processed", assetId: asset.id, status: asset.status };
    case "failed":
      await queue.markFailed(jobId, asset.errorCode ?? "media_processing_failed");
      return { kind: "processed", assetId: asset.id, status: asset.status };
    case "uploaded":
    case "processing":
      await queue.markFailed(jobId, "media_processing_incomplete");
      return { kind: "failed", assetId: asset.id, code: "media_processing_incomplete" };
    default:
      return assertNever(asset.status);
  }
}

function assertNever(value: never): never {
  throw new Error(`unexpected media worker state: ${JSON.stringify(value)}`);
}
