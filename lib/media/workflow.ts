import { randomUUID } from "node:crypto";
import type {
  AcceptedUpload,
  CompleteUploadResult,
  InitiateUploadResult,
  MediaProcessingQueue,
  MediaAssetRecord,
  MediaProcessorAdapter,
  MediaRepository,
  RemoteMediaProbe,
  UploadRequest,
  UploadSigner,
  UploadedStorageVerifier,
} from "./types";
import { FALLBACK_POSTER_URL } from "./types";
import { validateUploadRequest } from "./validation";

type InitiateOptions = {
  readonly postId: string;
  readonly request: UploadRequest;
  readonly repository: MediaRepository;
  readonly signer: UploadSigner;
  readonly ownerId: string;
};

type ProcessOptions = {
  readonly assetId: string;
  readonly repository: MediaRepository;
  readonly processor: MediaProcessorAdapter;
};

type CompleteOptions = {
  readonly assetId: string;
  readonly repository: MediaRepository;
  readonly verifier: UploadedStorageVerifier;
  readonly queue?: MediaProcessingQueue;
};

export async function initiateMediaUpload(options: InitiateOptions): Promise<InitiateUploadResult> {
  const validation = validateUploadRequest(options.request);
  if (validation.kind === "rejected") return validation;

  if (validation.contentHash) {
    const existing = await options.repository.findByHash({
      ownerId: options.ownerId,
      postId: options.postId,
      contentHash: validation.contentHash,
    });
    if (existing) {
      const resumed = await options.repository.save({ ...existing, status: "uploaded", errorCode: null });
      return accepted(resumed, await options.signer.sign({
        ownerId: options.ownerId,
        fileName: options.request.fileName,
        mimeType: validation.mimeType,
        contentHash: validation.contentHash,
      }), true);
    }
  }

  const upload = await options.signer.sign({
    ownerId: options.ownerId,
    fileName: options.request.fileName,
    mimeType: validation.mimeType,
    contentHash: validation.uploadFingerprint,
  });
  const asset = await options.repository.save({
    id: stableAssetId(options.postId, validation.contentHash ?? randomUUID()),
    ownerId: options.ownerId,
    postId: options.postId,
    status: "uploaded",
    kind: validation.mediaKind,
    mimeType: validation.mimeType,
    sizeBytes: options.request.sizeBytes,
    storagePath: upload.storagePath,
    publicUrl: upload.publicUrl,
    contentHash: validation.contentHash,
    dimensions: validation.dimensions,
    durationMs: options.request.durationMs ?? null,
    poster: null,
    native: null,
    hls: null,
    moderation: { status: "pending", sampledFramesMs: [] },
    audio: options.request.audio ?? { hasAudio: false, license: { source: "unknown", reusable: false, note: null } },
    errorCode: null,
  });
  return accepted(asset, upload, false);
}

export async function processUploadedMedia(options: ProcessOptions): Promise<MediaAssetRecord> {
  const asset = await mustGetAsset(options.assetId, options.repository);
  if (asset.status === "ready" || asset.status === "blocked") return asset;
  const processing = await options.repository.save({ ...asset, status: "processing" });
  const result = await options.processor.process(processing);
  switch (result.kind) {
    case "ready":
      return options.repository.save({
        ...processing,
        status: "ready",
        dimensions: result.dimensions,
        durationMs: result.durationMs,
        poster: result.poster,
        native: result.native,
        hls: result.hls,
        moderation: result.moderation,
        audio: result.audio,
        errorCode: null,
      });
    case "blocked":
      return options.repository.save({
        ...processing,
        status: "blocked",
        moderation: result.moderation,
        errorCode: result.reason,
      });
    case "failed":
      return options.repository.save({ ...processing, status: "failed", errorCode: result.code });
    default:
      return assertNever(result);
  }
}

export async function completeMediaUpload(options: CompleteOptions): Promise<CompleteUploadResult> {
  const asset = await mustGetAsset(options.assetId, options.repository);
  if (asset.status === "processing") return { kind: "accepted", asset };
  if (asset.status !== "uploaded") return reject("invalid_upload_state", 409, "media upload is not awaiting completion");

  const verification = await options.verifier.verifyUploaded(asset);
  switch (verification.kind) {
    case "uploaded": {
      const enqueueResult = await options.queue?.enqueue(asset);
      if (enqueueResult?.kind === "failed") {
        return reject(enqueueResult.code, 503, "media processing job could not be queued");
      }
      const processing = await options.repository.save({ ...asset, status: "processing", errorCode: null });
      return { kind: "accepted", asset: processing };
    }
    case "missing":
      return reject(verification.code, 409, "uploaded media object was not found");
    case "failed":
      return reject(verification.code, 503, "uploaded media object could not be verified");
    default:
      return assertNever(verification);
  }
}

export async function markUploadCanceled(assetId: string, repository: MediaRepository): Promise<MediaAssetRecord> {
  const asset = await mustGetAsset(assetId, repository);
  return repository.save({ ...asset, status: "failed", errorCode: "upload_canceled" });
}

export function isMediaPublishable(asset: MediaAssetRecord): boolean {
  return asset.status === "ready" && asset.moderation.status === "approved" && Boolean(asset.native) && isAudioPublishable(asset);
}

export async function resolvePlayableMedia(
  asset: MediaAssetRecord,
  options: { readonly repository: MediaRepository; readonly probe: RemoteMediaProbe }
): Promise<{ readonly playable: boolean; readonly posterUrl: string; readonly cacheStatus: "hit" | "miss" | "stale" }> {
  const probeResult = await options.probe(asset.publicUrl);
  const cacheStatus = probeResult.kind === "ok" ? probeResult.cacheStatus : "miss";
  return {
    playable: isMediaPublishable(asset) && probeResult.kind === "ok" && probeResult.cacheStatus !== "stale",
    posterUrl: asset.poster?.url ?? FALLBACK_POSTER_URL,
    cacheStatus,
  };
}

function isAudioPublishable(asset: MediaAssetRecord): boolean {
  if (!asset.audio.hasAudio) return true;
  switch (asset.audio.license.source) {
    case "licensed":
      return asset.audio.license.reusable;
    case "user_declared":
      return true;
    case "instagram_library":
    case "unknown":
    case "none":
      return false;
    default:
      return assertNever(asset.audio.license.source);
  }
}

function accepted(asset: MediaAssetRecord, upload: AcceptedUpload["upload"], deduped: boolean): AcceptedUpload {
  return { kind: "accepted", asset, upload, deduped };
}

function reject(code: string, status: number, message: string): CompleteUploadResult {
  return { kind: "rejected", code, status, message };
}

async function mustGetAsset(assetId: string, repository: MediaRepository): Promise<MediaAssetRecord> {
  const asset = await repository.getById(assetId);
  if (!asset) throw new MediaAssetMissingError(assetId);
  return asset;
}

function stableAssetId(postId: string, contentHash: string): string {
  return `media_${postId}_${contentHash}`.replace(/[^a-z0-9]/gi, "").slice(0, 48);
}

function assertNever(value: never): never {
  throw new Error(`unexpected media processing result: ${JSON.stringify(value)}`);
}

export class MediaAssetMissingError extends Error {
  constructor(readonly assetId: string) {
    super(`media asset not found: ${assetId}`);
  }
}
