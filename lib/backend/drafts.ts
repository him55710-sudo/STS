"use client";

import { storagePublicUrl } from "@/lib/config";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { PublishObjectPayload } from "./types";

/**
 * 드래프트 — TikTok 가져오기 등으로 생성된, 아직 발행되지 않은 게시물.
 * 크리에이터가 커버 이미지에서 상품을 확정해야 발행된다 (publish_draft_post).
 */

export interface DraftPost {
  id: string;
  caption: string;
  source: string;
  createdAt: string;
  /** 분석 대상 커버 이미지 (스토리지 공개 URL) */
  imageUrl: string;
  ratio: number;
  /** TikTok 원본 링크 (있으면 UI에서 원본 보기 제공) */
  shareUrl: string | null;
  externalVideoId: string | null;
}

interface DraftRow {
  id: string;
  caption: string;
  source: string;
  created_at: string;
  source_external_id: string | null;
  post_media: {
    storage_url: string | null;
    external_embed_url: string | null;
    width: number | null;
    height: number | null;
    position: number;
  }[];
}

export async function fetchMyDrafts(userId: string): Promise<DraftPost[]> {
  const supabase = getBrowserSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("posts")
    .select("id, caption, source, created_at, source_external_id, post_media (storage_url, external_embed_url, width, height, position)")
    .eq("creator_id", userId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.warn(`[drafts] fetch failed: ${error.message}`);
    return [];
  }

  // TikTok 원본 링크는 별도 테이블에 있다 (본인 것만 RLS 통과)
  const { data: imports } = await supabase
    .from("tiktok_video_imports")
    .select("post_id, share_url, provider_video_id");
  const shareByPost = new Map(
    (imports ?? []).map((i) => [i.post_id as string, i as { share_url: string | null; provider_video_id: string }])
  );

  return ((data ?? []) as unknown as DraftRow[])
    .map((row) => {
      const media = [...(row.post_media ?? [])].sort((a, b) => a.position - b.position)[0];
      if (!media?.storage_url) return null;
      const meta = shareByPost.get(row.id);
      return {
        id: row.id,
        caption: row.caption,
        source: row.source,
        createdAt: row.created_at,
        imageUrl: storagePublicUrl(media.storage_url),
        ratio: media.width && media.height ? media.width / media.height : 0.5625,
        shareUrl: meta?.share_url ?? null,
        externalVideoId: row.source_external_id,
      } satisfies DraftPost;
    })
    .filter((d): d is DraftPost => d != null);
}

export async function fetchDraft(postId: string): Promise<DraftPost | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const drafts = await fetchMyDrafts(user.id);
  return drafts.find((d) => d.id === postId) ?? null;
}

/** 드래프트 → 발행. 객체·상품 확정 결과를 함께 저장한다 */
export async function publishDraft(
  postId: string,
  caption: string,
  category: string,
  objects: PublishObjectPayload[]
): Promise<string> {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("백엔드가 설정되지 않았어요");
  const { data, error } = await supabase.rpc("publish_draft_post", {
    p_post_id: postId,
    p_caption: caption,
    p_category: category,
    p_objects: objects,
  });
  if (error) throw new Error(`발행 실패: ${error.message}`);
  return data as string;
}

export async function deleteDraft(postId: string): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(`삭제 실패: ${error.message}`);
}

/** 이미지 URL → dataURL (기존 비전 파이프라인이 dataURL을 입력으로 받는다) */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`이미지를 불러오지 못했어요 (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지 변환 실패"));
    reader.readAsDataURL(blob);
  });
}

/** TikTok 연결 상태 — 토큰은 절대 반환되지 않는 RPC */
export interface TikTokStatus {
  connected: boolean;
  providerUserId?: string;
  scopes?: string[];
  mock?: boolean;
}

export async function fetchTikTokStatus(): Promise<TikTokStatus> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { connected: false };
  const { data, error } = await supabase.rpc("my_connection_status", { p_provider: "tiktok" });
  if (error) {
    console.warn(`[tiktok] status failed: ${error.message}`);
    return { connected: false };
  }
  const d = (data ?? {}) as { connected?: boolean; provider_user_id?: string; scopes?: string[] };
  return {
    connected: Boolean(d.connected),
    providerUserId: d.provider_user_id,
    scopes: d.scopes,
  };
}
