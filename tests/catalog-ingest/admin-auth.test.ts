import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  createSupabaseServerClientMock,
  getUserMock,
  maybeSingleMock,
  fromMock,
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  getUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("../../lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

import { authorizeAdminRequest } from "../../lib/admin/authorize";

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin authorization", () => {
  it("accepts the local fixture token only from the request header", async () => {
    const request = new NextRequest("https://example.com/api/admin/catalog/preview", {
      headers: { "x-sts-admin-token": "fixture-token" },
    });

    const result = await authorizeAdminRequest(request, {
      localAdminToken: "fixture-token",
      production: false,
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("local");
  });

  it("rejects a missing local token even when browser cookies exist", async () => {
    const request = new NextRequest("https://example.com/api/admin/catalog/preview");

    const result = await authorizeAdminRequest(request, {
      localAdminToken: "fixture-token",
      production: false,
    });

    if (result.ok) {
      throw new Error("Expected a missing local token to be rejected");
    }
    expect(result.status).toBe(401);
    expect(result.reason).toBe("missing-local-token");
  });

  it("requires both a Supabase session and an admin role in production", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: getUserMock },
      from: fromMock,
    });
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
    });
    maybeSingleMock.mockResolvedValue({ data: { role: "admin" }, error: null });

    const result = await authorizeAdminRequest(new NextRequest("https://example.com/api/admin/catalog/preview"), {
      production: true,
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("production");
    expect(createSupabaseServerClientMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a signed-in non-admin session in production", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: getUserMock },
      from: fromMock,
    });
    getUserMock.mockResolvedValue({ data: { user: { id: "user-2" } } });
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
    });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await authorizeAdminRequest(new NextRequest("https://example.com/api/admin/catalog/preview"), {
      production: true,
    });

    if (result.ok) {
      throw new Error("Expected a non-admin session to be rejected");
    }
    expect(result.status).toBe(403);
    expect(result.reason).toBe("missing-admin-role");
  });
});
