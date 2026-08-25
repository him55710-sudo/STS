"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchMyProfile, isDefaultHandle } from "@/lib/supabase/profile";
import { useApp } from "@/lib/store";
import type { SessionUser } from "@/lib/types";

/** Supabase User → 기본 SessionUser (프로필 로우 로드 전 즉시 표시용) */
function baseSessionUser(user: User): SessionUser {
  const meta = user.user_metadata ?? {};
  const name =
    meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "") || "회원";
  return {
    id: user.id,
    name,
    provider: "google",
    email: user.email ?? undefined,
    avatarUrl: meta.avatar_url || meta.picture || undefined,
  };
}

/** profiles 로우까지 반영한 완전한 SessionUser 로 store 갱신 */
async function syncFromProfile() {
  try {
    const profile = await fetchMyProfile();
    if (!profile) return;
    useApp.getState().updateUser({
      id: profile.id,
      name: profile.display_name || useApp.getState().user?.name || "회원",
      username: profile.handle,
      bio: profile.bio ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
      handleIsDefault: isDefaultHandle(profile.handle),
    });
  } catch {
    // 프로필 로드 실패는 치명적이지 않다 — 기본 세션 유저로 계속 동작
  }
}

/**
 * Supabase 인증 상태를 Zustand 스토어에 반영한다.
 * - 로그인/토큰 갱신 → 기본 세션 즉시 반영 후 profiles 로우로 보강
 * - 로그아웃 → store.signOut()
 *
 * 데모(kakao) 로그인 세션은 Supabase 세션이 없으므로 건드리지 않는다.
 */
export default function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const store = useApp.getState();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        store.signIn(baseSessionUser(session.user));
        void syncFromProfile();
      } else if (store.user?.provider === "google") {
        // 세션 만료됐는데 localStorage 에 Google 유저가 남아있으면 정리
        store.signOut();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        useApp.getState().signIn(baseSessionUser(session.user));
        void syncFromProfile();
      } else if (event === "SIGNED_OUT") {
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
