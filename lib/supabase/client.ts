"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isBackendConfigured } from "@/lib/config";

/**
 * 브라우저 Supabase 클라이언트 (싱글톤).
 * anon/publishable 키만 사용한다 — service-role 키는 어떤 경로로도 클라이언트에 오지 않는다.
 * 백엔드 미설정 시 null을 반환하고 호출부는 데모 경로로 동작한다.
 */
let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!isBackendConfigured()) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
