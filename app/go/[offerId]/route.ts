import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { parseSurface, prepareClick } from "@/lib/commerce/click";
import { isBackendConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * 어트리뷰션 클릭 라우터 — 모든 판매처 아웃바운드의 단일 관문.
 *
 *   viewer가 Buy 탭 → 이 라우트가 offerId + 컨텍스트 수신
 *   → click_id 생성 → commerce_clicks 저장(권위 기록)
 *   → provider 어댑터가 추적 URL 생성 → 303 리다이렉트.
 *
 * 로그인은 필요 없다: 익명 방문자는 1st-party sts_anon_id 쿠키로 어트리뷰션된다.
 * 저장 실패가 구매 흐름을 막지 않는다 — 클릭 유실은 로그로 남기고 이동은 보장한다.
 */

const ANON_COOKIE = "sts_anon_id";
const ANON_MAX_AGE = 60 * 60 * 24 * 365; // 1년

const capped = (v: string | null, max = 80) =>
  v && v.length <= max && v.length > 0 ? v : null;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const q = request.nextUrl.searchParams;

  // 익명 식별자 — 없으면 발급 (httpOnly·secure 1st-party 쿠키)
  const cookieStore = await cookies();
  let anonId = cookieStore.get(ANON_COOKIE)?.value ?? null;
  let anonIsNew = false;
  if (!anonId || anonId.length > 64) {
    anonId = crypto.randomUUID();
    anonIsNew = true;
  }

  // 로그인 세션 (있으면 viewer로 귀속 — 없어도 진행)
  let viewerId: string | null = null;
  const supabase = await createServerSupabase();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
  }

  const result = prepareClick(
    offerId,
    {
      viewerId,
      anonymousId: anonId,
      creatorId: capped(q.get("creator")),
      postId: capped(q.get("post")),
      objectId: capped(q.get("obj")),
      surface: parseSurface(q.get("sf")),
    },
    crypto.randomUUID()
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.status }
    );
  }

  // 권위 클릭 기록 — 백엔드 미설정(순수 데모)에서는 기록 없이 이동만 한다
  if (supabase && isBackendConfigured()) {
    const { error } = await supabase.from("commerce_clicks").insert(result.click.row);
    if (error) {
      console.warn(`[go] click insert failed (redirect proceeds): ${error.message}`);
    }
  } else {
    console.log(`[go] demo click (not persisted): ${result.click.row.offer_id}`);
  }

  const res = NextResponse.redirect(result.click.redirectUrl, 303);
  if (anonIsNew) {
    res.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ANON_MAX_AGE,
    });
  }
  return res;
}
