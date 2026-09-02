import {
  createInMemoryMediaRepository,
  createStaticUploadSigner,
  initiateMediaUpload,
} from "../../lib/media";
import type {
  MediaAssetRecord,
  MediaProcessingEnqueueResult,
  MediaProcessingQueue,
  MediaProcessorAdapter,
  UploadedStorageVerification,
  UploadedStorageVerifier,
} from "../../lib/media";

export const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAADZ9r0iAAAAD0lEQVR4nGP8z8AARLJABgAOBwEB4NfQIQAAAABJRU5ErkJggg==",
  "base64"
);

export const pngBombHeader = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 96, 0, 0, 0, 96, 0, 0,
  8, 2, 0, 0, 0,
]);

export const mp4Fixture = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74,
]);

export const corruptVideo = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
export const signer = createStaticUploadSigner("https://uploads.example.test");

export const ownedMediaRow = {
  id: "asset-1",
  post_id: "post-1",
  storage_path: "creator-1/hash/look.png",
  public_url: "https://cdn.example.test/creator-1/hash/look.png",
  source: "user_upload",
  mime_type: "image/png",
  byte_size: pngFixture.byteLength,
  width: 4,
  height: 3,
  duration_ms: null,
  content_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  processing_state: "uploaded",
  posts: { creator_id: "creator-1" },
};

export const videoReadyResult = {
  kind: "ready",
  dimensions: { width: 1280, height: 720 },
  durationMs: 9_000,
  poster: { url: "https://cdn.example.test/posters/asset.jpg", dimensions: { width: 640, height: 360 } },
  native: { url: "https://cdn.example.test/native/asset.mp4", mimeType: "video/mp4", bytes: 32 },
  hls: {
    url: "https://cdn.example.test/hls/master.m3u8",
    variants: [
      { width: 640, height: 360, bandwidth: 800_000, playlistUrl: "https://cdn.example.test/hls/360p.m3u8" },
      { width: 1280, height: 720, bandwidth: 2_000_000, playlistUrl: "https://cdn.example.test/hls/720p.m3u8" },
    ],
  },
  moderation: { status: "approved", sampledFramesMs: [0, 3_000, 6_000, 9_000] },
  audio: { hasAudio: true, license: { source: "user_declared", reusable: false, note: "original upload audio" } },
} satisfies Awaited<ReturnType<MediaProcessorAdapter["process"]>>;

type InMemoryMediaRepository = ReturnType<typeof createInMemoryMediaRepository>;

export function processor(): MediaProcessorAdapter {
  return {
    async process(asset) {
      if (asset.mimeType.startsWith("video/")) return videoReadyResult;
      return {
        kind: "ready",
        dimensions: { width: 4, height: 3 },
        durationMs: null,
        poster: null,
        native: { url: asset.publicUrl, mimeType: asset.mimeType, bytes: asset.sizeBytes },
        hls: null,
        moderation: { status: "approved", sampledFramesMs: [] },
        audio: { hasAudio: false, license: { source: "none", reusable: true, note: null } },
      };
    },
  };
}

export async function initiateImage(repository: InMemoryMediaRepository) {
  return initiateMediaUpload({
    postId: "post-1",
    request: { fileName: "look.png", mimeType: "image/png", sizeBytes: pngFixture.byteLength, contentBytes: pngFixture },
    repository,
    signer,
    ownerId: "creator-1",
  });
}

export async function initiateVideo(repository: InMemoryMediaRepository) {
  return initiateMediaUpload({
    postId: "post-1",
    request: { fileName: "reel.mp4", mimeType: "video/mp4", sizeBytes: mp4Fixture.byteLength, durationMs: 9_000, contentBytes: mp4Fixture },
    repository,
    signer,
    ownerId: "creator-1",
  });
}

export function verifier(result: UploadedStorageVerification): UploadedStorageVerifier {
  return { async verifyUploaded() { return result; } };
}

export function queue(enqueuedAssets: string[]): MediaProcessingQueue {
  return {
    async enqueue(asset): Promise<MediaProcessingEnqueueResult> {
      enqueuedAssets.push(asset.id);
      return {
        kind: "enqueued",
        job: {
          id: `job-${enqueuedAssets.length}`,
          assetId: asset.id,
          ownerId: asset.ownerId,
          postId: asset.postId,
          status: "queued",
          attempts: 0,
          errorCode: null,
          availableAt: new Date(0).toISOString(),
        },
      };
    },
  };
}

export function remoteAsset(): MediaAssetRecord {
  return {
    id: "remote-404",
    ownerId: "creator-1",
    postId: "post-1",
    status: "failed",
    kind: "video",
    mimeType: "video/mp4",
    sizeBytes: 32,
    storagePath: "remote/reel.mp4",
    publicUrl: "https://cdn.example.test/missing.mp4",
    contentHash: "sha256:remote",
    dimensions: null,
    durationMs: null,
    poster: null,
    native: null,
    hls: null,
    moderation: { status: "pending", sampledFramesMs: [] },
    audio: { hasAudio: false, license: { source: "unknown", reusable: false, note: null } },
    errorCode: "remote_404",
  };
}
