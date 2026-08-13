import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isBackendConfigured } from "@/lib/config";

/**
 * 서버(라우트 핸들러/서버 컴포넌트)용 Supabase 클라이언트 — 요청 쿠키의 세션으로 동작한다.
 * anon 키 + RLS 조합이므로 호출 사용자의 권한을 넘어서는 접근은 불가능하다.
 * service-role 키는 여기서도 사용하지 않는다 (관리 작업이 필요해지는 시점에
 * 별도의 서버 전용 모듈로 격리해 도입한다).
 */
export async function createServerSupabase() {
  if (!isBackendConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component에서 호출된 경우 쓰기가 막힐 수 있다 — proxy가 세션을 갱신한다
        }
      },
    },
  });
}
