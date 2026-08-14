import { NextResponse, type NextRequest } from "next/server";
import { connectionStatus, listVideos } from "@/lib/integrations/tiktok/client";
import { isMockMode, isTikTokAvailable } from "@/lib/integrations/tiktok/oauth";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * 본인 영상 목록 — Display API /v2/video/list/ 프록시.
 * 토큰은 서버에만 존재하고 응답에는 영상 메타데이터만 담긴다.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isTikTokAvailable()) {
    return NextResponse.json(
      { error: "not_configured", message: "TikTok 앱 자격증명이 설정되지 않았어요." },
      { status: 503 }
    );
  }

  const status = await connectionStatus(supabase, user.id).catch(() => ({ connected: false }));
  if (!status.connected) {
    return NextResponse.json({ error: "not_connected", status }, { status: 409 });
  }

  const cursorRaw = request.nextUrl.searchParams.get("cursor");
  const cursor = cursorRaw ? Number(cursorRaw) : undefined;
  const result = await listVideos(supabase, user.id, {
    cursor: Number.isFinite(cursor) ? cursor : undefined,
    maxCount: 20,
  });

  if (!result.ok) {
    const reauth = result.error === "reauth_required" || result.error === "not_connected";
    return NextResponse.json(
      { error: result.error, detail: result.detail, reauth },
      { status: reauth ? 409 : result.status }
    );
  }

  return NextResponse.json({
    videos: result.data.videos,
    cursor: result.data.cursor,
    hasMore: result.data.has_more,
    mock: isMockMode(),
  });
}
