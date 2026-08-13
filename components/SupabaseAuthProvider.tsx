"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import type { SessionUser } from "@/lib/types";

/** Supabase User → 앱의 SessionUser 로 변환 */
function toSessionUser(user: User): SessionUser {
  const meta = user.user_metadata ?? {};
  const name =
    meta.full_name ||
    meta.name ||
    (user.email ? user.email.split("@")[0] : "") ||
    "회원";
  return {
    name,
    provider: "google",
    email: user.email ?? undefined,
    avatarUrl: meta.avatar_url || meta.picture || undefined,
  };
}

/**
 * Supabase 인증 상태를 Zustand 스토어에 반영한다.
 * - 로그인/토큰 갱신 → store.signIn(구글 유저)
 * - 로그아웃 → store.signOut()
 *
 * 이렇게 하면 기존 UI(프로필·사이드바)는 store.user 만 읽으면 되고
 * OAuth 든 데모든 동일하게 동작한다.
 *
 * 단, 데모(kakao) 로그인 세션은 Supabase 세션이 없으므로 건드리지 않는다.
 */
export default function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const store = useApp.getState();

    // 최초 마운트 시 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        store.signIn(toSessionUser(session.user));
      } else if (store.user?.provider === "google") {
        // 세션이 만료됐는데 localStorage 에 Google 유저가 남아있으면 정리.
        // (데모 kakao 세션은 Supabase 세션이 없어도 유지한다.)
        store.signOut();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        useApp.getState().signIn(toSessionUser(session.user));
      } else if (event === "SIGNED_OUT") {
        // Supabase 세션이 사라졌을 때만 로그아웃 처리.
        // 데모(kakao) 유저는 provider 로 구분해 유지한다.
        const current = useApp.getState().user;
        if (!current || current.provider === "google") {
          useApp.getState().signOut();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
