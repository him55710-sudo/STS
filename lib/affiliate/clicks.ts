import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const clickSchema = z.object({
  productId: z.string().min(1).max(120),
  postId: z.string().min(1).max(120).optional(),
  objectId: z.string().min(1).max(120).optional(),
  creatorId: z.string().min(1).max(120).optional(),
  network: z.string().min(1).max(40),
  destinationUrl: z.string().url(),
  affiliateUrl: z.string().url().optional(),
  referrer: z.string().max(2048).optional(),
  userAgent: z.string().max(1024).optional(),
});

export type AffiliateClickInput = z.infer<typeof clickSchema>;

export async function recordAffiliateClick(input: AffiliateClickInput): Promise<void> {
  const parsed = clickSchema.parse(input);
  const client = createServiceClient();
  if (!client) return;

  const clickId = randomUUID();
  const { error: clickError } = await client.from("affiliate_clicks").insert({
    click_id: clickId,
    product_id: parsed.productId,
    post_id: parsed.postId,
    object_id: parsed.objectId,
    creator_key: parsed.creatorId,
    network: parsed.network,
    destination_url: parsed.destinationUrl,
    affiliate_url: parsed.affiliateUrl,
    referrer: parsed.referrer,
    user_agent: parsed.userAgent,
  });
  if (clickError) throw clickError;

  const { error: analyticsError } = await client.from("analytics_events").insert({
    event_type: "outbound_click",
    post_id: parsed.postId,
    product_id: parsed.productId,
    object_id: parsed.objectId,
    source: parsed.network,
    metadata: { click_id: clickId, creator_key: parsed.creatorId ?? null },
  });
  if (analyticsError) throw analyticsError;
}

function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
