import { describe, expect, it } from "vitest";
import {
  FALLBACK_POSTER_URL,
  completeMediaUpload,
  createInMemoryMediaProcessingQueue,
  createInMemoryMediaRepository,
  processNextMediaProcessingJob,
  processUploadedMedia,
  resolvePlayableMedia,
} from "../../lib/media";
import { createSupabaseMediaProcessingRunner } from "../../lib/media/worker";
import { MediaProcessorConfigurationError } from "../../lib/media/processor-adapter";
import type { SupabaseWorkerStore } from "../../lib/media/supabase-worker-adapter";
import type { MediaProcessingJob, MediaProcessorAdapter, RemoteMediaProbe } from "../../lib/media";
import type {
  MediaProcessingOutput,
  MediaProcessorAdapter as TypedMediaProcessorAdapter,
  ModerationRiskDecision,
} from "../../lib/media/processor-adapter";
import { initiateImage, initiateVideo, processor, remoteAsset, verifier, videoReadyResult } from "./media-test-helpers";

describe("media processing worker contracts", () => {
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

  it("worker retries failed processor results until the bounded terminal failure", async () => {
    let now = Date.parse("2026-09-02T00:00:00.000Z");
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue([], { now: () => now });
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

    const firstAttempt = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedProcessor });
    now += 1_000;
    const secondAttempt = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedProcessor });
    now += 2_000;
    const thirdAttempt = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedProcessor });

    expect(firstAttempt).toMatchObject({ kind: "retrying", assetId: initiated.asset.id, code: "transcode_failed" });
    expect(secondAttempt).toMatchObject({ kind: "retrying", assetId: initiated.asset.id, code: "transcode_failed" });
    expect(thirdAttempt).toMatchObject({ kind: "processed", assetId: initiated.asset.id, status: "failed" });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({
      status: "failed",
      errorCode: "transcode_failed",
    });
  });

  it("production runner persists variants and moderation before marking a job ready", async () => {
    const state = createFakeWorker();
    const output = createRunnerOutput({ kind: "approved", riskScore: 0.02, labels: [], sampledFramesMs: [0, 3_000] });
    const processor = recordingProcessor(state, async () => output);
    const runner = createSupabaseMediaProcessingRunner({ store: state.store, processor });

    const result = await runner();

    expect(result).toEqual({ kind: "processed", assetId: "remote-404", status: "ready" });
    expect(state.calls).toEqual(["claim", "load", "process", "variants", "moderation", "ready"]);
    expect(state.outputs).toEqual([output]);
    expect(state.moderations).toEqual([output.moderation]);
  });

  it("production runner cleans outputs and retries a processor failure", async () => {
    const state = createFakeWorker();
    const processor = recordingProcessor(state, async () => { throw new Error("transcode failed"); });
    const runner = createSupabaseMediaProcessingRunner({ store: state.store, processor });

    const result = await runner();

    expect(result).toEqual({ kind: "retrying", assetId: "remote-404", code: "media_processing_exception" });
    expect(state.calls).toEqual(["claim", "load", "process", "cleanup", "failed"]);
    expect(state.failureCodes).toEqual(["media_processing_exception"]);
  });

  it("production runner persists policy moderation, cleans outputs, and blocks the job", async () => {
    const state = createFakeWorker();
    const output = createRunnerOutput({ kind: "blocked", riskScore: 0.99, labels: ["policy_violation"], sampledFramesMs: [0, 1_000], reason: "moderation_rejected" });
    const processor = recordingProcessor(state, async () => output);
    const runner = createSupabaseMediaProcessingRunner({ store: state.store, processor });

    const result = await runner();

    expect(result).toEqual({ kind: "processed", assetId: "remote-404", status: "blocked" });
    expect(state.calls).toEqual(["claim", "load", "process", "moderation", "cleanup", "blocked"]);
    expect(state.moderations).toEqual([output.moderation]);
    expect(state.blockCodes).toEqual(["moderation_rejected"]);
  });

  it("production runner fails closed when no real processor is configured", () => {
    const worker = createFakeWorker();

    expect(() => createSupabaseMediaProcessingRunner({ store: worker.store })).toThrowError(MediaProcessorConfigurationError);
  });

  it("worker failure backs off before retrying and only succeeds after the job is claimable again", async () => {
    let now = Date.parse("2026-09-02T00:00:00.000Z");
    const repository = createInMemoryMediaRepository();
    const queueRepository = createInMemoryMediaProcessingQueue([], { now: () => now });
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
    let attempts = 0;
    const failedWorker: MediaProcessorAdapter = {
      async process() {
        attempts += 1;
        if (attempts === 1) throw new Error("worker crashed");
        return videoReadyResult;
      },
    };

    const firstAttempt = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedWorker });
    const duringBackoff = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedWorker });
    now += 1_000;
    const secondAttempt = await processNextMediaProcessingJob({ queue: queueRepository, repository, processor: failedWorker });

    expect(firstAttempt).toMatchObject({ kind: "retrying", assetId: initiated.asset.id, code: "media_processing_exception" });
    expect(duringBackoff).toEqual({ kind: "idle" });
    expect(secondAttempt).toMatchObject({ kind: "processed", assetId: initiated.asset.id, status: "ready" });
    await expect(repository.getById(initiated.asset.id)).resolves.toMatchObject({ status: "ready", errorCode: null });
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

function createFakeWorker() {
  const calls: string[] = [];
  const outputs: MediaProcessingOutput[] = [];
  const moderations: ModerationRiskDecision[] = [];
  const failureCodes: string[] = [];
  const blockCodes: string[] = [];
  const job = {
    id: "job-1", assetId: "remote-404", ownerId: "creator-1", postId: "post-1", status: "running",
    attempts: 1, errorCode: null, availableAt: new Date(0).toISOString(),
  } satisfies MediaProcessingJob;
  const store = {
    async claimJob() { calls.push("claim"); return job; },
    async loadAsset() { calls.push("load"); return remoteAsset(); },
    async persistVariants(_assetId, output) { calls.push("variants"); outputs.push(output); },
    async persistModeration(_assetId, moderation) { calls.push("moderation"); moderations.push(moderation); },
    async markReady() { calls.push("ready"); },
    async markFailed(_assetId, code) { calls.push("failed"); failureCodes.push(code); },
    async markBlocked(_assetId, code) { calls.push("blocked"); blockCodes.push(code); },
    async cleanupOutputs() { calls.push("cleanup"); },
  } satisfies SupabaseWorkerStore;
  return { calls, outputs, moderations, failureCodes, blockCodes, store };
}

function createRunnerOutput(moderation: ModerationRiskDecision): MediaProcessingOutput {
  return {
    original: { kind: "original", url: "https://cdn.example.test/variants/original.mp4", storagePath: "creator-1/hash/original.mp4", mimeType: "video/mp4", bytes: 32, dimensions: { width: 1280, height: 720 }, durationMs: 9_000 },
    poster: { kind: "poster", url: "https://cdn.example.test/variants/poster.jpg", storagePath: "creator-1/hash/poster.jpg", mimeType: "image/jpeg", bytes: 12, dimensions: { width: 640, height: 360 } },
    hls: { kind: "hls", url: "https://cdn.example.test/variants/master.m3u8", variants: [{ width: 1280, height: 720, bandwidth: 2_000_000, playlistUrl: "https://cdn.example.test/variants/720p.m3u8" }] },
    moderation,
  };
}

function recordingProcessor(state: { readonly calls: string[] }, run: () => Promise<MediaProcessingOutput>): TypedMediaProcessorAdapter {
  return { async process() { state.calls.push("process"); return run(); } };
}
