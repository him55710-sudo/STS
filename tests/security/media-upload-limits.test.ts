import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createInMemoryMediaRepository, createStaticUploadSigner, createSupabaseMediaProcessingQueue, initiateMediaUpload } from "../../lib/media";

const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: createSupabaseServerClientMock }));

import { POST as completeMediaUpload } from "../../app/api/media/complete/route";
import { POST as initiateMediaUploadRoute } from "../../app/api/media/initiate/route";

const pngBombHeader = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 96, 0, 0, 0, 96, 0, 0,
  8, 2, 0, 0, 0,
]);
const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAADZ9r0iAAAAD0lEQVR4nGP8z8AARLJABgAOBwEB4NfQIQAAAABJRU5ErkJggg==",
  "base64"
);
const corruptVideo = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);

const ownedMediaRow = {
  id: "asset-1",
  post_id: "post-1",
  storage_path: "creator-1/hash/look.png",
  public_url: "https://cdn.example.test/creator-1/hash/look.png",
  source: "user_upload",
  content_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  processing_state: "uploaded",
  posts: { creator_id: "creator-1" },
};

function jsonPost(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/media/complete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function installCompleteRouteSupabase(row: typeof ownedMediaRow | null) {
  const listMock = vi.fn().mockResolvedValue({ data: [{ name: "look.png" }], error: null });
  const computedHash = `sha256:${createHash("sha256").update(pngFixture).digest("hex")}`;
  const downloadMock = vi.fn().mockResolvedValue({ data: new Blob([pngFixture]), error: null });
  const rpcMock = vi.fn().mockResolvedValue({
    data: {
      ...ownedMediaRow,
      width: 4,
      height: 3,
      content_hash: computedHash,
      processing_state: "processing",
      processing_error: null,
    },
    error: null,
  });
  const mediaAssetsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  const fromMock = vi.fn((table: string) => {
    if (table === "media_assets") return mediaAssetsTable;
    throw new Error(`unexpected table ${table}`);
  });
  const storageFromMock = vi.fn().mockReturnValue({ download: downloadMock, list: listMock });
  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } } }) },
    from: fromMock,
    rpc: rpcMock,
    storage: { from: storageFromMock },
  });
  return { computedHash, downloadMock, fromMock, listMock, rpcMock, storageFromMock };
}

function installInitiateRouteSupabase() {
  const insertPayloads: unknown[] = [];
  const postQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "post-1" }, error: null }),
  };
  const existingQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const insertQuery = {
    insert: vi.fn((payload: unknown) => {
      insertPayloads.push(payload);
      return insertQuery;
    }),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "asset-1", storage_path: ownedMediaRow.storage_path, public_url: ownedMediaRow.public_url, processing_state: "uploaded" },
      error: null,
    }),
  };
  const fromMock = vi.fn((table: string) => {
    if (table === "posts") return postQuery;
    if (table === "media_assets") return insertQuery;
    throw new Error(`unexpected table ${table}`);
  });
  const storageBucket = {
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://uploads.example.test/signed" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: ownedMediaRow.public_url } }),
  };
  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } } }) },
    from: fromMock,
    storage: { from: vi.fn().mockReturnValue(storageBucket) },
  });
  return { existingQuery, insertPayloads, storageBucket };
}

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
});

describe("media upload safety limits", () => {
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

describe("media completion route safety", () => {
  it("persists initiated direct uploads as uploaded without trusting the caller hash for dedupe", async () => {
    const { existingQuery, insertPayloads, storageBucket } = installInitiateRouteSupabase();

    const response = await initiateMediaUploadRoute(new NextRequest("https://example.com/api/media/initiate", {
      method: "POST",
      body: JSON.stringify({
        postId: "post-1",
        fileName: "look.png",
        mimeType: "image/png",
        sizeBytes: 64,
        contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
      headers: { "Content-Type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(existingQuery.eq).not.toHaveBeenCalled();
    expect(insertPayloads).toHaveLength(1);
    expect(insertPayloads[0]).toMatchObject({ processing_state: "uploaded", content_hash: null });
    expect(insertPayloads[0]).not.toMatchObject({ processing_state: "ready" });
    expect(storageBucket.createSignedUploadUrl).toHaveBeenCalledOnce();
    expect(storageBucket.createSignedUploadUrl.mock.calls[0]?.[0]).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(body).toMatchObject({ status: "uploaded", asset: { processing_state: "uploaded" } });
  });

  it("rejects forged worker processing payload from the client", async () => {
    const { rpcMock } = installCompleteRouteSupabase(ownedMediaRow);

    const response = await completeMediaUpload(jsonPost({
      assetId: "asset-1",
      status: "ready",
      dimensions: { width: 1280, height: 720 },
      durationMs: 9_000,
      poster: { url: "https://cdn.example.test/poster.jpg", dimensions: { width: 640, height: 360 } },
      native: { url: "https://cdn.example.test/native.mp4", mimeType: "video/mp4", bytes: 32 },
      hls: { url: "https://cdn.example.test/master.m3u8", variants: [] },
      moderation: { status: "approved", sampledFramesMs: [] },
      audio: { hasAudio: false, license: { source: "none", reusable: true, note: null } },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid media completion request" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("verifies uploaded storage and computes the final hash before the atomic completion RPC", async () => {
    const { computedHash, downloadMock, listMock, rpcMock, storageFromMock } = installCompleteRouteSupabase(ownedMediaRow);

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(storageFromMock).toHaveBeenCalledWith("post-media");
    expect(listMock).toHaveBeenCalledWith("creator-1/hash", { search: "look.png", limit: 1 });
    expect(downloadMock).toHaveBeenCalledWith("creator-1/hash/look.png");
    const storageCallOrder = listMock.mock.invocationCallOrder[0];
    const rpcCallOrder = rpcMock.mock.invocationCallOrder[0];
    expect([storageCallOrder, rpcCallOrder].every((value) => typeof value === "number")).toBe(true);
    if (typeof storageCallOrder !== "number" || typeof rpcCallOrder !== "number") return;
    expect(storageCallOrder).toBeLessThan(rpcCallOrder);
    expect(rpcMock).toHaveBeenCalledWith("complete_media_upload_and_enqueue", {
      p_asset_id: "asset-1",
      p_content_hash: computedHash,
    });
    expect(body).toMatchObject({ status: "processing", publishable: false });
  });

  it("does not leave media processing when durable completion RPC fails", async () => {
    const mediaAssetsTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: ownedMediaRow, error: null }),
    };
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: { message: "queue insert failed" } });
    const fromMock = vi.fn((table: string) => {
      if (table === "media_assets") return mediaAssetsTable;
      throw new Error(`unexpected table ${table}`);
    });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } } }) },
      from: fromMock,
      rpc: rpcMock,
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({ data: new Blob([pngFixture]), error: null }),
          list: vi.fn().mockResolvedValue({ data: [{ name: "look.png" }], error: null }),
        }),
      },
    });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-1" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "media queue enqueue failed" });
    expect(rpcMock).toHaveBeenCalledOnce();
  });

  it("claims queued Supabase processing jobs through the lock-safe RPC", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        id: "job-1",
        media_asset_id: "asset-1",
        owner_id: "creator-1",
        post_id: "post-1",
        status: "running",
        attempts: 1,
        error_code: null,
      },
      error: null,
    });
    const fromMock = vi.fn(() => {
      throw new Error("claimNext must not use select-then-update");
    });
    const queueRepository = createSupabaseMediaProcessingQueue({ from: fromMock, rpc: rpcMock });

    const claimed = await queueRepository.claimNext();

    expect(claimed).toMatchObject({ id: "job-1", assetId: "asset-1", status: "running", attempts: 1 });
    expect(rpcMock).toHaveBeenCalledWith("claim_media_processing_job");
    expect(fromMock).not.toHaveBeenCalled();
  });
});
