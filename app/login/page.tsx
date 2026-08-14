"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { isBackendConfigured, isDemoLoginAllowed } from "@/lib/config";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";

/**
 * 로그인 — Toss 스타일: 큰 타이포, 버튼 두 개, 군더더기 없음.
 *
 * 백엔드 설정 시: Supabase Auth 실 로그인 (Google/Kakao OAuth + 이메일 폴백).
 * 데모 로그인은 NEXT_PUBLIC_DEMO_MODE=true에서만 노출된다 — 프로덕션 모드에서
 * 가짜 로그인 성공은 어떤 경로로도 불가능하다.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginBody />
    </Suspense>
  );
}

function LoginBody() {
  const router = useRouter();
  const params = useSearchParams();
  const demoSignIn = useApp((s) => s.signIn);
  const session = useApp((s) => s.session);
  const backend = isBackendConfigured();

  const [error, setError] = useState<string | null>(
    params.get("error") === "oauth" ? "로그인에 실패했어요. 다시 시도해주세요." : null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // 이미 로그인된 상태면 프로필로
  useEffect(() => {
    if (session) router.replace("/profile");
  }, [session, router]);

  const oauth = async (provider: "google" | "kakao") => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
    });
    if (error) {
      // provider 미구성 등 — 성공을 가장하지 않고 사유를 그대로 보여준다
      setBusy(null);
      setError(
        error.message.includes("not enabled")
          ? `${provider === "kakao" ? "카카오" : "Google"} 로그인이 아직 연결되지 않았어요. 이메일로 시작해보세요.`
          : `로그인 실패: ${error.message}`
      );
    }
  };

  const emailAuth = async (mode: "signIn" | "signUp") => {
    const supabase = getBrowserSupabase();
    if (!supabase || !email.trim() || password.length < 6) {
      setError("이메일과 6자 이상의 비밀번호를 입력해주세요.");
      return;
    }
    setBusy("email");
    setError(null);
    setNotice(null);
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds);
    setBusy(null);
    if (error) {
      setError(
        mode === "signIn" && error.message.includes("Invalid login credentials")
          ? "이메일 또는 비밀번호가 맞지 않아요. 처음이라면 가입하기를 눌러주세요."
          : error.message
      );
      return;
    }
    if (data.session) {
      router.push("/profile");
    } else {
      // 이메일 확인이 켜져 있는 프로젝트 — 성공을 가장하지 않는다
      setNotice("확인 메일을 보냈어요. 메일함에서 인증을 완료하면 로그인됩니다.");
    }
  };

  const demoLogin = (provider: "google" | "kakao") => {
    demoSignIn({ provider, name: provider === "kakao" ? "카카오 회원" : "Google 회원" });
    router.push("/profile");
  };

  return (
    <div className="flex min-h-[calc(100dvh-76px)] flex-col px-6">
      <div className="flex-1 pt-16">
        {/*
         * 온보딩 위계 (docs/COMMERCE_INTEGRITY.md):
         *   1순위 — 비주얼 라이프스타일 콘텐츠를 공유하고 발견하는 곳
         *   2순위 — 올린 콘텐츠가 수익으로 이어질 수도 있다 (부차적, 절제된 한 줄)
         * 수수료율은 어디에도 광고하지 않는다.
         */}
        <p className="card-in text-[15px] font-medium text-primary">STS</p>
        <h1 className="card-in mt-2 text-[30px] font-extrabold leading-snug tracking-tight" style={{ animationDelay: "60ms" }}>
          매일의 스타일을
          <br />
          공유하고 발견하세요
        </h1>
        <p className="card-in mt-3 text-[14px] leading-relaxed text-ink-2" style={{ animationDelay: "120ms" }}>
          좋아하는 사람들의 착장을 보고, 내 하루를 남기고,
          <br />
          마음에 드는 물건은 사진 속에서 바로 찾아보세요.
        </p>
        <p className="card-in mt-4 text-[12.5px] leading-relaxed text-ink-2" style={{ animationDelay: "160ms" }}>
          크리에이터라면, 올린 콘텐츠가 수익으로 이어질 수도 있어요.
        </p>
      </div>

      <div className="card-in flex flex-col gap-2.5 pb-8" style={{ animationDelay: "180ms" }}>
        {(error || notice) && (
          <p
            className={`rounded-(--radius-btn) px-3 py-2.5 text-[12.5px] leading-relaxed ${
              error ? "bg-[#fdecec] text-[#c0392b]" : "bg-primary-soft text-primary"
            }`}
          >
            {error ?? notice}
          </p>
        )}

        {backend ? (
          <>
            <button
              onClick={() => oauth("kakao")}
              disabled={busy != null}
              className="press flex h-[52px] items-center justify-center gap-2 rounded-(--radius-card) bg-kakao text-[15px] font-bold text-[#191919] disabled:opacity-60"
            >
              <KakaoMark />
              {busy === "kakao" ? "카카오로 이동 중..." : "카카오로 3초 만에 시작하기"}
            </button>
            <button
              onClick={() => oauth("google")}
              disabled={busy != null}
              className="press flex h-[52px] items-center justify-center gap-2 rounded-(--radius-card) border border-line bg-surface text-[15px] font-bold text-ink disabled:opacity-60"
            >
              <GoogleMark />
              {busy === "google" ? "Google로 이동 중..." : "Google로 계속하기"}
            </button>

            {emailOpen ? (
              <div className="flex flex-col gap-2 rounded-(--radius-card) border border-line bg-surface p-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일"
                  autoComplete="email"
                  className="h-11 rounded-(--radius-btn) bg-surface-2 px-3 text-[14px] outline-none"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  autoComplete="current-password"
                  className="h-11 rounded-(--radius-btn) bg-surface-2 px-3 text-[14px] outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => emailAuth("signIn")}
                    disabled={busy != null}
                    className="press h-11 flex-1 rounded-(--radius-btn) bg-ink text-[14px] font-semibold text-surface disabled:opacity-60"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => emailAuth("signUp")}
                    disabled={busy != null}
                    className="press h-11 flex-1 rounded-(--radius-btn) border border-line text-[14px] font-semibold disabled:opacity-60"
                  >
                    가입하기
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEmailOpen(true)}
                className="press py-1 text-center text-[13px] font-medium text-ink-2"
              >
                이메일로 계속하기
              </button>
            )}

            {isDemoLoginAllowed() && (
              <button
                onClick={() => demoLogin("google")}
                className="press py-1.5 text-center text-[12px] text-ink-2 underline underline-offset-2"
              >
                데모 세션으로 둘러보기 (저장되지 않음)
              </button>
            )}
          </>
        ) : (
          <>
            {/* 백엔드 미설정 — 데모 모드로만 동작한다는 사실을 숨기지 않는다 */}
            <button
              onClick={() => demoLogin("kakao")}
              className="press flex h-[52px] items-center justify-center gap-2 rounded-(--radius-card) bg-kakao text-[15px] font-bold text-[#191919]"
            >
              <KakaoMark />
              카카오로 3초 만에 시작하기
            </button>
            <button
              onClick={() => demoLogin("google")}
              className="press flex h-[52px] items-center justify-center gap-2 rounded-(--radius-card) border border-line bg-surface text-[15px] font-bold text-ink"
            >
              <GoogleMark />
              Google로 계속하기
            </button>
            <p className="text-center text-[10.5px] leading-relaxed text-ink-2">
              데모 로그인이에요. Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL 등)를 설정하면 실제 로그인이 활성화됩니다.
            </p>
          </>
        )}

        <Link href="/" className="press py-2 text-center text-[13px] font-medium text-ink-2">
          로그인 없이 둘러보기
        </Link>
      </div>
    </div>
  );
}

function KakaoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="#191919">
      <path d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.6 1.7 4.8 4.3 6.1l-1 3.9c-.1.3.3.6.6.4l4.5-3c.3 0 .5.1.8.1 5.1 0 9.2-3.2 9.2-7.5S17.1 3 12 3z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.4h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.9 3C3.2 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.4c-.3-.8-.4-1.5-.4-2.4s.2-1.6.4-2.4l-4-3C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l3.9-3z" />
      <path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8L20.1 3C18 1.1 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l3.9 3c1-2.9 3.7-4.9 6.9-4.9z" />
    </svg>
  );
}
