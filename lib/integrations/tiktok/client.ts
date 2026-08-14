import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decryptToken,
  encryptToken,
  isMockMode,
  isTikTokConfigured,
  serverSecret,
} from "./oauth-core";
import { refreshAccessToken } from "./oauth";
import {
  TIKTOK_API_BASE,
  TIKTOK_VIDEO_FIELDS,
  type ConnectionStatus,
  type TikTokConnection,
  type TikTokResult,
  type TikTokTokenResponse,
  type TikTokUserInfo,
  type TikTokVideo,
  type TikTokVideoListResponse,
} from "./types";

/**
 * TikTok Display API 클라이언트 + 연결 저장소 (서버 전용).
 *
 * 토큰은 DB에 AES-GCM 암호문으로만 저장되고, 읽기/쓰기는 서버 시크릿을 요구하는
 * SECURITY DEFINER RPC를 통해서만 이뤄진다. 복호화된 토큰은 이 모듈의 함수
 * 스코프를 벗어나지 않는다 — 라우트 응답에 실리는 일이 없다.
 *
 * 자격증명이 없으면 mock 모드로 동작한다 (개발/데모 전용, 프로덕션 불가).
 */

// ── 연결 저장/조회 ───────────────────────────────────────────────────────────

export async function saveConnection(
  supabase: SupabaseClient,
  userId: string,
  token: TikTokTokenResponse
): Promise<void> {
  const now = Date.now();
  const { error } = await supabase.rpc("upsert_external_connection", {
    p_secret: serverSecret(),
    p_user_id: userId,
    p_provider: "tiktok",
    p_provider_user_id: token.open_id,
    p_access_token: encryptToken(token.access_token),
    p_refresh_token: token.refresh_token ? encryptToken(token.refresh_token) : null,
    p_expires_at: new Date(now + token.expires_in * 1000).toISOString(),
    p_refresh_expires_at: token.refresh_expires_in
      ? new Date(now + token.refresh_expires_in * 1000).toISOString()
      : null,
    p_scopes: (token.scope ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  });
  if (error) throw new Error(`connection save failed: ${error.message}`);
}

interface RawConnection {
  provider_user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
  scopes: string[];
}

async function loadConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<TikTokConnection | null> {
  const { data, error } = await supabase.rpc("get_external_connection", {
    p_secret: serverSecret(),
    p_user_id: userId,
    p_provider: "tiktok",
  });
  if (error) throw new Error(`connection load failed: ${error.message}`);
  if (!data) return null;
  const row = data as RawConnection;
  return {
    providerUserId: row.provider_user_id,
    accessToken: decryptToken(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted ? decryptToken(row.refresh_token_encrypted) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    refreshExpiresAt: row.refresh_expires_at ? new Date(row.refresh_expires_at) : null,
    scopes: row.scopes ?? [],
  };
}

export async function disconnect(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_external_connection", {
    p_secret: serverSecret(),
    p_user_id: userId,
    p_provider: "tiktok",
  });
  if (error) throw new Error(`disconnect failed: ${error.message}`);
}

export async function connectionStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<ConnectionStatus> {
  if (isMockMode()) {
    const conn = await loadConnection(supabase, userId).catch(() => null);
    return conn
      ? { connected: true, providerUserId: conn.providerUserId, scopes: conn.scopes, mock: true }
      : { connected: false, mock: true };
  }
  const conn = await loadConnection(supabase, userId);
  if (!conn) return { connected: false };
  return {
    connected: true,
    providerUserId: conn.providerUserId,
    scopes: conn.scopes,
    expiresAt: conn.expiresAt?.toISOString() ?? null,
  };
}

/**
 * 유효한 액세스 토큰 확보 — 만료(60초 여유) 시 refresh_token으로 갱신하고 재저장한다.
 * refresh도 만료됐으면 재연결이 필요하다는 신호를 준다.
 */
async function validAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<TikTokResult<string>> {
  const conn = await loadConnection(supabase, userId);
  if (!conn) return { ok: false, status: 404, error: "not_connected" };

  const fresh = !conn.expiresAt || conn.expiresAt.getTime() - Date.now() > 60_000;
  if (fresh) return { ok: true, data: conn.accessToken };

  if (!conn.refreshToken || (conn.refreshExpiresAt && conn.refreshExpiresAt.getTime() < Date.now())) {
    return { ok: false, status: 401, error: "reauth_required" };
  }
  const refreshed = await refreshAccessToken(conn.refreshToken);
  if (!refreshed.ok) return { ok: false, status: 401, error: "reauth_required", detail: refreshed.detail };
  await saveConnection(supabase, userId, refreshed.data);
  return { ok: true, data: refreshed.data.access_token };
}

// ── Display API 호출 ─────────────────────────────────────────────────────────

async function apiPost<T>(
  accessToken: string,
  path: string,
  body: unknown,
  fields: readonly string[]
): Promise<TikTokResult<T>> {
  try {
    const url = new URL(`${TIKTOK_API_BASE}${path}`);
    url.searchParams.set("fields", fields.join(","));
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: T;
      error?: { code?: string; message?: string };
    };
    // TikTok은 200에도 error.code로 실패를 알린다 (code === "ok"가 성공)
    const code = json.error?.code;
    if (!res.ok || (code && code !== "ok")) {
      return {
        ok: false,
        status: res.status === 200 ? 400 : res.status,
        error: code ?? "api_error",
        detail: json.error?.message,
      };
    }
    return { ok: true, data: (json.data ?? {}) as T };
  } catch (e) {
    return { ok: false, status: 502, error: "network_error", detail: (e as Error).message };
  }
}

/** 본인 영상 목록 — POST /v2/video/list/ (create_time 내림차순, 커서 페이지네이션) */
export async function listVideos(
  supabase: SupabaseClient,
  userId: string,
  opts: { cursor?: number; maxCount?: number } = {}
): Promise<TikTokResult<TikTokVideoListResponse>> {
  if (isMockMode()) return { ok: true, data: mockVideoList(opts.cursor ?? 0) };

  const token = await validAccessToken(supabase, userId);
  if (!token.ok) return token;

  const body: Record<string, number> = { max_count: Math.min(opts.maxCount ?? 20, 20) };
  if (opts.cursor) body.cursor = opts.cursor;
  return apiPost<TikTokVideoListResponse>(token.data, "/v2/video/list/", body, TIKTOK_VIDEO_FIELDS);
}

/**
 * 특정 영상 조회 — POST /v2/video/query/.
 * 커버 이미지 URL은 만료되므로, 만료된 URL을 다시 쓰려면 이 API로 갱신해야 한다
 * (공식 문서가 안내하는 지원 경로 — 크롤링/추측 URL 조작 없음).
 */
export async function queryVideos(
  supabase: SupabaseClient,
  userId: string,
  videoIds: string[]
): Promise<TikTokResult<{ videos: TikTokVideo[] }>> {
  if (videoIds.length === 0) return { ok: true, data: { videos: [] } };
  if (isMockMode()) {
    const all = mockVideoList(0).videos;
    return { ok: true, data: { videos: all.filter((v) => videoIds.includes(v.id)) } };
  }

  const token = await validAccessToken(supabase, userId);
  if (!token.ok) return token;

  return apiPost<{ videos: TikTokVideo[] }>(
    token.data,
    "/v2/video/query/",
    { filters: { video_ids: videoIds.slice(0, 20) } },
    TIKTOK_VIDEO_FIELDS
  );
}

/** 사용자 기본 정보 — GET /v2/user/info/ */
export async function fetchUserInfo(
  accessToken: string
): Promise<TikTokResult<TikTokUserInfo>> {
  if (isMockMode()) {
    return { ok: true, data: { open_id: "mock-open-id", display_name: "TikTok 데모 계정" } };
  }
  try {
    const url = new URL(`${TIKTOK_API_BASE}/v2/user/info/`);
    url.searchParams.set("fields", "open_id,display_name,avatar_url,username");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: { user?: TikTokUserInfo };
      error?: { code?: string; message?: string };
    };
    if (!res.ok || !json.data?.user) {
      return { ok: false, status: res.status, error: json.error?.code ?? "user_info_failed" };
    }
    return { ok: true, data: json.data.user };
  } catch (e) {
    return { ok: false, status: 502, error: "network_error", detail: (e as Error).message };
  }
}

// ── mock 모드 데이터 ─────────────────────────────────────────────────────────
// 자격증명 없이 전체 아키텍처(연결→목록→선택→가져오기→드래프트)를 검증하기 위한 것.
// 커버 이미지는 저장소 내 실사 시드 사진을 사용한다 (외부 호출 없음).

const MOCK_VIDEOS: TikTokVideo[] = [
  { id: "mock-7412001", title: "가을 데일리 룩", video_description: "옥스포드 셔츠 코디", duration: 14, cover_image_url: "/looks/look1.jpg", share_url: "https://www.tiktok.com/@demo/video/mock-7412001", embed_link: "https://www.tiktok.com/embed/v2/mock-7412001", width: 1080, height: 1920, create_time: 1786550400 },
  { id: "mock-7412002", title: "헤리티지 아우터", video_description: "바버 왁스자켓", duration: 21, cover_image_url: "/looks/look2.jpg", share_url: "https://www.tiktok.com/@demo/video/mock-7412002", embed_link: "https://www.tiktok.com/embed/v2/mock-7412002", width: 1080, height: 1920, create_time: 1786464000 },
  { id: "mock-7412003", title: "미니멀 셋업", video_description: "블랙 와이드 팬츠", duration: 9, cover_image_url: "/looks/look3.jpg", share_url: "https://www.tiktok.com/@demo/video/mock-7412003", embed_link: "https://www.tiktok.com/embed/v2/mock-7412003", width: 1080, height: 1920, create_time: 1786377600 },
  { id: "mock-7412004", title: "아웃도어 시티", video_description: "플리스 + 카고", duration: 17, cover_image_url: "/looks/look4.jpg", share_url: "https://www.tiktok.com/@demo/video/mock-7412004", embed_link: "https://www.tiktok.com/embed/v2/mock-7412004", width: 1080, height: 1920, create_time: 1786291200 },
  { id: "mock-7412005", title: "프렌치 캐주얼", video_description: "니트와 데님", duration: 12, cover_image_url: "/looks/look6.jpg", share_url: "https://www.tiktok.com/@demo/video/mock-7412005", embed_link: "https://www.tiktok.com/embed/v2/mock-7412005", width: 1080, height: 1920, create_time: 1786204800 },
  { id: "mock-7412006", title: "가방 하울", video_description: "올해 산 가방들", duration: 33, cover_image_url: "/looks/look8.jpg", share_url: "https://www.tiktok.com/@demo/video/mock-7412006", embed_link: "https://www.tiktok.com/embed/v2/mock-7412006", width: 1080, height: 1920, create_time: 1786118400 },
];

function mockVideoList(cursor: number): TikTokVideoListResponse {
  const page = MOCK_VIDEOS.slice(cursor, cursor + 6);
  return {
    videos: page,
    cursor: cursor + page.length,
    has_more: cursor + page.length < MOCK_VIDEOS.length,
  };
}

export { isMockMode, isTikTokConfigured };
