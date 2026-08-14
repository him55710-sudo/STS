import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthorizeUrl,
  createState,
  isMockMode,
  isTikTokConfigured,
  TIKTOK_STATE_COOKIE,
} from "@/lib/integrations/tiktok/oauth";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * TikTok 연결 시작 — state 발급 후 공식 인증 화면으로 보낸다.
 * 자격증명이 없으면 mock 콜백으로 보내되(개발/데모 전용) 절대 실연동인 척하지 않는다.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/create/tiktok", request.url));
  }

  if (!isTikTokConfigured() && !isMockMode()) {
    // 자격증명 없음 + mock도 비활성 → 정직하게 사유를 알린다
    return NextResponse.redirect(new URL("/create/tiktok?error=not_configured", request.url));
  }

  const state = createState();
  const cookieStore = await cookies();
  cookieStore.set(TIKTOK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10분
  });

  if (isMockMode()) {
    const mock = new URL("/api/integrations/tiktok/callback", request.url);
    mock.searchParams.set("code", "mock-auth-code");
    mock.searchParams.set("state", state);
    mock.searchParams.set("mock", "1");
    return NextResponse.redirect(mock);
  }

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
