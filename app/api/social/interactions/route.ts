import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createInMemorySocialRateLimiter,
  createSupabaseSocialInteractionRepository,
  recordSocialInteraction,
  type SocialInteractionResult,
  type SocialModerationHook,
  type SupabaseSocialClient,
} from "@/lib/social-interactions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const interactionSchema = z.strictObject({
  kind: z.enum(["like", "save", "follow", "comment", "share", "view", "repost"]),
  targetId: z.string().min(1),
  idempotencyKey: z.string().min(1).max(160),
  commentText: z.string().min(1).max(2_000).optional(),
  shareChannel: z.string().min(1).max(80).optional(),
  repostPostId: z.string().min(1).optional(),
  attribution: z.string().min(1).max(500).optional(),
});

const limiter = createInMemorySocialRateLimiter({ maxEvents: 120, windowMs: 60_000 });
const moderation: SocialModerationHook = {
  reviewComment(request) {
    const lowered = request.text.toLowerCase();
    return lowered.includes("spam") || lowered.includes("abuse") ? { state: "blocked" } : { state: "pending" };
  },
};

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

  const parsed = interactionSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "invalid social interaction request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "missing-session" }, { status: 401 });

  const result = await recordSocialInteraction({
    command: { actorId: user.id, occurredAt: new Date(), ...parsed.data },
    repository: createSupabaseSocialInteractionRepository({
      maybeSingle(request) {
        return supabase.from(request.table).select(request.columns).eq(request.column, request.value).maybeSingle();
      },
      rpc(name, args) {
        return supabase.rpc(name, args);
      },
    } satisfies SupabaseSocialClient),
    limiter,
    moderation,
  });
  return responseForResult(result);
}

function responseForResult(result: SocialInteractionResult) {
  switch (result.kind) {
    case "recorded":
      return NextResponse.json(
        { interaction: result.interaction, idempotent: result.idempotent },
        { status: result.idempotent ? 200 : 201, headers: { "Cache-Control": "no-store" } },
      );
    case "denied":
      return NextResponse.json({ error: result.reason }, { status: 403, headers: { "Cache-Control": "no-store" } });
    case "rate_limited":
      return NextResponse.json({ error: "rate_limited", retryAfterMs: result.retryAfterMs }, { status: 429, headers: { "Cache-Control": "no-store" } });
    case "rejected":
      return NextResponse.json({ error: result.reason }, { status: 400, headers: { "Cache-Control": "no-store" } });
    default:
      return assertNever(result);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled social interaction result: ${JSON.stringify(value)}`);
}
