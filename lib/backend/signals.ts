"use client";

import { signalFromProduct } from "@/lib/recommendation/candidates";
import type { TasteSignal } from "@/lib/recommendation/taste-profile";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

/**
 * 취향 신호 수집 — 전부 서버 권위 데이터에서 온다.
 * localStorage는 이 경로에 관여하지 않는다 (프로덕션 진실은 DB).
 *
 *   강한 신호: product_saves · commerce_clicks(아웃바운드) · conversions(구매)
 *   중간 신호: post_likes · post_saves · post_shares · follows
 *   약한 신호: interaction_events(조회 · 오브젝트 탭)
 *   부정 신호: content_feedback(숨기기)
 */

export interface UserSignalBundle {
  signals: TasteSignal[];
  hidden: Set<string>;
  seen: Set<string>;
}

const EMPTY: UserSignalBundle = { signals: [], hidden: new Set(), seen: new Set() };

export async function fetchUserSignals(
  userId: string,
  postsById: Map<string, Post>
): Promise<UserSignalBundle> {
  const supabase = getBrowserSupabase();
  if (!supabase) return EMPTY;

  const [events, productSaves, clicks, feedback, follows, likes, saves] = await Promise.all([
    supabase
      .from("interaction_events")
      .select("post_id, product_id, creator_id, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("product_saves").select("product_id, created_at").eq("user_id", userId),
    supabase
      .from("commerce_clicks")
      .select("canonical_product_id, creator_id, post_id, created_at")
      .eq("viewer_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("content_feedback").select("post_id, kind").eq("user_id", userId),
    supabase.from("follows").select("creator_id, created_at").eq("follower_id", userId),
    supabase.from("post_likes").select("post_id, created_at").eq("user_id", userId),
    supabase.from("post_saves").select("post_id, created_at").eq("user_id", userId),
  ]);

  const signals: TasteSignal[] = [];
  const hidden = new Set<string>();
  const seen = new Set<string>();

  const fromPost = (
    type: TasteSignal["type"],
    postId: string | null,
    at: string | null
  ): TasteSignal | null => {
    if (!postId) return null;
    const post = postsById.get(postId);
    const ts = at ? Date.parse(at) : undefined;
    if (!post) return { type, at: ts };
    // 게시물의 첫 연결 상품으로 취향 축을 채운다
    const firstProduct = post.objects.find((o) => o.productId)?.productId ?? null;
    const base = firstProduct
      ? signalFromProduct(type, firstProduct, {
          at: ts,
          creatorId: post.creatorId,
          category: post.category,
        })
      : { type, at: ts, creatorId: post.creatorId, category: post.category };
    return base;
  };

  for (const e of events.data ?? []) {
    const row = e as { post_id: string | null; product_id: string | null; type: string; created_at: string };
    if (row.type === "asset_view" && row.post_id) seen.add(row.post_id);
    const type: TasteSignal["type"] | null =
      row.type === "asset_view"
        ? "view"
        : row.type === "object_tap"
          ? "object_tap"
          : row.type === "card_open"
            ? "card_open"
            : null;
    if (!type) continue;
    const s = fromPost(type, row.post_id, row.created_at);
    if (s) signals.push(s);
  }

  for (const r of productSaves.data ?? []) {
    const row = r as { product_id: string; created_at: string };
    signals.push(signalFromProduct("product_save", row.product_id, { at: Date.parse(row.created_at) }));
  }

  // 아웃바운드 = 강한 구매 의도. 전환된 클릭은 purchase로 승격한다.
  const clickRows = (clicks.data ?? []) as {
    canonical_product_id: string | null;
    creator_id: string | null;
    post_id: string | null;
    created_at: string;
  }[];
  const purchasedProducts = await fetchPurchasedProductIds(userId);
  for (const row of clickRows) {
    if (!row.canonical_product_id) continue;
    const isPurchase = purchasedProducts.has(row.canonical_product_id);
    signals.push(
      signalFromProduct(isPurchase ? "purchase" : "outbound", row.canonical_product_id, {
        at: Date.parse(row.created_at),
        creatorId: row.creator_id,
      })
    );
  }

  for (const f of feedback.data ?? []) {
    const row = f as { post_id: string; kind: string };
    hidden.add(row.post_id);
    const s = fromPost("hide", row.post_id, null);
    if (s) signals.push(s);
  }

  for (const f of follows.data ?? []) {
    const row = f as { creator_id: string; created_at: string };
    signals.push({ type: "follow", at: Date.parse(row.created_at), creatorId: row.creator_id });
  }

  for (const l of likes.data ?? []) {
    const row = l as { post_id: string; created_at: string };
    const s = fromPost("post_like", row.post_id, row.created_at);
    if (s) signals.push(s);
  }

  for (const sv of saves.data ?? []) {
    const row = sv as { post_id: string; created_at: string };
    const s = fromPost("post_save", row.post_id, row.created_at);
    if (s) signals.push(s);
  }

  return { signals, hidden, seen };
}

/** 내 클릭에서 전환된 상품들 — purchase 신호(가중치 10) 판정용 */
async function fetchPurchasedProductIds(userId: string): Promise<Set<string>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return new Set();
  // RLS: 크리에이터는 자기 귀속 전환만 읽는다. 구매자 관점 전환 조회는
  // 지급 단계에서 별도 뷰로 노출되므로, 지금은 클릭 → 전환 조인이 가능한 범위만 쓴다.
  const { data } = await supabase
    .from("conversions")
    .select("click_id, commerce_clicks (canonical_product_id, viewer_id)")
    .eq("status", "confirmed")
    .limit(200);
  const out = new Set<string>();
  type ClickRef = { canonical_product_id: string | null; viewer_id: string | null };
  for (const row of (data ?? []) as unknown as { commerce_clicks: ClickRef | ClickRef[] | null }[]) {
    // PostgREST는 관계를 단일 객체 또는 배열로 줄 수 있어 둘 다 수용한다
    const refs = Array.isArray(row.commerce_clicks)
      ? row.commerce_clicks
      : row.commerce_clicks
        ? [row.commerce_clicks]
        : [];
    for (const c of refs) {
      if (c.viewer_id === userId && c.canonical_product_id) out.add(c.canonical_product_id);
    }
  }
  return out;
}

/** 게시물별 공개 참여 지표 (랭킹의 품질 축) */
export interface EngagementRow {
  post_id: string;
  like_count: number;
  share_count: number;
  comment_count: number;
  view_count: number;
  tap_count: number;
}

export async function fetchEngagement(): Promise<Map<string, EngagementRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return new Map();
  const { data, error } = await supabase.from("post_engagement").select("*").limit(200);
  if (error) {
    console.warn(`[signals] engagement fetch failed: ${error.message}`);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [(r as EngagementRow).post_id, r as EngagementRow]));
}
