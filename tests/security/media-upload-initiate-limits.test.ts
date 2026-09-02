import { describe, expect, it } from "vitest";
import {
  createInMemoryMediaRepository,
  createStaticUploadSigner,
  initiateMediaUpload,
} from "../../lib/media";
import { corruptVideo, pngBombHeader, pngFixture } from "../social/media-test-helpers";

describe("media upload initiation safety limits", () => {
  it("rejects invalid MIME before signing a storage upload", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "payload.svg", mimeType: "image/svg+xml", sizeBytes: 64 },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "unsupported_mime", status: 415 });
    expect(signer.calls).toBe(0);
  });

  it("rejects malformed caller-supplied content hashes before signing", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "look.png", mimeType: "image/png", sizeBytes: 64, contentHash: "sha256:../escape" },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_hash", status: 400 });
    expect(signer.calls).toBe(0);
  });

  it("requires caller-supplied sha256 hashes for no-byte direct upload initiation", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "look.png", mimeType: "image/png", sizeBytes: 64 },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_hash", status: 400 });
    expect(signer.calls).toBe(0);
  });

  it("does not persist caller-supplied direct upload hashes as dedupe hashes", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: {
        fileName: "look.png",
        mimeType: "image/png",
        sizeBytes: 64,
        contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") return;
    expect(result.asset.contentHash).toBeNull();
    expect(result.deduped).toBe(false);
    expect(signer.calls).toBe(1);
  });

  it("rejects forged caller hashes when upload bytes are available", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: {
        fileName: "look.png",
        mimeType: "image/png",
        sizeBytes: pngFixture.byteLength,
        contentBytes: pngFixture,
        contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "hash_mismatch", status: 400 });
    expect(signer.calls).toBe(0);
  });

  it("rejects malformed dimensions before signing", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: {
        fileName: "look.png",
        mimeType: "image/png",
        sizeBytes: 64,
        dimensions: { width: Number.NaN, height: 10 },
      },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "invalid_dimensions", status: 400 });
    expect(signer.calls).toBe(0);
  });

  it("rejects an oversized base64-style image payload before signing", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: { fileName: "huge.png", mimeType: "image/png", sizeBytes: 8 * 1024 * 1024 + 1 },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "too_large", status: 413 });
    expect(signer.calls).toBe(0);
  });

  it("rejects image decompression bombs by declared or parsed dimensions", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: {
        fileName: "bomb.png",
        mimeType: "image/png",
        sizeBytes: pngBombHeader.byteLength,
        contentBytes: pngBombHeader,
      },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "too_many_pixels", status: 413 });
    expect(signer.calls).toBe(0);
  });

  it("rejects corrupt local video bytes before persisting an uploaded asset", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: {
        fileName: "corrupt.mp4",
        mimeType: "video/mp4",
        sizeBytes: corruptVideo.byteLength,
        contentBytes: corruptVideo,
      },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "corrupt_media", status: 400 });
    expect(signer.calls).toBe(0);
  });

  it("rejects videos whose declared duration exceeds the server limit", async () => {
    const signer = createStaticUploadSigner("https://uploads.example.test");

    const result = await initiateMediaUpload({
      postId: "post-1",
      request: {
        fileName: "too-long.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024,
        durationMs: 121_000,
      },
      repository: createInMemoryMediaRepository(),
      signer,
      ownerId: "creator-1",
    });

    expect(result).toMatchObject({ kind: "rejected", code: "duration_too_long", status: 413 });
    expect(signer.calls).toBe(0);
  });
});
