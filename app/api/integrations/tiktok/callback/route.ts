import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { saveConnection } from "@/lib/integrations/tiktok/client";
import {
  exchangeCodeForToken,
  isMockMode,
  TIKTOK_STATE_COOKIE,
  verifyState,
} from "@/lib/integrations/tiktok/oauth";
import { TIKTOK_SCOPES } from "@/lib/integrations/tiktok/types";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * TikTok OAuth 콜백 — state 검증(CSRF) → 서버에서 code ↔ token 교환 → 암호화 저장.
 * 토큰은 이 라우트 밖으로 나가지 않으며 응답 본문/리다이렉트 URL에 실리지 않는다.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const back = (params: string) => NextResponse.redirect(new URL(`/create/tiktok?${params}`, request.url));

  const cookieStore = await cookies();
  const expected = cookieStore.get(TIKTOK_STATE_COOKIE)?.value;
  cookieStore.delete(TIKTOK_STATE_COOKIE);

  const error = q.get("error");
  if (error) {
    console.warn(`[tiktok] authorization denied: ${error}`);
    return back(`error=denied`);
  }

  const code = q.get("code");
  const state = q.get("state");
  if (!code || !verifyState(state ?? undefined, expected)) {
    return back("error=state_mismatch");
  }

  const supabase = await createServerSupabase();
  if (!supabase) return back("error=backend");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/create/tiktok", request.url));

  try {
    if (isMockMode()) {
      // mock 연결 — 실 토큰이 아님을 UI가 계속 표시한다
      await saveConnection(supabase, user.id, {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 86400,
        refresh_expires_in: 31536000,
        open_id: `mock-open-${user.id.slice(0, 8)}`,
        scope: TIKTOK_SCOPES.join(","),
        token_type: "Bearer",
      });
      return back("connected=mock");
    }

    const token = await exchangeCodeForToken(code);
    if (!token.ok) {
      console.warn(`[tiktok] token exchange failed: ${token.error} ${token.detail ?? ""}`);
      return back("error=token_exchange");
    }
    await saveConnection(supabase, user.id, token.data);
    return back("connected=1");
  } catch (e) {
    console.error(`[tiktok] callback failed: ${(e as Error).message}`);
    return back("error=save_failed");
  }
}
