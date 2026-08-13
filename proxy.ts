import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 Proxy (구 middleware). 매 요청마다 Supabase 세션 쿠키를 갱신한다.
 * 게스트도 그대로 통과 — 이 앱엔 로그인 강제 라우트가 없다.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 경로에서 실행:
     * - _next/static, _next/image (빌드 자산)
     * - favicon / icon / 이미지 파일
     * 정적 자산까지 인증 로직이 돌면 CSS·JS·이미지 로딩이 막힐 수 있어 제외한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
