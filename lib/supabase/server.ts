import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버(Route Handler·Server Component)용 Supabase 클라이언트.
 *
 * Next 16 에서 cookies() 는 async 이므로 이 팩토리도 async 다.
 * @supabase/ssr 의 getAll/setAll 규약을 따른다.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component 렌더 중엔 쿠키 쓰기가 막혀 있다.
          // 세션 갱신은 미들웨어가 담당하므로 여기선 무시해도 안전하다.
        }
      },
    },
  });
}
