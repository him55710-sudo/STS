import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateUploadRequest } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 10;

const dimensionsSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const audioSchema = z.strictObject({
  hasAudio: z.boolean(),
  license: z.strictObject({
    source: z.enum(["none", "unknown", "user_declared", "instagram_library", "licensed"]),
    reusable: z.boolean(),
    note: z.string().nullable(),
  }),
});

const requestSchema = z.strictObject({
  postId: z.string().min(1),
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(80),
  sizeBytes: z.number().int().positive(),
  dimensions: dimensionsSchema.optional(),
  durationMs: z.number().int().positive().optional(),
  contentHash: z.string().min(1).max(96).optional(),
  audio: audioSchema.optional(),
});

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid media upload request" }, { status: 400 });
  }

  const validation = validateUploadRequest(parsedBody.data);
  if (validation.kind === "rejected") {
    return NextResponse.json({ error: validation.code, message: validation.message }, { status: validation.status });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "missing-session" }, { status: 401 });

  const postResult = await supabase
    .from("posts")
    .select("id")
    .eq("id", parsedBody.data.postId)
    .eq("creator_id", user.id)
    .maybeSingle();
  if (postResult.error) return NextResponse.json({ error: "post lookup failed" }, { status: 500 });
  if (!postResult.data) return NextResponse.json({ error: "post not found" }, { status: 404 });

  const storagePath = `${user.id}/${randomUUID()}/${encodeURIComponent(parsedBody.data.fileName)}`;
  const signed = await supabase.storage.from("post-media").createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: "upload signing failed" }, { status: 503 });
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("post-media").getPublicUrl(storagePath);

  const inserted = await supabase
    .from("media_assets")
    .insert({
      post_id: parsedBody.data.postId,
      storage_path: storagePath,
      public_url: publicUrl,
      width: validation.dimensions?.width ?? null,
      height: validation.dimensions?.height ?? null,
      source: "user_upload",
      media_kind: validation.mediaKind === "video" ? "video" : "photo",
      mime_type: validation.mimeType,
      byte_size: parsedBody.data.sizeBytes,
      duration_ms: parsedBody.data.durationMs ?? null,
      processing_state: "uploaded",
      processing_error: null,
      license_note: JSON.stringify({
        status: "uploaded",
        kind: validation.mediaKind,
        mimeType: validation.mimeType,
        durationMs: parsedBody.data.durationMs ?? null,
        audio: parsedBody.data.audio ?? null,
      }),
      content_hash: null,
    })
    .select("id, storage_path, public_url, width, height, content_hash, processing_state")
    .single();
  if (inserted.error) return NextResponse.json({ error: "media persist failed" }, { status: 500 });

  return NextResponse.json(
    {
      asset: inserted.data,
      upload: { uploadUrl: signed.data.signedUrl, storagePath, publicUrl, headers: { "content-type": validation.mimeType } },
      status: "uploaded",
      deduped: false,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
