"use client";

import { useEffect } from "react";
import { isBackendConfigured } from "@/lib/config";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import type { ProfileRow } from "@/lib/backend/types";

/**
 * 세션 → 스토어 동기화 + 원격 피드 로드.
 * 백엔드 미설정(순수 데모 모드)에서는 remoteLoaded만 켜고 끝난다.
 */
export default function AuthProvider() {
  const setSession = useApp((s) => s.setSession);
  const loadRemoteFeed = useApp((s) => s.loadRemoteFeed);
  const hydrateSocial = useApp((s) => s.hydrateSocial);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!isBackendConfigured() || !supabase) {
      useApp.setState({ remoteLoaded: true });
      return;
    }

    let cancelled = false;

    const applyUser = async (userId: string | null) => {
      if (cancelled) return;
      if (!userId) {
        setSession(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (cancelled) return;
      const p = data as ProfileRow | null;
      setSession({
        userId,
        handle: p?.handle ?? "me",
        displayName: p?.display_name ?? "크리에이터",
        avatarUrl: p?.avatar_url ?? undefined,
      });
      void hydrateSocial(userId);
    };

    // 초기 세션 반영 후 피드 로드 (isUserPost 판정에 세션이 필요)
    supabase.auth
      .getUser()
      .then(({ data }) => applyUser(data.user?.id ?? null))
      .catch(() => setSession(null))
      .finally(() => {
        if (!cancelled) void loadRemoteFeed();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void applyUser(session?.user?.id ?? null).then(() => loadRemoteFeed());
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        void loadRemoteFeed();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
