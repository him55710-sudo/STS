"use client";

import { storagePublicUrl } from "@/lib/config";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Category, Creator, Exactness, Post, Product } from "@/lib/types";
import type { PostRow, ProfileRow, PublishObjectPayload } from "./types";

/**
 * 게시물 읽기/발행 — 서버가 진실이고 이 모듈은 행을 기존 앱 타입(Post/Creator/Product)으로
 * 매핑만 한다. 폴리곤·다중 링·canonical class는 그대로 통과한다 (비전 파이프라인 보존).
 */

const FEED_SELECT = `
  id, creator_id, caption, category, status, source, created_at, published_at,
  post_media ( * ),
  objects ( *, object_product_links ( * ) ),
  profiles ( * ),
  post_likes ( count )
`;

export interface RemoteFeed {
  posts: Post[];
  creators: Record<string, Creator>;
  products: Product[];
}

export function profileToCreator(p: ProfileRow, followers = 0): Creator {
  return {
    id: p.id,
    handle: p.handle,
    name: p.display_name,
    bio: p.bio,
    followers,
    category: "fashion",
    tone: "#77727F",
    avatarImage: p.avatar_url ?? undefined,
    verified: p.verified,
  };
}

function rowToPost(row: PostRow, viewerId: string | null): Post | null {
  const media = [...(row.post_media ?? [])].sort((a, b) => a.position - b.position)[0];
  if (!media) return null;
  const image = media.storage_url
    ? storagePublicUrl(media.storage_url)
    : media.external_embed_url;
  if (!image) return null;

  return {
    id: row.id,
    creatorId: row.creator_id,
    image,
    ratio: media.width && media.height ? media.width / media.height : 0.75,
    caption: row.caption,
    category: row.category,
    likes: row.post_likes?.[0]?.count ?? 0,
    createdAt: row.published_at ?? row.created_at,
    isUserPost: viewerId != null && row.creator_id === viewerId,
    objects: (row.objects ?? []).map((o) => {
      const link = o.object_product_links?.[0] ?? null;
      return {
        id: o.id,
        label: o.label,
        x: o.bbox?.x ?? 0,
        y: o.bbox?.y ?? 0,
        w: o.bbox?.w ?? 0,
        h: o.bbox?.h ?? 0,
        polygon: o.polygon ?? undefined,
        polygons: o.polygons ?? undefined,
        canonicalClass: o.canonical_class ?? undefined,
        productId: link?.product_id ?? null,
        exactness: (link?.relationship === "exact" ? "exact" : "similar") as Exactness,
        confidence: o.confidence,
      };
    }),
  };
}

/** 링크에 실려온 카탈로그 외 상품 스냅샷 → Product 복원 (다른 기기에서도 시트가 열리도록) */
function snapshotProducts(rows: PostRow[]): Product[] {
  const out = new Map<string, Product>();
  for (const row of rows) {
    for (const o of row.objects ?? []) {
      for (const l of o.object_product_links ?? []) {
        if (l.product_snapshot && !out.has(l.product_id)) {
          out.set(l.product_id, { id: l.product_id, similarIds: [], ...l.product_snapshot });
        }
      }
    }
  }
  return [...out.values()];
}

export async function fetchRemoteFeed(viewerId: string | null): Promise<RemoteFeed | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("posts")
    .select(FEED_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (error) {
    console.warn(`[backend] feed fetch failed: ${error.message}`);
    return null;
  }

  const rows = (data ?? []) as unknown as PostRow[];
  const posts = rows.map((r) => rowToPost(r, viewerId)).filter((p): p is Post => p != null);
  const creators: Record<string, Creator> = {};
  for (const r of rows) {
    if (r.profiles) creators[r.profiles.id] = profileToCreator(r.profiles);
  }
  return { posts, creators, products: snapshotProducts(rows) };
}

export async function fetchCreatorProfile(
  id: string
): Promise<{ creator: Creator; followers: number } | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("creator_id", id),
  ]);
  if (!profile) return null;
  const followers = count ?? 0;
  return { creator: profileToCreator(profile as ProfileRow, followers), followers };
}

// ── 발행 ─────────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

function imageDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    img.src = dataUrl;
  });
}

export interface PublishInput {
  imageDataUrl: string;
  caption: string;
  category: Category;
  objects: PublishObjectPayload[];
}

/**
 * 실 발행: 스토리지 업로드 → publish_post RPC (원자적).
 * base64 이미지는 스토리지로만 가고 localStorage에는 절대 남지 않는다.
 */
export async function publishRemotePost(input: PublishInput): Promise<string> {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("백엔드가 설정되지 않았어요");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요");

  const { blob, mime } = dataUrlToBlob(input.imageDataUrl);
  const { width, height } = await imageDims(input.imageDataUrl);
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(path, blob, { contentType: mime, cacheControl: "31536000" });
  if (uploadError) throw new Error(`이미지 업로드 실패: ${uploadError.message}`);

  const { data, error } = await supabase.rpc("publish_post", {
    p_caption: input.caption,
    p_category: input.category,
    p_media: [{ media_type: "image", storage_url: path, width, height }],
    p_objects: input.objects,
  });
  if (error) {
    // 발행 실패 시 업로드한 파일이 고아로 남지 않도록 정리
    await supabase.storage.from("post-media").remove([path]).catch(() => {});
    throw new Error(`발행 실패: ${error.message}`);
  }
  return data as string;
}
