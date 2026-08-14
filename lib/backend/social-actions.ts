"use client";

import type { SourceSurface } from "@/lib/commerce/click";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isUuid } from "@/lib/config";

/**
 * 소셜 액션의 서버 영속화 — 공유 / 부정 피드백 / 댓글 / 상호작용 신호.
 * (좋아요·저장·팔로우는 lib/backend/social.ts)
 *
 * 여기 기록되는 것이 프로덕션 진실이다. localStorage는 데모 모드 전용이다.
 */

// ── 공유 ─────────────────────────────────────────────────────────────────────

export type ShareMethod = "web_share" | "copy";

export async function recordShare(
  postId: string,
  method: ShareMethod,
  surface: SourceSurface,
  userId: string | null
): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("post_shares").insert({
    user_id: userId,
    anonymous_id: userId ? null : anonymousId(),
    post_id: postId,
    method,
    source_surface: surface,
  });
  if (error) console.warn(`[social] share record failed: ${error.message}`);
}

/** 익명 방문자 식별자 — 공유 집계용 (클릭 라우터의 sts_anon_id와 별개의 클라이언트 값) */
function anonymousId(): string {
  const KEY = "sts_anon_client_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

/** 게시물의 안정적 공개 URL */
export function postPublicUrl(postId: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/post/${encodeURIComponent(postId)}`;
}

export interface ShareResult {
  shared: boolean;
  method: ShareMethod | null;
  /** 사용자에게 보여줄 안내 (복사 완료 등) */
  notice: string | null;
}

/**
 * 공유 실행 — navigator.share가 있으면 네이티브 시트, 없으면 링크 복사 폴백.
 * 사용자가 시트를 취소하면 아무 것도 기록하지 않는다 (가짜 공유 금지).
 */
export async function sharePost(
  postId: string,
  title: string,
  surface: SourceSurface,
  userId: string | null
): Promise<ShareResult> {
  const url = postPublicUrl(postId);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "STS", text: title, url });
      await recordShare(postId, "web_share", surface, userId);
      return { shared: true, method: "web_share", notice: null };
    } catch (e) {
      // AbortError = 사용자가 취소한 것이므로 복사 폴백도 하지 않는다
      if ((e as Error)?.name === "AbortError") {
        return { shared: false, method: null, notice: null };
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    await recordShare(postId, "copy", surface, userId);
    return { shared: true, method: "copy", notice: "링크를 복사했어요" };
  } catch {
    return { shared: false, method: null, notice: "링크를 복사하지 못했어요" };
  }
}

// ── 부정 피드백 ──────────────────────────────────────────────────────────────

export type FeedbackKind = "hide" | "not_interested";

export async function setFeedback(
  userId: string,
  postId: string,
  kind: FeedbackKind,
  reason?: string
): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("content_feedback")
    .upsert({ user_id: userId, post_id: postId, kind, reason: reason ?? null });
  if (error) throw new Error(error.message);
}

export async function clearFeedback(userId: string, postId: string): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  await supabase.from("content_feedback").delete().eq("user_id", userId).eq("post_id", postId);
}

// ── 상호작용 신호 ────────────────────────────────────────────────────────────

export type InteractionType =
  | "asset_view"
  | "object_tap"
  | "card_open"
  | "post_like"
  | "post_save"
  | "post_share";

/**
 * 약한 취향 신호 기록 (조회·탭). 실패해도 UX를 막지 않는다.
 * 로그인 사용자만 기록한다 — 익명 신호는 프로필을 만들 대상이 없다.
 */
export async function recordInteraction(
  userId: string | null,
  type: InteractionType,
  ref: { postId?: string; objectId?: string; productId?: string; creatorId?: string }
): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase || !userId) return;
  const { error } = await supabase.from("interaction_events").insert({
    user_id: userId,
    post_id: ref.postId ?? null,
    object_id: ref.objectId ?? null,
    product_id: ref.productId ?? null,
    creator_id: ref.creatorId ?? null,
    type,
  });
  if (error) console.warn(`[social] interaction record failed: ${error.message}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: { handle: string; display_name: string; avatar_url: string | null } | null;
}

/** 댓글은 서버 게시물(uuid)에만 달 수 있다 — 시드 콘텐츠는 대상이 아니다 */
export const commentsSupported = (postId: string) => isUuid(postId);

export async function fetchComments(postId: string): Promise<CommentRow[]> {
  const supabase = getBrowserSupabase();
  if (!supabase || !commentsSupported(postId)) return [];
  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at, profiles (handle, display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.warn(`[social] comments fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as unknown as CommentRow[];
}

export async function addComment(postId: string, authorId: string, body: string): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("백엔드가 설정되지 않았어요");
  const text = body.trim();
  if (!text) throw new Error("내용을 입력해주세요");
  if (text.length > 2000) throw new Error("댓글이 너무 길어요");
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: authorId, body: text });
  if (error) throw new Error(error.message);
}

/** 소프트 삭제 — 작성자만 가능 (RLS) */
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw new Error(error.message);
}
