"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useApp } from "@/lib/store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * 로그인 — Toss 스타일: 큰 타이포, 버튼 두 개, 군더더기 없음.
 *
 * - Google: Supabase Auth 실제 OAuth (signInWithOAuth → /auth/callback).
 * - 카카오: 아직 미연동, 데모 세션 로그인.
 * - 게스트: 로그인 없이 둘러보기.
 */
export default function LoginPage() {
  // useSearchParams() 는 Next 16 에서 Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useApp((s) => s.signIn);
  const [loading, setLoading] = useState<null | "google" | "kakao">(null);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  const supabaseReady = isSupabaseConfigured();

  const loginGoogle = async () => {
    setError(null);
    // Supabase 미설정 환경에서는 데모로 자연 강등 (게스트 데모와 동일 UX 유지)
    if (!supabaseReady) {
      signIn({ provider: "google", name: "Google 회원 (데모)" });
      router.push("/profile");
      return;
    }
    setLoading("google");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(null);
      }
      // 성공 시 브라우저가 Google 로 리다이렉트되므로 이후 코드는 실행되지 않는다.
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했어요.");
      setLoading(null);
    }
  };

  const loginKakao = () => {
    // 카카오는 아직 데모 세션 (Supabase 카카오 provider 연동 시 loginGoogle 과 동일 패턴으로 교체)
    signIn({ provider: "kakao", name: "카카오 회원" });
    router.push("/profile");
  };

  return (
    <div className="flex min-h-[calc(100dvh-76px)] flex-col px-6">
      <div className="flex-1 pt-20">
        <p className="card-in text-[15px] font-medium text-primary">See it. Tap it. Shop it.</p>
        <h1 className="card-in mt-2 text-[30px] font-extrabold leading-snug tracking-tight" style={{ animationDelay: "60ms" }}>
          사진 속 그 물건,
          <br />
          탭 한 번이면 내 것
        </h1>
        <p className="card-in mt-3 text-[14px] leading-relaxed text-ink-2" style={{ animationDelay: "120ms" }}>
          3초 만에 시작하고, 내가 올린 착장으로
          <br />
          판매 수수료의 70%를 받아보세요.
        </p>
      </div>

      <div className="card-in flex flex-col gap-2.5 pb-8" style={{ animationDelay: "180ms" }}>
        {error && (
          <p className="rounded-(--radius-btn) bg-red-50 px-3 py-2 text-center text-[12px] font-medium text-red-600">
            {error}
          </p>
        )}
        <button
          onClick={loginKakao}
          disabled={loading !== null}
          className="press flex h-[52px] items-center justify-center gap-2 rounded-(--radius-card) bg-kakao text-[15px] font-bold text-[#191919] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="#191919">
            <path d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.6 1.7 4.8 4.3 6.1l-1 3.9c-.1.3.3.6.6.4l4.5-3c.3 0 .5.1.8.1 5.1 0 9.2-3.2 9.2-7.5S17.1 3 12 3z" />
          </svg>
          카카오로 3초 만에 시작하기
        </button>
        <button
          onClick={loginGoogle}
          disabled={loading !== null}
          className="press flex h-[52px] items-center justify-center gap-2 rounded-(--radius-card) border border-line bg-surface text-[15px] font-bold text-ink disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.4h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.9z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.9 3C3.2 21.3 7.3 24 12 24z" />
            <path fill="#FBBC05" d="M5.1 14.4c-.3-.8-.4-1.5-.4-2.4s.2-1.6.4-2.4l-4-3C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l3.9-3z" />
            <path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8L20.1 3C18 1.1 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l3.9 3c1-2.9 3.7-4.9 6.9-4.9z" />
          </svg>
          {loading === "google" ? "Google로 이동 중…" : "Google로 계속하기"}
        </button>
        <Link href="/" className="press py-3 text-center text-[13px] font-medium text-ink-2">
          로그인 없이 둘러보기
        </Link>
        <p className="text-center text-[10.5px] leading-relaxed text-ink-2">
          {supabaseReady
            ? "Google 로그인은 실제 계정으로 진행됩니다. 카카오는 아직 데모예요."
            : "지금은 데모 로그인이에요. Supabase 환경변수 설정 후 실제 Google 로그인이 활성화됩니다."}
        </p>
      </div>
    </div>
  );
}
