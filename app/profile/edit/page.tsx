"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useApp, useHydrated } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  isDefaultHandle,
  isHandleAvailable,
  updateMyProfile,
  uploadAvatar,
  validateHandle,
} from "@/lib/supabase/profile";
import { CheckIcon, ChevronLeftIcon, ImageIcon } from "@/components/Icons";

export default function ProfileEditPage() {
  return (
    <Suspense fallback={null}>
      <EditInner />
    </Suspense>
  );
}

type HandleState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | { kind: "error"; reason: string };

function EditInner() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);
  const updateUser = useApp((s) => s.updateUser);

  const onboarding = params.get("onboarding") === "1" || (user ? user.handleIsDefault : false);

  // 폼 상태 — 온보딩(기본 handle)일 땐 아이디를 빈칸으로 시작해 직접 입력 유도
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [handleState, setHandleState] = useState<HandleState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // store.user 가 준비되면 폼 1회 시딩
  useEffect(() => {
    if (seeded || !hydrated || !user) return;
    setHandle(user.username && !isDefaultHandle(user.username) ? user.username : "");
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setAvatarUrl(user.avatarUrl);
    setSeeded(true);
  }, [seeded, hydrated, user]);

  // handle 실시간 중복/형식 확인 (디바운스)
  useEffect(() => {
    if (!handle) {
      setHandleState({ kind: "idle" });
      return;
    }
    const fmt = validateHandle(handle);
    if (fmt) {
      setHandleState({ kind: "error", reason: fmt });
      return;
    }
    if (handle === user?.username) {
      setHandleState({ kind: "ok" });
      return;
    }
    setHandleState({ kind: "checking" });
    const t = setTimeout(async () => {
      try {
        const { available, reason } = await isHandleAvailable(handle);
        setHandleState(available ? { kind: "ok" } : { kind: "error", reason: reason ?? "" });
      } catch {
        setHandleState({ kind: "idle" });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [handle, user?.username]);

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지는 5MB 이하로 올려주세요.");
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const canSave =
    !saving &&
    handle.length >= 3 &&
    handleState.kind === "ok" &&
    name.trim().length > 0;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      let nextAvatar = avatarUrl;
      if (avatarFile) nextAvatar = await uploadAvatar(avatarFile);

      const profile = await updateMyProfile({
        handle,
        display_name: name.trim(),
        bio: bio.trim(),
        avatar_url: nextAvatar,
      });

      updateUser({
        name: profile.display_name || name.trim(),
        username: profile.handle,
        bio: profile.bio ?? "",
        avatarUrl: profile.avatar_url ?? undefined,
        handleIsDefault: false,
      });
      router.push("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요.");
      setSaving(false);
    }
  };

  // 로그인/설정 가드
  if (hydrated && (!isSupabaseConfigured() || !user || user.provider !== "google" || !user.id)) {
    return (
      <div className="px-6 pt-24 text-center">
        <p className="text-[15px] font-semibold">프로필 편집은 Google 로그인 후 이용할 수 있어요.</p>
        <Link
          href="/login"
          className="press mt-4 inline-flex h-11 items-center justify-center rounded-(--radius-btn) bg-ink px-5 text-[14px] font-bold text-surface"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  const shownAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="px-5 pb-16">
      <header className="flex items-center justify-between py-3">
        <Link href="/profile" aria-label="뒤로" className="press -ml-1.5 flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <h1 className="text-[16px] font-bold">{onboarding ? "프로필 완성하기" : "프로필 편집"}</h1>
        <button
          onClick={save}
          disabled={!canSave}
          className="press text-[14px] font-bold text-primary disabled:opacity-40"
        >
          {saving ? "저장 중…" : "완료"}
        </button>
      </header>

      {onboarding && (
        <p className="card-in mb-4 rounded-(--radius-card) bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          환영해요! 다른 사람에게 보여질 <b className="text-ink">아이디</b>와 <b className="text-ink">이름</b>을 정하고,
          프로필 사진과 소개를 채워보세요.
        </p>
      )}

      {/* 아바타 */}
      <div className="flex flex-col items-center gap-2 py-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="press relative"
          aria-label="프로필 사진 변경"
        >
          {shownAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownAvatar}
              alt="프로필 사진"
              className="h-24 w-24 rounded-full object-cover"
              style={{ objectPosition: "50% 30%" }}
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2 text-ink-2">
              <ImageIcon size={30} />
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-ink text-surface">
            <ImageIcon size={14} />
          </span>
        </button>
        <button onClick={() => fileRef.current?.click()} className="press text-[13px] font-semibold text-primary">
          사진 바꾸기
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
      </div>

      {error && (
        <p className="mb-3 rounded-(--radius-btn) bg-red-50 px-3 py-2 text-center text-[12px] font-medium text-red-600">
          {error}
        </p>
      )}

      {/* 아이디 (handle) */}
      <Field label="아이디">
        <div className="flex items-center gap-1 rounded-(--radius-card) border border-line bg-surface px-3">
          <span className="text-[15px] font-medium text-ink-2">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            placeholder="my_id"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            className="h-[46px] flex-1 bg-transparent text-[15px] outline-none"
          />
          {handleState.kind === "ok" && <CheckIcon size={18} className="text-green-600" />}
        </div>
        <HandleHint state={handleState} />
      </Field>

      {/* 이름 (display_name) */}
      <Field label="이름">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실제 이름 또는 활동명"
          maxLength={40}
          className="h-[46px] w-full rounded-(--radius-card) border border-line bg-surface px-3 text-[15px] outline-none"
        />
      </Field>

      {/* 소개 (bio) */}
      <Field label="소개">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 150))}
          placeholder="나를 한 줄로 소개해보세요"
          rows={3}
          className="w-full resize-none rounded-(--radius-card) border border-line bg-surface px-3 py-2.5 text-[15px] leading-relaxed outline-none"
        />
        <p className="mt-1 text-right text-[11px] text-ink-2">{bio.length}/150</p>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[12px] font-semibold text-ink-2">{label}</p>
      {children}
    </div>
  );
}

function HandleHint({ state }: { state: HandleState }) {
  if (state.kind === "error")
    return <p className="mt-1 text-[11.5px] font-medium text-red-600">{state.reason}</p>;
  if (state.kind === "checking")
    return <p className="mt-1 text-[11.5px] text-ink-2">확인 중…</p>;
  if (state.kind === "ok")
    return <p className="mt-1 text-[11.5px] font-medium text-green-600">사용할 수 있는 아이디예요</p>;
  return <p className="mt-1 text-[11.5px] text-ink-2">영문 소문자·숫자·_·. 3~30자</p>;
}
