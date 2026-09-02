import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordStoryViewOnce } from "@/lib/stories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const storyViewSchema = z.strictObject({
  storyId: z.string().min(1),
  viewerSessionId: z.string().min(1).max(160),
  idempotencyKey: z.string().min(1).max(160),
});

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid body" }, { status: 400, headers: noStoreHeaders() });
    }
    throw error;
  }

  const parsed = storyViewSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid story view request" }, { status: 400, headers: noStoreHeaders() });
  }

  const userId = await authenticatedUserId();
  if (userId !== null) {
    const recorded = await recordSupabaseStoryView({ storyId: parsed.data.storyId, viewerId: userId });
    return NextResponse.json(
      { view: { storyId: parsed.data.storyId, viewerSessionId: userId, viewedAt: recorded.viewedAt, idempotent: recorded.idempotent } },
      { status: recorded.idempotent ? 200 : 201, headers: noStoreHeaders() },
    );
  }

  const view = recordStoryViewOnce({
    storyId: parsed.data.storyId,
    viewerSessionId: parsed.data.viewerSessionId,
    viewedAt: new Date(),
  });
  return NextResponse.json({ view }, { status: view.idempotent ? 200 : 201, headers: noStoreHeaders() });
}

type SupabaseStoryViewWrite = {
  readonly storyId: string;
  readonly viewerId: string;
};

type SupabaseStoryViewResult = {
  readonly viewedAt: string;
  readonly idempotent: boolean;
};

function hasSupabaseServerConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function authenticatedUserId(): Promise<string | null> {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function recordSupabaseStoryView(write: SupabaseStoryViewWrite): Promise<SupabaseStoryViewResult> {
  const now = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("story_item_views")
    .upsert(
      { story_item_id: write.storyId, viewer_id: write.viewerId, viewed_at: now },
      { onConflict: "story_item_id,viewer_id", ignoreDuplicates: true },
    )
    .select("viewed_at")
    .maybeSingle();

  if (error) throw error;
  return {
    viewedAt: typeof data?.viewed_at === "string" ? data.viewed_at : now,
    idempotent: data === null,
  };
}

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}
