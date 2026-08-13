import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * OAuth 콜백 — PKCE code를 세션으로 교환하고 쿠키에 심는다.
 * 실패 시 로그인 페이지로 사유와 함께 돌려보낸다 (가짜 성공 없음).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/profile";
  const next = rawNext.startsWith("/") ? rawNext : "/profile";

  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
      console.warn(`[auth] code exchange failed: ${error.message}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
