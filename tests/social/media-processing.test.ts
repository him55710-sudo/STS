import { describe, expect, it } from "vitest";
import {
  completeMediaUpload,
  createInMemoryMediaRepository,
  initiateMediaUpload,
  isMediaPublishable,
  markUploadCanceled,
  processUploadedMedia,
} from "../../lib/media";
import type { MediaProcessingEnqueueResult, MediaProcessorAdapter } from "../../lib/media";
import { initiateImage, initiateVideo, pngFixture, processor, queue, signer, verifier, videoReadyResult } from "./media-test-helpers";

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

});
