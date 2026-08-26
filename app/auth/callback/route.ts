import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * OAuth 콜백 — Google 로그인 후 Supabase 가 이 주소로 돌려보낸다.
 * PKCE code 를 세션으로 교환하고 쿠키에 저장한 뒤 원래 가려던 곳으로 보낸다.
 *
 * Supabase 대시보드의 Authentication > URL Configuration 에
 * 이 경로(<origin>/auth/callback)가 Redirect URL 로 등록돼 있어야 한다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 로그인 후 돌아갈 앱 내부 경로 (open redirect 방지를 위해 "/"로 시작하는 값만 허용)
  const next = safeInternalPath(searchParams.get("next"));

  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const dest = new URL("/login", origin);
    dest.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(dest);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(new URL(next, origin));
    }
    const dest = new URL("/login", origin);
    dest.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(dest);
  }

  // code 도 error 도 없으면 비정상 진입 — 로그인으로 되돌린다.
  return NextResponse.redirect(new URL("/login", origin));
}
