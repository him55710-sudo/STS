"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 *
 * @supabase/ssr 은 세션을 localStorage 가 아니라 쿠키에 저장하므로
 * 서버(Route Handler·미들웨어)와 세션을 공유한다. 토큰 갱신도 자동.
 *
 * 환경변수(둘 다 NEXT_PUBLIC_ 이어야 브라우저 번들에 포함됨):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY  (publishable/anon key)
 */
let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요."
    );
  }

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}

/** 환경변수가 설정돼 있어 실제 OAuth 로그인이 가능한지 여부 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
