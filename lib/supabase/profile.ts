"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

/**
 * 소셜 프로필 (public.profiles) — 인스타그램식 identity.
 * 스키마: id, handle(unique, ^[a-z0-9_.]{3,30}$), display_name, bio, avatar_url, role, verified
 */
export interface Profile {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: "user" | "creator" | "admin";
  verified: boolean;
}

/** 아바타를 재사용하는 스토리지 버킷 (본인 폴더 {uid}/ 아래에만 업로드 가능) */
const MEDIA_BUCKET = "post-media";

/** handle 포맷 규칙 (DB 제약과 동일) */
export const HANDLE_RE = /^[a-z0-9_.]{3,30}$/;

/** 신규 가입 시 자동 부여되는 기본 handle 패턴 (user_ + uuid 앞 12자리) */
const DEFAULT_HANDLE_RE = /^user_[0-9a-f]{12}$/;

/** 아직 사용자가 아이디를 직접 정하지 않았는지 (온보딩 유도용) */
export function isDefaultHandle(handle: string | null | undefined): boolean {
  return !handle || DEFAULT_HANDLE_RE.test(handle);
}

/** handle 형식 검증 → 문제 있으면 한글 안내, 없으면 null */
export function validateHandle(handle: string): string | null {
  if (handle.length < 3) return "아이디는 3자 이상이어야 해요.";
  if (handle.length > 30) return "아이디는 30자 이하여야 해요.";
  if (!HANDLE_RE.test(handle))
    return "영문 소문자, 숫자, 밑줄(_), 마침표(.)만 쓸 수 있어요.";
  return null;
}

/** 현재 로그인 사용자의 프로필 조회 (없으면 null) */
export async function fetchMyProfile(
  client?: SupabaseClient
): Promise<Profile | null> {
  const supabase = client ?? getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url, role, verified")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/**
 * handle 사용 가능 여부. 본인이 이미 쓰는 handle 이면 available=true.
 * 형식이 틀리면 available=false + reason.
 */
export async function isHandleAvailable(
  handle: string,
  client?: SupabaseClient
): Promise<{ available: boolean; reason?: string }> {
  const formatError = validateHandle(handle);
  if (formatError) return { available: false, reason: formatError };

  const supabase = client ?? getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { available: true };
  if (user && data.id === user.id) return { available: true }; // 내 현재 handle
  return { available: false, reason: "이미 사용 중인 아이디예요." };
}

/** 아바타 이미지 업로드 → 공개 URL 반환 */
export async function uploadAvatar(
  file: File,
  client?: SupabaseClient
): Promise<string> {
  const supabase = client ?? getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  // 본인 폴더({uid}/) 아래에만 업로드 가능 (스토리지 RLS)
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return publicUrl;
}

/** 프로필 수정 (본인만). handle 중복 시 친절한 에러로 변환. */
export async function updateMyProfile(
  patch: { handle?: string; display_name?: string; bio?: string; avatar_url?: string },
  client?: SupabaseClient
): Promise<Profile> {
  const supabase = client ?? getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id, handle, display_name, bio, avatar_url, role, verified")
    .single();

  if (error) {
    // 23505 = unique_violation (handle 중복)
    if ((error as { code?: string }).code === "23505")
      throw new Error("이미 사용 중인 아이디예요.");
    throw error;
  }
  return data as Profile;
}
