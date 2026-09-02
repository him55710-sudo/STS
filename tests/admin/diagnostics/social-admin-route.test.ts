import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "../../../app/api/admin/social/diagnostics/route";

afterEach(() => {
  delete process.env.STS_ADMIN_TOKEN;
});

describe("social admin diagnostics route", () => {
  it("rejects non-admin reads and does not expose diagnostics", async () => {
    process.env.STS_ADMIN_TOKEN = "fixture-token";

    const response = await GET(new NextRequest("https://example.com/api/admin/social/diagnostics"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "missing-local-token" });
  });

  it("returns redacted diagnostics for an authorized local admin", async () => {
    process.env.STS_ADMIN_TOKEN = "fixture-token";

    const response = await GET(
      new NextRequest("https://example.com/api/admin/social/diagnostics", {
        headers: { "x-sts-admin-token": "fixture-token" },
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.counts.pendingRights).toBeGreaterThan(0);
    expect(body.reviewItems[0].sourceUrl).toMatch(/^https:\/\//);
    expect(JSON.stringify(body)).not.toContain("providerToken");
    expect(JSON.stringify(body)).not.toContain("rawPayload");
  });

  it("rejects non-admin mutations before parsing rights actions", async () => {
    process.env.STS_ADMIN_TOKEN = "fixture-token";

    const response = await POST(
      new NextRequest("https://example.com/api/admin/social/diagnostics", {
        method: "POST",
        body: JSON.stringify({ action: "approve_display", postId: "post-pending-rights" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("applies a local admin rights action and returns a redacted audit record", async () => {
    process.env.STS_ADMIN_TOKEN = "fixture-token";

    const response = await POST(
      new NextRequest("https://example.com/api/admin/social/diagnostics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-sts-admin-token": "fixture-token",
        },
        body: JSON.stringify({ action: "approve_display", postId: "post-pending-rights" }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.item.rights.status).toBe("approved");
    expect(body.item.publicVerified).toBe(true);
    expect(body.auditEvent).toMatchObject({
      action: "approve_display",
      postId: "post-pending-rights",
    });
    expect(JSON.stringify(body)).not.toContain("providerToken");
    expect(JSON.stringify(body)).not.toContain("rawPayload");
  });
});
