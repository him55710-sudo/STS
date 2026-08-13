import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh proxy (Next.js 16: middleware 컨벤션의 후속).
 * 만료된 Supabase 액세스 토큰을 요청 흐름 안에서 갱신해 쿠키로 되돌린다.
 * 백엔드 미설정(순수 데모 모드) 시 아무것도 하지 않는다.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function proxy(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser()가 필요 시 토큰을 갱신하고 setAll로 새 쿠키를 흘려보낸다
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // 정적 자산·이미지·모델 파일에는 세션 갱신이 필요 없다
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|looks/|models/|mediapipe/|.*\\.(?:svg|png|jpg|jpeg|webp|wasm|tflite|bin|json)$).*)",
  ],
};
