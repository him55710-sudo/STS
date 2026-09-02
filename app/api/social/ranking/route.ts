import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rankSocialFeed } from "@/lib/social-ranking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const sourceQualitySchema = z.strictObject({
  trustScore: z.number().min(0).max(1),
  attributionComplete: z.boolean(),
});

const postSchema = z.strictObject({
  id: z.string().min(1),
  creatorId: z.string().min(1),
  visibility: z.enum(["public", "private", "unlisted"]),
  publishState: z.enum(["draft", "scheduled", "published", "archived"]),
  displayState: z.enum(["pending", "approved", "blocked"]),
  publishedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  rightsStatus: z.enum(["pending", "approved", "rejected", "expired", "takedown"]),
  rightsExpiresAt: z.string().nullable(),
  canDisplay: z.boolean(),
  canUseForCommerceMatching: z.boolean(),
  takedownAt: z.string().nullable(),
  sourceKind: z.enum(["user_upload", "licensed_editorial", "brand_feed", "official_embed", "demo_seed"]).optional(),
  category: z.string().min(1),
  sourceQuality: sourceQualitySchema,
});

const eventSchema = z.strictObject({
  kind: z.enum(["view", "like", "save", "comment", "share", "repost"]),
  actorId: z.string().min(1),
  postId: z.string().min(1),
  occurredAt: z.string().min(1),
  value: z.number().finite().nonnegative(),
});

const followSchema = z.strictObject({
  followerId: z.string().min(1),
  creatorId: z.string().min(1),
});

const rankingSchema = z.strictObject({
  mode: z.enum(["for_you", "following"]),
  posts: z.array(postSchema),
  events: z.array(eventSchema),
  follows: z.array(followSchema),
});

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    throw error;
  }

  const parsed = rankingSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "invalid social ranking request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "missing-session" }, { status: 401 });

  const ranked = rankSocialFeed({ viewerId: user.id, now: new Date(), ...parsed.data });
  return NextResponse.json({ items: ranked }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
