import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { pngBombHeader, pngFixture } from "../social/media-test-helpers";

const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSupabaseMediaAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: createSupabaseServerClientMock }));
vi.mock("../../lib/media/admin-client", () => ({ createSupabaseMediaAdminClient: createSupabaseMediaAdminClientMock }));

import { POST as completeMediaUpload } from "../../app/api/media/complete/route";

const VIDEO_ROW = {
  id: "asset-video-1",
  post_id: "post-1",
  storage_path: "creator-1/hash/reel.mp4",
  public_url: "https://cdn.example.test/creator-1/hash/reel.mp4",
  source: "user_upload",
  mime_type: "video/mp4",
  width: null,
  height: null,
  duration_ms: 9_000,
  content_hash: null,
  processing_state: "uploaded",
  posts: { creator_id: "creator-1" },
} as const;

const WEBM_ROW = {
  ...VIDEO_ROW,
  id: "asset-webm-1",
  storage_path: "creator-1/hash/reel.webm",
  public_url: "https://cdn.example.test/creator-1/hash/reel.webm",
  mime_type: "video/webm",
} as const;

const IMAGE_ROW = {
  id: "asset-image-1",
  post_id: "post-1",
  storage_path: "creator-1/hash/look.png",
  public_url: "https://cdn.example.test/creator-1/hash/look.png",
  source: "user_upload",
  mime_type: "image/png",
  width: 4,
  height: 3,
  duration_ms: null,
  content_hash: null,
  processing_state: "uploaded",
  posts: { creator_id: "creator-1" },
} as const;

type StoredMediaRow = typeof VIDEO_ROW | typeof WEBM_ROW | typeof IMAGE_ROW;
type RouteFixtureOptions = {
  readonly row?: StoredMediaRow;
  readonly declaredSizeBytes?: number;
  readonly actualMimeType?: string;
};

function jsonPost(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/media/complete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function installCompleteRouteSupabase(bytes: Buffer, options: RouteFixtureOptions = {}) {
  const row = { ...(options.row ?? VIDEO_ROW), byte_size: options.declaredSizeBytes ?? bytes.byteLength };
  const objectName = row.storage_path.slice(row.storage_path.lastIndexOf("/") + 1);
  const authenticatedRpcMock = vi.fn().mockRejectedValue(new Error("authenticated client must not complete media uploads"));
  const adminRpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const mediaAssetsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  const storageBucket = {
    list: vi.fn().mockResolvedValue({ data: [{ name: objectName }], error: null }),
    download: vi.fn().mockResolvedValue({
      data: new Blob([new Uint8Array(Array.from(bytes))], { type: options.actualMimeType ?? row.mime_type }),
      error: null,
    }),
  };
  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "media_assets") return mediaAssetsTable;
      throw new Error(`unexpected table ${table}`);
    }),
    rpc: authenticatedRpcMock,
    storage: { from: vi.fn().mockReturnValue(storageBucket) },
  });
  createSupabaseMediaAdminClientMock.mockReturnValue({ rpc: adminRpcMock });
  return { adminRpcMock, authenticatedRpcMock, storageBucket };
}

function mp4WithDuration(durationSeconds: number): Buffer {
  const timescale = 1_000;
  const duration = durationSeconds * timescale;
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  ]);
  const mvhdPayload = Buffer.alloc(100);
  mvhdPayload.writeUInt32BE(timescale, 12);
  mvhdPayload.writeUInt32BE(duration, 16);
  const mvhd = box("mvhd", mvhdPayload);
  return Buffer.concat([ftyp, box("moov", mvhd)]);
}

function box(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(payload.byteLength + header.byteLength, 0);
  header.write(type, 4, 4, "ascii");
  return Buffer.concat([header, payload]);
}

function webmWithDuration(durationSeconds: number): Buffer {
  const duration = Buffer.alloc(8);
  duration.writeDoubleBE(durationSeconds, 0);
  const info = ebmlElement(
    Buffer.from([0x15, 0x49, 0xa9, 0x66]),
    ebmlElement(Buffer.from([0x44, 0x89]), duration)
  );
  return Buffer.concat([
    ebmlElement(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from([0x42, 0x86, 0x81, 0x01])),
    ebmlElement(Buffer.from([0x18, 0x53, 0x80, 0x67]), info),
  ]);
}

function ebmlElement(id: Buffer, payload: Buffer): Buffer {
  return Buffer.concat([id, Buffer.from([0x80 | payload.byteLength]), payload]);
}

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
  createSupabaseMediaAdminClientMock.mockReset();
});

describe("stored media validation", () => {
  it("rejects stored objects whose declared size does not match downloaded bytes before enqueue", async () => {
    const { adminRpcMock, authenticatedRpcMock } = installCompleteRouteSupabase(pngFixture, {
      row: IMAGE_ROW,
      declaredSizeBytes: pngFixture.byteLength + 1,
    });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-image-1" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_size", message: "declared media size did not match payload" });
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("rejects stored objects whose download MIME differs from the media record before enqueue", async () => {
    const { adminRpcMock, authenticatedRpcMock } = installCompleteRouteSupabase(pngFixture, {
      row: IMAGE_ROW,
      actualMimeType: "image/jpeg",
    });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-image-1" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "mime_mismatch", message: "stored media MIME did not match declared MIME" });
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("rejects stored images whose parsed dimensions exceed the pixel cap before enqueue", async () => {
    const { adminRpcMock, authenticatedRpcMock } = installCompleteRouteSupabase(pngBombHeader, { row: IMAGE_ROW });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-image-1" }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "too_many_pixels", message: "media dimensions exceed safety limits" });
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("rejects stored objects whose byte signature does not match the media record before enqueue", async () => {
    const mp4Bytes = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    ]);
    const { adminRpcMock, authenticatedRpcMock } = installCompleteRouteSupabase(mp4Bytes, { row: IMAGE_ROW });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-image-1" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "corrupt_media", message: "media signature did not match MIME type" });
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("rejects stored videos whose duration cannot be verified before enqueue", async () => {
    const ftypOnlyVideo = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    ]);
    const { adminRpcMock, authenticatedRpcMock } = installCompleteRouteSupabase(ftypOnlyVideo);

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-video-1" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "video_metadata_unverified",
      message: "stored video duration could not be verified",
    });
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("rejects stored videos whose actual metadata duration exceeds the limit before enqueue", async () => {
    const { adminRpcMock, authenticatedRpcMock, storageBucket } = installCompleteRouteSupabase(mp4WithDuration(121));

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-video-1" }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "duration_too_long", message: "video duration exceeds safety limits" });
    expect(storageBucket.download).toHaveBeenCalledWith("creator-1/hash/reel.mp4");
    expect(authenticatedRpcMock).not.toHaveBeenCalled();
    expect(adminRpcMock).not.toHaveBeenCalled();
  });

  it("accepts stored WebM when EBML duration metadata is within limits before enqueue", async () => {
    const { adminRpcMock } = installCompleteRouteSupabase(webmWithDuration(42), { row: WEBM_ROW });
    adminRpcMock.mockResolvedValueOnce({
      data: {
        id: WEBM_ROW.id,
        storage_path: WEBM_ROW.storage_path,
        public_url: WEBM_ROW.public_url,
        width: null,
        height: null,
        content_hash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        processing_state: "processing",
        processing_error: null,
      },
      error: null,
    });

    const response = await completeMediaUpload(jsonPost({ assetId: "asset-webm-1" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "processing", publishable: false });
    expect(adminRpcMock).toHaveBeenCalledOnce();
  });
});
