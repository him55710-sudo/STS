import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const completeSchema = z.strictObject({
  assetId: z.string().min(1),
});

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type StorageVerification =
  | { readonly kind: "uploaded"; readonly contentHash: string }
  | { readonly kind: "missing" }
  | { readonly kind: "failed" };
type CompletedMediaAssetRow = {
  readonly id: string;
  readonly storage_path: string | null;
  readonly public_url: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly content_hash: string | null;
  readonly processing_state: string;
  readonly processing_error: string | null;
};
type CompletionRpcResult = {
  readonly data: CompletedMediaAssetRow | readonly CompletedMediaAssetRow[] | null;
  readonly error: { readonly message?: string } | null;
};

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsedBody = completeSchema.safeParse(rawBody);
  if (!parsedBody.success) return NextResponse.json({ error: "invalid media completion request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "missing-session" }, { status: 401 });

  const current = await supabase
    .from("media_assets")
    .select("id, post_id, storage_path, public_url, source, content_hash, processing_state, posts!inner(creator_id)")
    .eq("id", parsedBody.data.assetId)
    .eq("posts.creator_id", user.id)
    .maybeSingle();
  if (current.error) return NextResponse.json({ error: "media lookup failed" }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "media not found" }, { status: 404 });
  if (!current.data.storage_path) return NextResponse.json({ error: "media upload missing" }, { status: 409 });
  if (current.data.processing_state === "processing") {
    return NextResponse.json({ asset: current.data, status: "processing", publishable: false }, { status: 200 });
  }
  if (current.data.processing_state !== "uploaded") {
    return NextResponse.json({ error: "invalid media upload state" }, { status: 409 });
  }

  const storageVerification = await verifyUploadedStorageObject(supabase, current.data.storage_path);
  switch (storageVerification.kind) {
    case "uploaded":
      break;
    case "missing":
      return NextResponse.json({ error: "media upload missing" }, { status: 409 });
    case "failed":
      return NextResponse.json({ error: "media storage verification failed" }, { status: 503 });
    default:
      return assertNever(storageVerification);
  }

  const completed: CompletionRpcResult = await supabase.rpc("complete_media_upload_and_enqueue", {
    p_asset_id: current.data.id,
    p_content_hash: storageVerification.contentHash,
  });
  const completedAsset = firstCompletedAsset(completed.data);
  if (completed.error || !completedAsset) {
    return NextResponse.json({ error: "media queue enqueue failed" }, { status: 503 });
  }

  return NextResponse.json(
    { asset: completedAsset, status: "processing", publishable: false },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

async function verifyUploadedStorageObject(
  supabase: SupabaseServerClient,
  storagePath: string
): Promise<StorageVerification> {
  const separatorIndex = storagePath.lastIndexOf("/");
  const folder = separatorIndex === -1 ? "" : storagePath.slice(0, separatorIndex);
  const objectName = separatorIndex === -1 ? storagePath : storagePath.slice(separatorIndex + 1);
  const bucket = supabase.storage.from("post-media");
  const listed = await bucket.list(folder, { search: objectName, limit: 1 });
  if (listed.error) return { kind: "failed" };
  if (!listed.data?.some((object) => object.name === objectName)) return { kind: "missing" };
  const downloaded = await bucket.download(storagePath);
  if (downloaded.error || !downloaded.data) return { kind: "failed" };
  const bytes = Buffer.from(await downloaded.data.arrayBuffer());
  return { kind: "uploaded", contentHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
}

function firstCompletedAsset(data: CompletionRpcResult["data"]): CompletedMediaAssetRow | null {
  if (!data) return null;
  if ("id" in data) return data;
  return data[0] ?? null;
}

function assertNever(value: never): never {
  throw new Error(`unexpected storage verification result: ${JSON.stringify(value)}`);
}
