import type {
  MediaAssetRecord,
  MediaProcessingEnqueueResult,
  MediaProcessingJob,
  MediaProcessingJobRepository,
  MediaProcessingJobStatus,
  MediaRepository,
  UploadSigner,
  UploadTarget,
} from "./types";
import { MEDIA_PROCESSING_MAX_ATTEMPTS } from "./types";
import { backoffMs } from "./queue";

export function createInMemoryMediaRepository(seed: readonly MediaAssetRecord[] = []): MediaRepository {
  const records = new Map<string, MediaAssetRecord>();
  for (const asset of seed) records.set(asset.id, asset);
  return {
    async findByHash(scope) {
      return [...records.values()].find((asset) =>
        asset.contentHash === scope.contentHash && asset.ownerId === scope.ownerId && asset.postId === scope.postId
      ) ?? null;
    },
    async getById(assetId) {
      return records.get(assetId) ?? null;
    },
    async save(asset) {
      records.set(asset.id, asset);
      return asset;
    },
  };
}

type InMemoryQueueOptions = {
  readonly now?: () => number;
};

export function createInMemoryMediaProcessingQueue(
  seed: readonly MediaProcessingJob[] = [],
  options: InMemoryQueueOptions = {}
): MediaProcessingJobRepository {
  const jobs = new Map<string, MediaProcessingJob>();
  for (const job of seed) jobs.set(job.id, job);
  const now = options.now ?? Date.now;
  return {
    async enqueue(asset): Promise<MediaProcessingEnqueueResult> {
      const job: MediaProcessingJob = {
        id: `job_${asset.id}_${jobs.size + 1}`,
        assetId: asset.id,
        ownerId: asset.ownerId,
        postId: asset.postId,
        status: "queued",
        attempts: 0,
        errorCode: null,
        availableAt: new Date(now()).toISOString(),
      };
      jobs.set(job.id, job);
      return { kind: "enqueued", job };
    },
    async claimNext(): Promise<MediaProcessingJob | null> {
      const queued = [...jobs.values()].find((job) => job.status === "queued" && Date.parse(job.availableAt) <= now()) ?? null;
      if (!queued) return null;
      const running = updateJob({ job: queued, status: "running", attempts: queued.attempts + 1, errorCode: null });
      jobs.set(running.id, running);
      return running;
    },
    async markSucceeded(jobId): Promise<void> {
      const job = jobs.get(jobId);
      if (!job) return;
      jobs.set(jobId, updateJob({ job, status: "succeeded", attempts: job.attempts, errorCode: null }));
    },
    async markFailed(job, code): Promise<MediaProcessingJob> {
      const retryable = code !== "media_asset_missing" && job.attempts < MEDIA_PROCESSING_MAX_ATTEMPTS;
      const updated = updateJob({
        job,
        status: retryable ? "queued" : "failed",
        attempts: job.attempts,
        errorCode: code,
        availableAt: new Date(now() + (retryable ? backoffMs(job.attempts) : 0)).toISOString(),
      });
      jobs.set(job.id, updated);
      return updated;
    },
    async markBlocked(jobId, code): Promise<void> {
      const job = jobs.get(jobId);
      if (!job) return;
      jobs.set(jobId, updateJob({ job, status: "blocked", attempts: job.attempts, errorCode: code }));
    },
  };
}

type JobUpdate = {
  readonly job: MediaProcessingJob;
  readonly status: MediaProcessingJobStatus;
  readonly attempts: number;
  readonly errorCode: string | null;
  readonly availableAt?: string;
};

function updateJob(update: JobUpdate): MediaProcessingJob {
  return {
    ...update.job,
    status: update.status,
    attempts: update.attempts,
    errorCode: update.errorCode,
    availableAt: update.availableAt ?? update.job.availableAt,
  };
}

export function createStaticUploadSigner(baseUrl: string): UploadSigner & { readonly calls: number } {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async sign(input): Promise<UploadTarget> {
      calls += 1;
      const storagePath = `${input.ownerId}/${input.contentHash.replace("sha256:", "")}/${encodeURIComponent(input.fileName)}`;
      const publicUrl = `${baseUrl}/public/${storagePath}`;
      return {
        uploadUrl: `${baseUrl}/upload/${storagePath}`,
        storagePath,
        publicUrl,
        headers: { "content-type": input.mimeType },
      };
    },
  };
}
