import { describe, expect, it } from "vitest";
import {
  FALLBACK_POSTER_URL,
  completeMediaUpload,
  createInMemoryMediaProcessingQueue,
  createInMemoryMediaRepository,
  createStaticUploadSigner,
  initiateMediaUpload,
  isMediaPublishable,
  markUploadCanceled,
  processNextMediaProcessingJob,
  processUploadedMedia,
  resolvePlayableMedia,
} from "../../lib/media";
import type {
  MediaAssetRecord,
  MediaProcessingEnqueueResult,
  MediaProcessingQueue,
  MediaProcessorAdapter,
  RemoteMediaProbe,
  UploadedStorageVerification,
  UploadedStorageVerifier,
} from "../../lib/media";

const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAADZ9r0iAAAAD0lEQVR4nGP8z8AARLJABgAOBwEB4NfQIQAAAABJRU5ErkJggg==",
  "base64"
);
const mp4Fixture = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74,
]);
const signer = createStaticUploadSigner("https://uploads.example.test");
const videoReadyResult = {
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

function processor(): MediaProcessorAdapter {
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

async function initiateImage(repository: ReturnType<typeof createInMemoryMediaRepository>) {
  return initiateMediaUpload({
    postId: "post-1",
    request: { fileName: "look.png", mimeType: "image/png", sizeBytes: pngFixture.byteLength, contentBytes: pngFixture },
    repository,
    signer,
    ownerId: "creator-1",
  });
}

async function initiateVideo(repository: ReturnType<typeof createInMemoryMediaRepository>) {
  return initiateMediaUpload({
    postId: "post-1",
    request: { fileName: "reel.mp4", mimeType: "video/mp4", sizeBytes: mp4Fixture.byteLength, durationMs: 9_000, contentBytes: mp4Fixture },
    repository,
    signer,
    ownerId: "creator-1",
  });
}

function verifier(result: UploadedStorageVerification): UploadedStorageVerifier {
  return { async verifyUploaded() { return result; } };
}

function queue(enqueuedAssets: string[]): MediaProcessingQueue {
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
        },
      };
    },
  };
}

function remoteAsset(): MediaAssetRecord {
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

describe("media processing contracts", () => {
  it("persists an uploaded image with dimensions, content hash, and a publishable ready state", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateImage(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const processed = await processUploadedMedia({ assetId: initiated.asset.id, repository, processor: processor() });

    expect(processed.status).toBe("ready");
    expect(processed.dimensions).toEqual({ width: 4, height: 3 });
    expect(processed.contentHash).toMatch(/^sha256:/);
    expect(isMediaPublishable(processed)).toBe(true);
  });

  it("keeps an initiated upload unpublished until worker processing finishes", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateImage(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    expect(initiated.asset.status).toBe("uploaded");
    expect(isMediaPublishable(initiated.asset)).toBe(false);
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({ status: "uploaded" });
  });

  it("moves a verified upload to processing without trusting worker fields", async () => {
    const repository = createInMemoryMediaRepository();
    const enqueuedAssets: string[] = [];
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: queue(enqueuedAssets),
    });

    expect(completed.kind).toBe("accepted");
    if (completed.kind !== "accepted") return;
    expect(completed.asset.status).toBe("processing");
    expect(completed.asset.native).toBeNull();
    expect(completed.asset.hls).toBeNull();
    expect(completed.asset.poster).toBeNull();
    expect(isMediaPublishable(completed.asset)).toBe(false);
    expect(enqueuedAssets).toEqual([initiated.asset.id]);
  });

  it("does not enqueue processing when the uploaded object is missing", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateImage(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "missing", code: "upload_missing" }),
      queue: { async enqueue() { throw new Error("queue must not receive missing uploads"); } },
    });

    expect(completed).toMatchObject({ kind: "rejected", code: "upload_missing", status: 409 });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({ status: "uploaded" });
  });

  it("keeps uploaded state when queue enqueue fails after storage verification", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateImage(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: {
        async enqueue(): Promise<MediaProcessingEnqueueResult> {
          return { kind: "failed", code: "queue_insert_failed" };
        },
      },
    });

    expect(completed).toMatchObject({ kind: "rejected", code: "queue_insert_failed", status: 503 });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({ status: "uploaded" });
  });

  it("produces poster, native video, HLS variants, frame moderation, and audio license metadata", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const processed = await processUploadedMedia({ assetId: initiated.asset.id, repository, processor: processor() });

    expect(processed.status).toBe("ready");
    expect(processed.poster?.url).toContain("/posters/");
    expect(processed.native?.mimeType).toBe("video/mp4");
    expect(processed.hls?.url.endsWith("master.m3u8")).toBe(true);
    expect(processed.hls?.variants.map((variant) => variant.height)).toEqual([360, 720]);
    expect(processed.moderation.sampledFramesMs).toEqual([0, 3_000, 6_000, 9_000]);
    expect(processed.audio.license.reusable).toBe(false);
  });

  it("does not publish ready media when Instagram-library audio is not reusable", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const restrictedAudioProcessor: MediaProcessorAdapter = {
      async process() {
        return {
          ...videoReadyResult,
          hls: null,
          audio: { hasAudio: true, license: { source: "instagram_library", reusable: false, note: "platform-scoped music" } },
        };
      },
    };

    const processed = await processUploadedMedia({ assetId: initiated.asset.id, repository, processor: restrictedAudioProcessor });

    expect(processed.status).toBe("ready");
    expect(isMediaPublishable(processed)).toBe(false);
  });

  it("blocks media when sampled frame moderation rejects it and keeps it unpublished", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;

    const blockedProcessor: MediaProcessorAdapter = {
      async process() {
        return { kind: "blocked", reason: "moderation_rejected", moderation: { status: "blocked", sampledFramesMs: [0, 1_000] } };
      },
    };

    const processed = await processUploadedMedia({ assetId: initiated.asset.id, repository, processor: blockedProcessor });

    expect(processed.status).toBe("blocked");
    expect(isMediaPublishable(processed)).toBe(false);
  });

  it("dedupes idempotent uploads by content hash and supports cancel then resume", async () => {
    const repository = createInMemoryMediaRepository();
    const first = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "first.png", mimeType: "image/png", sizeBytes: pngFixture.byteLength, contentBytes: pngFixture },
      repository,
      signer,
      ownerId: "creator-1",
    });
    expect(first.kind).toBe("accepted");
    if (first.kind !== "accepted") return;

    const canceled = await markUploadCanceled(first.asset.id, repository);
    expect(canceled.status).toBe("failed");
    expect(isMediaPublishable(canceled)).toBe(false);

    const resumed = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "again.png", mimeType: "image/png", sizeBytes: pngFixture.byteLength, contentBytes: pngFixture },
      repository,
      signer,
      ownerId: "creator-1",
    });

    expect(resumed.kind).toBe("accepted");
    if (resumed.kind !== "accepted") return;
    expect(resumed.deduped).toBe(true);
    expect(resumed.asset.id).toBe(first.asset.id);
    expect(resumed.asset.status).toBe("uploaded");
  });

  it("scopes dedupe to the owner and post for direct upload retries", async () => {
    const repository = createInMemoryMediaRepository();
    const first = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "first.png", mimeType: "image/png", sizeBytes: pngFixture.byteLength, contentBytes: pngFixture },
      repository,
      signer,
      ownerId: "creator-1",
    });
    expect(first.kind).toBe("accepted");
    if (first.kind !== "accepted") return;

    const differentPost = await initiateMediaUpload({
      postId: "post-2",
      request: { fileName: "second.png", mimeType: "image/png", sizeBytes: pngFixture.byteLength, contentBytes: pngFixture },
      repository,
      signer,
      ownerId: "creator-1",
    });

    expect(differentPost.kind).toBe("accepted");
    if (differentPost.kind !== "accepted") return;
    expect(differentPost.deduped).toBe(false);
    expect(differentPost.asset.postId).toBe("post-2");
    expect(differentPost.asset.id).not.toBe(first.asset.id);
  });

  it("worker consumes queued media jobs and records ready state transitions", async () => {
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;
    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: queueRepository,
    });
    expect(completed.kind).toBe("accepted");

    const worked = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: processor() });

    expect(worked).toMatchObject({ kind: "processed", assetId: initiated.asset.id, status: "ready" });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({ status: "ready" });
  });

  it("worker persists blocked moderation transitions and completes the queue job", async () => {
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;
    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: queueRepository,
    });
    expect(completed.kind).toBe("accepted");
    const blockedProcessor: MediaProcessorAdapter = {
      async process() {
        return { kind: "blocked", reason: "moderation_rejected", moderation: { status: "blocked", sampledFramesMs: [0, 1_000] } };
      },
    };

    const worked = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: blockedProcessor });

    expect(worked).toMatchObject({ kind: "processed", assetId: initiated.asset.id, status: "blocked" });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({
      status: "blocked",
      errorCode: "moderation_rejected",
    });
  });

  it("worker persists failed processor results and records a failed queue job", async () => {
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;
    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: queueRepository,
    });
    expect(completed.kind).toBe("accepted");
    const failedProcessor: MediaProcessorAdapter = {
      async process() {
        return { kind: "failed", code: "transcode_failed" };
      },
    };

    const worked = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedProcessor });

    expect(worked).toMatchObject({ kind: "processed", assetId: initiated.asset.id, status: "failed" });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({
      status: "failed",
      errorCode: "transcode_failed",
    });
  });

  it("worker failure marks the job failed and leaves a retry-observable failed asset state", async () => {
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;
    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: queueRepository,
    });
    expect(completed.kind).toBe("accepted");
    const failedWorker: MediaProcessorAdapter = {
      async process() {
        throw new Error("worker crashed");
      },
    };

    const worked = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedWorker });

    expect(worked).toMatchObject({ kind: "failed", assetId: initiated.asset.id, code: "media_processing_exception" });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({
      status: "failed",
      errorCode: "media_processing_exception",
    });
  });

  it("duplicate workers cannot process the same queued job twice", async () => {
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue();
    const initiated = await initiateVideo(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;
    const completed = await completeMediaUpload({
      assetId: initiated.asset.id,
      repository,
      verifier: verifier({ kind: "uploaded" }),
      queue: queueRepository,
    });
    expect(completed.kind).toBe("accepted");
    let processCalls = 0;
    const countingProcessor: MediaProcessorAdapter = {
      async process(asset) {
        processCalls += 1;
        return processor().process(asset);
      },
    };

    const results = await Promise.all([
      processNextMediaProcessingJob({ queue: queueRepository, repository, processor: countingProcessor }),
      processNextMediaProcessingJob({ queue: queueRepository, repository, processor: countingProcessor }),
    ]);

    expect(results).toContainEqual({ kind: "idle" });
    expect(results).toContainEqual({ kind: "processed", assetId: initiated.asset.id, status: "ready" });
    expect(processCalls).toBe(1);
  });

  it("returns a stable poster fallback for failed remote media without making it publishable", async () => {
    const probe: RemoteMediaProbe = async () => ({ kind: "failure", status: 404, reason: "remote asset was not found" });

    const resolved = await resolvePlayableMedia(remoteAsset(), { repository: createInMemoryMediaRepository(), probe });

    expect(resolved.posterUrl).toBe(FALLBACK_POSTER_URL);
    expect(resolved.playable).toBe(false);
    expect(resolved.cacheStatus).toBe("miss");
  });

  it("treats stale remote cache probes as not playable while preserving the poster", async () => {
    const repository = createInMemoryMediaRepository();
    const initiated = await initiateImage(repository);
    expect(initiated.kind).toBe("accepted");
    if (initiated.kind !== "accepted") return;
    const processed = await processUploadedMedia({ assetId: initiated.asset.id, repository, processor: processor() });
    const staleProbe: RemoteMediaProbe = async () => ({ kind: "ok", cacheStatus: "stale" });

    const resolved = await resolvePlayableMedia(processed, { repository, probe: staleProbe });

    expect(resolved.playable).toBe(false);
    expect(resolved.posterUrl).toBe(FALLBACK_POSTER_URL);
    expect(resolved.cacheStatus).toBe("stale");
  });
});
