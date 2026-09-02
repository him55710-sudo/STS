import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateUploadRequest } from "@/lib/media";
import { createSupabaseMediaAdminClient } from "@/lib/media/admin-client";

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

type InitiatedMediaAssetRow = {
  readonly id: string;
  readonly storage_path: string | null;
  readonly public_url: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly content_hash: string | null;
  readonly processing_state: string;
};
type InitiationRpcResult = {
  readonly data: InitiatedMediaAssetRow | readonly InitiatedMediaAssetRow[] | null;
  readonly error: { readonly message?: string } | null;
};

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

  const adminSupabase = createSupabaseMediaAdminClient();
  if (!adminSupabase) return NextResponse.json({ error: "media upload admin client unavailable" }, { status: 503 });

  const storagePath = `${user.id}/${randomUUID()}/${encodeURIComponent(parsedBody.data.fileName)}`;
  const signed = await supabase.storage.from("post-media").createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: "upload signing failed" }, { status: 503 });
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("post-media").getPublicUrl(storagePath);

  const initiated: InitiationRpcResult = await adminSupabase.rpc("initiate_media_upload", {
    p_post_id: parsedBody.data.postId,
    p_owner_id: user.id,
    p_storage_path: storagePath,
    p_public_url: publicUrl,
    p_width: validation.dimensions?.width ?? null,
    p_height: validation.dimensions?.height ?? null,
    p_media_kind: validation.mediaKind === "video" ? "video" : "photo",
    p_mime_type: validation.mimeType,
    p_byte_size: parsedBody.data.sizeBytes,
    p_duration_ms: parsedBody.data.durationMs ?? null,
    p_license_note: JSON.stringify({
      status: "uploaded",
      kind: validation.mediaKind,
      mimeType: validation.mimeType,
      durationMs: parsedBody.data.durationMs ?? null,
      audio: parsedBody.data.audio ?? null,
    }),
  });
  const initiatedAsset = firstInitiatedAsset(initiated.data);
  if (initiated.error || !initiatedAsset) return NextResponse.json({ error: "media persist failed" }, { status: 500 });

  return NextResponse.json(
    {
      asset: initiatedAsset,
      upload: { uploadUrl: signed.data.signedUrl, storagePath, publicUrl, headers: { "content-type": validation.mimeType } },
      status: "uploaded",
      deduped: false,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

function firstInitiatedAsset(data: InitiationRpcResult["data"]): InitiatedMediaAssetRow | null {
  if (!data) return null;
  if ("id" in data) return data;
  return data[0] ?? null;
}
