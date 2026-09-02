import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSupabaseMediaAdminClientMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: createSupabaseServerClientMock }));
vi.mock("../../lib/media/admin-client", () => ({ createSupabaseMediaAdminClient: createSupabaseMediaAdminClientMock }));

import { POST as initiateMediaUploadRoute } from "../../app/api/media/initiate/route";

const validHash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function jsonPost(): NextRequest {
  return new NextRequest("https://example.com/api/media/initiate", {
    method: "POST",
    body: JSON.stringify({
      postId: "post-1",
      fileName: "look.png",
      mimeType: "image/png",
      sizeBytes: 64,
      contentHash: validHash,
    }),
    headers: { "Content-Type": "application/json" },
  });
}

function installRouteClients(adminClient: unknown) {
  const postQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "post-1" }, error: null }),
  };
  const storageBucket = {
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://uploads.example.test/signed" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.test/look.png" } }),
  };
  const authenticatedRpc = vi.fn().mockRejectedValue(new Error("authenticated client must not initiate media uploads"));
  const fromMock = vi.fn((table: string) => {
    if (table === "posts") return postQuery;
    throw new Error(`direct ${table} write path was used`);
  });

  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "creator-1" } } }) },
    from: fromMock,
    rpc: authenticatedRpc,
    storage: { from: vi.fn().mockReturnValue(storageBucket) },
  });
  createSupabaseMediaAdminClientMock.mockReturnValue(adminClient);
  return { authenticatedRpc, fromMock, storageBucket };
}

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
  createSupabaseMediaAdminClientMock.mockReset();
});

describe("media upload initiation authorization boundary", () => {
  it("uses the service-role RPC and never direct-writes through the authenticated client", async () => {
    // Given an authenticated owner, a valid upload request, and a service-role RPC.
    const adminRpc = vi.fn().mockResolvedValue({
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
    const { authenticatedRpc, fromMock, storageBucket } = installRouteClients({ rpc: adminRpc });

    // When the owner initiates the upload.
    const response = await initiateMediaUploadRoute(jsonPost());

    // Then creation is performed only by the service-role RPC.
    expect(response.status).toBe(201);
    expect(fromMock).not.toHaveBeenCalledWith("media_assets");
    expect(authenticatedRpc).not.toHaveBeenCalled();
    expect(adminRpc).toHaveBeenCalledWith(
      "initiate_media_upload",
      expect.objectContaining({ p_post_id: "post-1", p_owner_id: "creator-1", p_mime_type: "image/png" })
    );
    expect(storageBucket.createSignedUploadUrl).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ status: "uploaded", asset: { id: "asset-1" } });
  });

  it("fails closed before signing when the service-role client is unavailable", async () => {
    // Given an authenticated owner without a configured service-role client.
    const { fromMock, storageBucket } = installRouteClients(null);

    // When the owner initiates the upload.
    const response = await initiateMediaUploadRoute(jsonPost());

    // Then no upload URL or direct media write is created.
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "media upload admin client unavailable" });
    expect(fromMock).not.toHaveBeenCalledWith("media_assets");
    expect(storageBucket.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});
