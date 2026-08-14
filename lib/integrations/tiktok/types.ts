/**
 * TikTok 공식 API 타입 — Login Kit(web) + Display API v2.
 *
 * 확인된 공식 스펙 (2026-08, developers.tiktok.com):
 *   인증  : GET  https://www.tiktok.com/v2/auth/authorize/
 *           (client_key, scope, response_type=code, redirect_uri, state)
 *           ※ PKCE는 desktop/iOS/Android 대상이며 web은 미적용 —
 *             web은 state(CSRF) + 서버 보관 client_secret의 confidential client 모델.
 *   토큰  : POST https://open.tiktokapis.com/v2/oauth/token/
 *           (client_key, client_secret, code, grant_type, redirect_uri)
 *           → access_token, expires_in, open_id, refresh_expires_in,
 *             refresh_token, scope, token_type
 *   영상  : POST https://open.tiktokapis.com/v2/video/list/   (cursor·max_count·has_more)
 *           POST https://open.tiktokapis.com/v2/video/query/  (커버 URL TTL 갱신)
 *   사용자: GET  https://open.tiktokapis.com/v2/user/info/
 *
 * ⚠️ Display API는 **원본 영상 파일을 제공하지 않는다**. 재생은 embed_link/share_url로만
 *    가능하고, 우리가 분석할 수 있는 정지 이미지는 cover_image_url 뿐이다.
 *    cover_image_url은 만료되므로 /v2/video/query/로 갱신하거나 우리 스토리지에 복사한다.
 */

export const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_API_BASE = "https://open.tiktokapis.com";

/** 신원 확인 + 본인 영상 목록에 필요한 최소 스코프 */
export const TIKTOK_SCOPES = ["user.info.basic", "video.list"] as const;

/** /v2/video/list/ · /v2/video/query/ 에서 요청하는 필드 */
export const TIKTOK_VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "duration",
  "cover_image_url",
  "share_url",
  "embed_link",
  "width",
  "height",
  "create_time",
] as const;

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  share_url?: string;
  embed_link?: string;
  width?: number;
  height?: number;
  /** unix seconds */
  create_time?: number;
}

export interface TikTokVideoListResponse {
  videos: TikTokVideo[];
  cursor: number;
  has_more: boolean;
}

export interface TikTokUserInfo {
  open_id: string;
  display_name?: string;
  avatar_url?: string;
  username?: string;
}

/** 저장된 연결 (토큰은 복호화된 상태로만 서버 메모리에 존재) */
export interface TikTokConnection {
  providerUserId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshExpiresAt: Date | null;
  scopes: string[];
}

/** 클라이언트에 노출해도 안전한 연결 상태 (토큰 없음) */
export interface ConnectionStatus {
  connected: boolean;
  providerUserId?: string;
  scopes?: string[];
  expiresAt?: string | null;
  connectedAt?: string;
  /** mock 모드로 동작 중인지 — UI가 정직하게 표시한다 */
  mock?: boolean;
}

export type TikTokResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; detail?: string };
