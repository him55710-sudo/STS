import "server-only";

import { clientKey, clientSecret, redirectUri } from "./oauth-core";
import { TIKTOK_API_BASE, type TikTokResult, type TikTokTokenResponse } from "./types";

/**
 * TikTok OAuth (Login Kit for Web) — 서버 전용 진입점.
 * client_secret·access_token·refresh_token은 어떤 경로로도 클라이언트에 도달하지 않는다.
 *
 * web은 PKCE 대상이 아니므로(공식 문서: PKCE는 desktop/iOS/Android) CSRF 방어는
 * state 토큰으로 한다. state는 httpOnly 쿠키에 심고 콜백에서 상수시간 비교한다.
 *
 * 순수 로직(상태·URL·암복호화)은 oauth-core.ts에 있고 여기서 그대로 재노출한다.
 */
export {
  buildAuthorizeUrl,
  clientKey,
  clientSecret,
  createState,
  decryptToken,
  encryptToken,
  isMockMode,
  isTikTokAvailable,
  isTikTokConfigured,
  redirectUri,
  serverSecret,
  TIKTOK_STATE_COOKIE,
  verifyState,
} from "./oauth-core";

// ── 토큰 교환 / 갱신 ─────────────────────────────────────────────────────────

async function tokenRequest(
  body: Record<string, string>
): Promise<TikTokResult<TikTokTokenResponse>> {
  try {
    const res = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof json.access_token !== "string") {
      return {
        ok: false,
        status: res.status,
        error: String(json.error ?? "token_request_failed"),
        detail: String(json.error_description ?? JSON.stringify(json).slice(0, 300)),
      };
    }
    return { ok: true, data: json as unknown as TikTokTokenResponse };
  } catch (e) {
    return { ok: false, status: 502, error: "network_error", detail: (e as Error).message };
  }
}

export const exchangeCodeForToken = (code: string) =>
  tokenRequest({
    client_key: clientKey(),
    client_secret: clientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });

export const refreshAccessToken = (refreshToken: string) =>
  tokenRequest({
    client_key: clientKey(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
