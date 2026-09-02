import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMediaProcessingQueue } from "../../lib/media";

const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSupabaseMediaAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: createSupabaseServerClientMock }));
vi.mock("../../lib/media/admin-client", () => ({ createSupabaseMediaAdminClient: createSupabaseMediaAdminClientMock }));

import { POST as completeMediaUpload } from "../../app/api/media/complete/route";
import { POST as initiateMediaUploadRoute } from "../../app/api/media/initiate/route";

const pngFixture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAADZ9r0iAAAAD0lEQVR4nGP8z8AARLJABgAOBwEB4NfQIQAAAABJRU5ErkJggg==",
  "base64"
);

const ownedMediaRow = {
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
  content_hash: null,
  processing_state: "uploaded",
  posts: { creator_id: "creator-1" },
} as const;

function jsonPost(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/media/complete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function installInitiateRouteSupabase() {
  const postQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "post-1" }, error: null }),
  };
  const adminRpcMock = vi.fn().mockResolvedValue({
    data: {
      id: "asset-1",
      storage_path: "creator-1/upload/look.png",
      public_url: "https://cdn.example.test/look.png",
      width: null,
      height: null,
      content_hash: null,
      processing_state: "uploaded",
    },
    error: null,
  });
  const fromMock = vi.fn((table: string) => {
    if (table === "posts") return postQuery;
    throw new Error(`direct ${table} write path was used`);
  });
  const storageBucket = {
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://uploads.example.test/signed" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.test/look.png" } }),
  };
  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } } }) },
    from: fromMock,
    storage: { from: vi.fn().mockReturnValue(storageBucket) },
  });
  createSupabaseMediaAdminClientMock.mockReturnValue({ rpc: adminRpcMock });
  return { adminRpcMock, fromMock, storageBucket };
}

function installCompleteRouteSupabase(row: typeof ownedMediaRow | null) {
  const listMock = vi.fn().mockResolvedValue({ data: [{ name: "look.png" }], error: null });
  const computedHash = `sha256:${createHash("sha256").update(pngFixture).digest("hex")}`;
  const downloadMock = vi.fn().mockResolvedValue({ data: new Blob([pngFixture], { type: "image/png" }), error: null });
  const adminRpcMock = vi.fn().mockResolvedValue({
    data: {
      ...ownedMediaRow,
      content_hash: computedHash,
      processing_state: "processing",
      processing_error: null,
    },
    error: null,
  });
  const authenticatedRpcMock = vi.fn().mockRejectedValue(new Error("authenticated client must not complete media uploads"));
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
    rpc: authenticatedRpcMock,
    storage: { from: storageFromMock },
  });
  createSupabaseMediaAdminClientMock.mockReturnValue({ rpc: adminRpcMock });
  return { adminRpcMock, authenticatedRpcMock, computedHash, downloadMock, fromMock, listMock, storageFromMock };
}

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
  createSupabaseMediaAdminClientMock.mockReset();
});

describe("media upload route integration", () => {
  it("persists initiated direct uploads through the service-role RPC without trusting the caller hash", async () => {
    const { adminRpcMock, fromMock, storageBucket } = installInitiateRouteSupabase();

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
    expect(fromMock).not.toHaveBeenCalledWith("media_assets");
    expect(adminRpcMock).toHaveBeenCalledWith(
      "initiate_media_upload",
      expect.objectContaining({ p_post_id: "post-1", p_owner_id: "creator-1", p_mime_type: "image/png" })
    );
    expect(storageBucket.createSignedUploadUrl).toHaveBeenCalledOnce();
    expect(storageBucket.createSignedUploadUrl.mock.calls[0]?.[0]).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(body).toMatchObject({ status: "uploaded", asset: { processing_state: "uploaded" } });
  });

  it("rejects forged worker processing payload from the client", async () => {
    const { adminRpcMock } = installCompleteRouteSupabase(ownedMediaRow);

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
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("verifies uploaded storage and computes the final hash before the atomic completion RPC", async () => {
    const { adminRpcMock, authenticatedRpcMock, computedHash, downloadMock, listMock, storageFromMock } = installCompleteRouteSupabase(ownedMediaRow);

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(storageFromMock).toHaveBeenCalledWith("post-media");
    expect(listMock).toHaveBeenCalledWith("creator-1/hash", { search: "look.png", limit: 1 });
    expect(downloadMock).toHaveBeenCalledWith("creator-1/hash/look.png");
    const storageCallOrder = listMock.mock.invocationCallOrder[0];
    const rpcCallOrder = adminRpcMock.mock.invocationCallOrder[0];
    expect([storageCallOrder, rpcCallOrder].every((value) => typeof value === "number")).toBe(true);
    if (typeof storageCallOrder !== "number" || typeof rpcCallOrder !== "number") return;
    expect(storageCallOrder).toBeLessThan(rpcCallOrder);
    expect(adminRpcMock).toHaveBeenCalledWith("complete_media_upload_and_enqueue", {
      p_asset_id: "asset-1",
      p_content_hash: computedHash,
      p_owner_id: "creator-1",
    });
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(body).toMatchObject({ status: "processing", publishable: false });
  });

  it("does not leave media processing when durable completion RPC fails", async () => {
    const { adminRpcMock, authenticatedRpcMock } = installCompleteRouteSupabase(ownedMediaRow);
    adminRpcMock.mockResolvedValue({ data: null, error: { message: "queue insert failed" } });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-1" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "media queue enqueue failed" });
    expect(adminRpcMock).toHaveBeenCalledOnce();
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
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
