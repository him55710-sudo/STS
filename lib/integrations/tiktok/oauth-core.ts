import crypto from "node:crypto";
import { TIKTOK_AUTH_URL, TIKTOK_SCOPES } from "./types";

/**
 * TikTok OAuth 순수 로직 — state 생성/검증, 인증 URL 조립, 토큰 암복호화.
 *
 * 이 파일 자체는 부수효과가 없어 단위 테스트가 가능하다. 서버 전용 가드(`server-only`)는
 * 실제 진입점인 oauth.ts / client.ts에 있다. 여기서 읽는 환경변수는 전부
 * NEXT_PUBLIC_ 접두사가 없으므로 Next.js 클라이언트 번들에는 애초에 포함되지 않는다.
 */

export const TIKTOK_STATE_COOKIE = "sts_tiktok_state";

export const clientKey = () => process.env.TIKTOK_CLIENT_KEY ?? "";
export const clientSecret = () => process.env.TIKTOK_CLIENT_SECRET ?? "";
export const redirectUri = () => process.env.TIKTOK_REDIRECT_URI ?? "";
export const serverSecret = () =>
  process.env.TIKTOK_SERVER_SECRET ?? "sts-tiktok-server-dev-secret";

/** 실제 TikTok 앱 자격증명이 모두 있는가 */
export const isTikTokConfigured = () =>
  Boolean(clientKey() && clientSecret() && redirectUri());

/**
 * mock 모드 — 자격증명이 없을 때 아키텍처를 검증할 수 있게 하되,
 * 프로덕션(데모 모드 off)에서는 절대 켜지지 않는다. 가짜 성공을 만들지 않는다.
 */
export const isMockMode = () =>
  !isTikTokConfigured() &&
  (process.env.TIKTOK_MOCK_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true");

/** 자격증명도 mock도 없으면 통합 자체가 비활성 */
export const isTikTokAvailable = () => isTikTokConfigured() || isMockMode();

// ── 토큰 암호화 (AES-256-GCM, 서버 전용 키) ──────────────────────────────────
function encryptionKey(): Buffer {
  const raw = process.env.TIKTOK_TOKEN_ENC_KEY;
  if (raw) {
    const buf = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
    throw new Error("TIKTOK_TOKEN_ENC_KEY must be 32 bytes (hex or base64)");
  }
  if (isTikTokConfigured()) {
    throw new Error("TIKTOK_TOKEN_ENC_KEY is required when TikTok credentials are configured");
  }
  // mock 전용 파생 키 — 실 토큰을 다루지 않는 경로에서만 도달한다
  return crypto.createHash("sha256").update("sts-tiktok-mock-key").digest();
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptToken(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("malformed encrypted token");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// ── 인증 URL / state ─────────────────────────────────────────────────────────

export const createState = () => crypto.randomBytes(24).toString("base64url");

/** 상수시간 비교 — 타이밍 공격 방지 */
export function verifyState(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(TIKTOK_AUTH_URL);
  url.searchParams.set("client_key", clientKey());
  url.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}
