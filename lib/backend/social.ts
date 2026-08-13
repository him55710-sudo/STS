"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * 소셜 영속화 — 좋아요/저장/팔로우.
 * anon 키 + RLS: 모든 쓰기는 자기 자신(user_id = auth.uid())으로만 가능하다.
 * 실패는 호출부(스토어)가 낙관적 업데이트를 되돌리는 데 사용한다.
 */

function client(): SupabaseClient {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("backend not configured");
  return supabase;
}

async function run(q: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export const setPostLike = (userId: string, postId: string, on: boolean) =>
  on
    ? run(client().from("post_likes").upsert({ user_id: userId, post_id: postId }, { ignoreDuplicates: true }))
    : run(client().from("post_likes").delete().eq("user_id", userId).eq("post_id", postId));

export const setPostSave = (userId: string, postId: string, on: boolean) =>
  on
    ? run(client().from("post_saves").upsert({ user_id: userId, post_id: postId }, { ignoreDuplicates: true }))
    : run(client().from("post_saves").delete().eq("user_id", userId).eq("post_id", postId));

export const setProductSave = (userId: string, productId: string, on: boolean) =>
  on
    ? run(client().from("product_saves").upsert({ user_id: userId, product_id: productId }, { ignoreDuplicates: true }))
    : run(client().from("product_saves").delete().eq("user_id", userId).eq("product_id", productId));

export const setFollow = (userId: string, creatorId: string, on: boolean) =>
  on
    ? run(client().from("follows").upsert({ follower_id: userId, creator_id: creatorId }, { ignoreDuplicates: true }))
    : run(client().from("follows").delete().eq("follower_id", userId).eq("creator_id", creatorId));

export interface SocialState {
  likedPosts: string[];
  savedPosts: string[];
  savedProducts: string[];
  following: string[];
}

/** 로그인 직후 서버 진실로 소셜 상태를 채운다 */
export async function fetchSocialState(userId: string): Promise<SocialState | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const [likes, postSaves, productSaves, follows] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId),
    supabase.from("post_saves").select("post_id").eq("user_id", userId),
    supabase.from("product_saves").select("product_id").eq("user_id", userId),
    supabase.from("follows").select("creator_id").eq("follower_id", userId),
  ]);
  const err = likes.error ?? postSaves.error ?? productSaves.error ?? follows.error;
  if (err) {
    console.warn(`[backend] social hydrate failed: ${err.message}`);
    return null;
  }
  return {
    likedPosts: (likes.data ?? []).map((r) => r.post_id as string),
    savedPosts: (postSaves.data ?? []).map((r) => r.post_id as string),
    savedProducts: (productSaves.data ?? []).map((r) => r.product_id as string),
    following: (follows.data ?? []).map((r) => r.creator_id as string),
  };
}
