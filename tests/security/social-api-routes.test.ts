import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const createSupabaseServerClientMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/supabase/server", () => ({ createSupabaseServerClient: createSupabaseServerClientMock }));

import { POST as recordInteractionRoute } from "../../app/api/social/interactions/route";
import { POST as rankingRoute } from "../../app/api/social/ranking/route";
import { POST as recordStoryViewRoute } from "../../app/api/social/stories/views/route";

function jsonPost(path: string, body: unknown): NextRequest {
  return new NextRequest(`https://example.test${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  createSupabaseServerClientMock.mockReset();
});

describe("social API routes", () => {
  it("rejects interaction writes without an authenticated Supabase user", async () => {
    const rpcMock = vi.fn();
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      rpc: rpcMock,
    });

    const response = await recordInteractionRoute(jsonPost("/api/social/interactions", {
      kind: "like",
      targetId: "post-1",
      idempotencyKey: "like-1",
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "missing-session" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("records an authenticated like through the social interaction service", async () => {
    const postQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "post-1",
          creator_id: "creator-1",
          visibility: "public",
          publish_state: "published",
          display_state: "approved",
          published_at: "2026-09-01T10:00:00.000Z",
          expires_at: null,
          content_sources: { source_kind: "user_upload" },
          content_rights: {
            rights_status: "approved",
            expires_at: null,
            takedown_at: null,
            can_display: true,
            can_use_for_commerce_matching: true,
            can_redistribute: true,
          },
        },
        error: null,
      }),
    };
    const rpcMock = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "interaction-1",
          actor_id: "viewer-1",
          operation: "like",
          target_id: "post-1",
          idempotency_key: "like-1",
          moderation_state: "approved",
          created_at: "2026-09-01T12:00:00.000Z",
        },
        error: null,
      });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "viewer-1" } } }) },
      from: vi.fn().mockReturnValue(postQuery),
      rpc: rpcMock,
    });

    const response = await recordInteractionRoute(jsonPost("/api/social/interactions", {
      kind: "like",
      targetId: "post-1",
      idempotencyKey: "like-1",
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(rpcMock).toHaveBeenCalledWith("record_social_interaction", expect.objectContaining({
      p_actor_id: "viewer-1",
      p_operation: "like",
      p_target_id: "post-1",
      p_idempotency_key: "like-1",
      p_moderation_state: "approved",
    }));
    expect(body).toMatchObject({ interaction: { operation: "like" }, idempotent: false });
  });

  it("fails closed instead of returning success when interaction persistence fails", async () => {
    const postQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "post-1",
          creator_id: "creator-1",
          visibility: "public",
          publish_state: "published",
          display_state: "approved",
          published_at: "2026-09-01T10:00:00.000Z",
          expires_at: null,
          content_sources: { source_kind: "user_upload" },
          content_rights: {
            rights_status: "approved",
            expires_at: null,
            takedown_at: null,
            can_display: true,
            can_use_for_commerce_matching: true,
            can_redistribute: true,
          },
        },
        error: null,
      }),
    };
    const rpcMock = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "database write failed" } });
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "viewer-1" } } }) },
      from: vi.fn().mockReturnValue(postQuery),
      rpc: rpcMock,
    });

    await expect(recordInteractionRoute(jsonPost("/api/social/interactions", {
      kind: "like",
      targetId: "post-1",
      idempotencyKey: "like-fails",
    }))).rejects.toThrow("record_social_interaction failed");
  });

  it("records one anonymous story view per viewer session through the local repository fallback", async () => {
    const firstResponse = await recordStoryViewRoute(jsonPost("/api/social/stories/views", {
      storyId: "social-seed-story-1",
      viewerSessionId: "viewer-session-1",
      idempotencyKey: "story-view-1",
    }));
    const secondResponse = await recordStoryViewRoute(jsonPost("/api/social/stories/views", {
      storyId: "social-seed-story-1",
      viewerSessionId: "viewer-session-1",
      idempotencyKey: "story-view-1",
    }));

    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.view).toMatchObject({ storyId: "social-seed-story-1", viewerSessionId: "viewer-session-1", idempotent: false });
    expect(secondBody.view).toMatchObject({ storyId: "social-seed-story-1", viewerSessionId: "viewer-session-1", idempotent: true });
  });

  it("requires authentication before returning personalized ranking", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await rankingRoute(jsonPost("/api/social/ranking", { posts: [], events: [], follows: [], mode: "for_you" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "missing-session" });
  });
});
