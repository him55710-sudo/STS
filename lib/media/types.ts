export const FALLBACK_POSTER_URL = "/media/fallback-poster.svg";

export const MEDIA_PROCESSING_STATUSES = ["uploaded", "processing", "ready", "blocked", "failed"] as const;
export type MediaProcessingStatus = (typeof MEDIA_PROCESSING_STATUSES)[number];

export const MEDIA_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export type MediaUploadMimeType = (typeof MEDIA_UPLOAD_MIME_TYPES)[number];

export type MediaKind = "image" | "video";

export type MediaDimensions = { readonly width: number; readonly height: number };
export type MediaPoster = { readonly url: string; readonly dimensions: MediaDimensions };
export type NativeVariant = { readonly url: string; readonly mimeType: MediaUploadMimeType; readonly bytes: number };
export type HlsVariant = {
  readonly width: number;
  readonly height: number;
  readonly bandwidth: number;
  readonly playlistUrl: string;
};
export type HlsManifest = { readonly url: string; readonly variants: readonly HlsVariant[] };
export type ModerationStatus = "pending" | "approved" | "blocked";
export type ModerationMetadata = {
  readonly status: ModerationStatus;
  readonly sampledFramesMs: readonly number[];
};
export type AudioLicenseSource = "none" | "unknown" | "user_declared" | "instagram_library" | "licensed";
export type AudioMetadata = {
  readonly hasAudio: boolean;
  readonly license: { readonly source: AudioLicenseSource; readonly reusable: boolean; readonly note: string | null };
};

export type MediaAssetRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly postId: string;
  readonly status: MediaProcessingStatus;
  readonly kind: MediaKind;
  readonly mimeType: MediaUploadMimeType;
  readonly sizeBytes: number;
  readonly storagePath: string;
  readonly publicUrl: string;
  readonly contentHash: string | null;
  readonly dimensions: MediaDimensions | null;
  readonly durationMs: number | null;
  readonly poster: MediaPoster | null;
  readonly native: NativeVariant | null;
  readonly hls: HlsManifest | null;
  readonly moderation: ModerationMetadata;
  readonly audio: AudioMetadata;
  readonly errorCode: string | null;
};

export type UploadRequest = {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly dimensions?: MediaDimensions;
  readonly durationMs?: number;
  readonly contentHash?: string;
  readonly contentBytes?: Buffer | Uint8Array;
  readonly audio?: AudioMetadata;
};

export type UploadTarget = {
  readonly uploadUrl: string;
  readonly storagePath: string;
  readonly publicUrl: string;
  readonly headers: Readonly<Record<string, string>>;
};

export type AcceptedUpload = {
  readonly kind: "accepted";
  readonly asset: MediaAssetRecord;
  readonly upload: UploadTarget;
  readonly deduped: boolean;
};

export type RejectedUpload = {
  readonly kind: "rejected";
  readonly code: string;
  readonly status: number;
  readonly message: string;
};

export type InitiateUploadResult = AcceptedUpload | RejectedUpload;

export type CompletedUpload = {
  readonly kind: "accepted";
  readonly asset: MediaAssetRecord;
};
export type CompleteUploadResult = CompletedUpload | RejectedUpload;

export type MediaHashScope = {
  readonly ownerId: string;
  readonly postId: string;
  readonly contentHash: string;
};

export interface MediaRepository {
  findByHash(scope: MediaHashScope): Promise<MediaAssetRecord | null>;
  getById(assetId: string): Promise<MediaAssetRecord | null>;
  save(asset: MediaAssetRecord): Promise<MediaAssetRecord>;
}

export interface UploadSigner {
  sign(input: {
    readonly ownerId: string;
    readonly fileName: string;
    readonly mimeType: MediaUploadMimeType;
    readonly contentHash: string;
  }): Promise<UploadTarget>;
}

export type MediaProcessingReady = {
  readonly kind: "ready";
  readonly dimensions: MediaDimensions;
  readonly durationMs: number | null;
  readonly poster: MediaPoster | null;
  readonly native: NativeVariant;
  readonly hls: HlsManifest | null;
  readonly moderation: ModerationMetadata;
  readonly audio: AudioMetadata;
};

export type MediaProcessingBlocked = {
  readonly kind: "blocked";
  readonly reason: string;
  readonly moderation: ModerationMetadata;
};

export type MediaProcessingFailed = { readonly kind: "failed"; readonly code: string };
export type MediaProcessingResult = MediaProcessingReady | MediaProcessingBlocked | MediaProcessingFailed;

export type UploadedStorageVerification =
  | { readonly kind: "uploaded" }
  | { readonly kind: "missing"; readonly code: "upload_missing" }
  | { readonly kind: "failed"; readonly code: string };

export interface UploadedStorageVerifier {
  verifyUploaded(asset: MediaAssetRecord): Promise<UploadedStorageVerification>;
}

export const MEDIA_PROCESSING_JOB_KINDS = ["media_processing"] as const;
export type MediaProcessingJobKind = (typeof MEDIA_PROCESSING_JOB_KINDS)[number];
export const MEDIA_PROCESSING_JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type MediaProcessingJobStatus = (typeof MEDIA_PROCESSING_JOB_STATUSES)[number];
export type MediaProcessingJob = {
  readonly id: string;
  readonly assetId: string;
  readonly ownerId: string;
  readonly postId: string;
  readonly status: MediaProcessingJobStatus;
  readonly attempts: number;
  readonly errorCode: string | null;
};

export type MediaProcessingEnqueueResult =
  | { readonly kind: "enqueued"; readonly job: MediaProcessingJob }
  | { readonly kind: "failed"; readonly code: string };

export type MediaProcessingQueueAsset = Pick<MediaAssetRecord, "id" | "ownerId" | "postId">;

export interface MediaProcessingQueue {
  enqueue(asset: MediaProcessingQueueAsset): Promise<MediaProcessingEnqueueResult>;
}

export interface MediaProcessingJobRepository extends MediaProcessingQueue {
  claimNext(): Promise<MediaProcessingJob | null>;
  markSucceeded(jobId: string): Promise<void>;
  markFailed(jobId: string, code: string): Promise<void>;
}

export interface MediaProcessorAdapter {
  /** Production binding must run in a worker with real FFmpeg/HLS/moderation adapters, not in request handlers. */
  process(asset: MediaAssetRecord): Promise<MediaProcessingResult>;
}

export type RemoteProbeResult =
  | { readonly kind: "ok"; readonly cacheStatus: "hit" | "miss" | "stale" }
  | { readonly kind: "failure"; readonly status: number; readonly reason: string };
export type RemoteMediaProbe = (url: string) => Promise<RemoteProbeResult>;
