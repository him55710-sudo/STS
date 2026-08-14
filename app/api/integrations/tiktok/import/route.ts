import { NextResponse, type NextRequest } from "next/server";
import { queryVideos } from "@/lib/integrations/tiktok/client";
import { isMockMode, isTikTokAvailable } from "@/lib/integrations/tiktok/oauth";
import type { TikTokVideo } from "@/lib/integrations/tiktok/types";
import { createServerSupabase } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * 선택한 TikTok 영상 → STS **드래프트** 가져오기.
 *
 * 절대 자동 발행하지 않는다 (posts.status = 'draft'). 크리에이터가 커버 이미지를
 * AI 분석 후 상품을 확정해야 발행된다 (publish_draft_post RPC).
 *
 * ⚠️ Display API는 원본 영상 파일을 제공하지 않는다. Phase-1은 커버 이미지를
 *    분석 소스로 쓰고, 만료되는 cover_image_url을 /v2/video/query/로 재조회한 뒤
 *    우리 스토리지에 복사해 영구 보존한다.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isTikTokAvailable()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: { videoIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const videoIds = Array.isArray(body.videoIds)
    ? body.videoIds.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, 20)
    : [];
  if (videoIds.length === 0) {
    return NextResponse.json({ error: "no_videos_selected" }, { status: 400 });
  }

  // 커버 URL은 만료되므로 가져오기 직전에 공식 query API로 최신값을 받는다
  const queried = await queryVideos(supabase, user.id, videoIds);
  if (!queried.ok) {
    const reauth = queried.error === "reauth_required" || queried.error === "not_connected";
    return NextResponse.json(
      { error: queried.error, detail: queried.detail, reauth },
      { status: reauth ? 409 : queried.status }
    );
  }

  const imported: { videoId: string; postId: string }[] = [];
  const failed: { videoId: string; reason: string }[] = [];

  for (const video of queried.data.videos) {
    try {
      const postId = await importOne(supabase, user.id, video, request.nextUrl.origin);
      imported.push({ videoId: video.id, postId });
    } catch (e) {
      failed.push({ videoId: video.id, reason: (e as Error).message });
    }
  }

  return NextResponse.json({
    imported,
    failed,
    draftCount: imported.length,
    mock: isMockMode(),
  });
}

async function importOne(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>,
  userId: string,
  video: TikTokVideo,
  origin: string
): Promise<string> {
  // 이미 가져온 영상은 건너뛴다 (중복 드래프트 방지)
  const { data: existing } = await supabase
    .from("tiktok_video_imports")
    .select("post_id")
    .eq("user_id", userId)
    .eq("provider_video_id", video.id)
    .maybeSingle();
  if (existing?.post_id) {
    throw new Error("이미 가져온 영상이에요");
  }

  // 커버 이미지를 우리 스토리지로 복사 — TikTok URL 만료와 무관하게 보존된다
  const coverUrl = video.cover_image_url;
  if (!coverUrl) throw new Error("커버 이미지가 없어요");
  const absolute = coverUrl.startsWith("/") ? `${origin}${coverUrl}` : coverUrl;

  const res = await fetch(absolute, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`커버 이미지를 받지 못했어요 (${res.status})`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("커버가 이미지가 아니에요");
  const bytes = new Uint8Array(await res.arrayBuffer());

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/tiktok-${video.id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(path, bytes, { contentType, cacheControl: "31536000" });
  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  // 드래프트 게시물 (발행 아님)
  const caption = video.title?.trim() || video.video_description?.trim() || "TikTok에서 가져온 콘텐츠";
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      creator_id: userId,
      caption,
      category: "fashion",
      status: "draft",
      source: "import_tiktok",
      source_external_id: video.id,
    })
    .select("id")
    .single();
  if (postError || !post) {
    await supabase.storage.from("post-media").remove([path]).catch(() => {});
    throw new Error(`드래프트 생성 실패: ${postError?.message ?? "unknown"}`);
  }

  const { error: mediaError } = await supabase.from("post_media").insert({
    post_id: post.id,
    media_type: "image", // 분석 대상은 커버 스틸 — 원본 영상 파일은 API가 주지 않는다
    storage_url: path,
    external_embed_url: video.embed_link ?? video.share_url ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    duration: video.duration ?? null,
  });
  if (mediaError) throw new Error(`미디어 저장 실패: ${mediaError.message}`);

  const { error: importError } = await supabase.from("tiktok_video_imports").insert({
    user_id: userId,
    post_id: post.id,
    provider_video_id: video.id,
    title: video.title ?? null,
    video_description: video.video_description ?? null,
    share_url: video.share_url ?? null,
    embed_link: video.embed_link ?? null,
    cover_image_url: coverUrl,
    cover_stored_path: path,
    duration: video.duration ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    create_time: video.create_time ? new Date(video.create_time * 1000).toISOString() : null,
  });
  if (importError) throw new Error(`메타데이터 저장 실패: ${importError.message}`);

  return post.id as string;
}
