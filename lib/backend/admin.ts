"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * 관리자 운영 데이터 로더 — 전부 is_admin() RLS를 통과해야 보인다.
 * 관리자가 아니면 모든 목록이 빈 배열로 돌아온다 (권한 오류가 아니라 빈 결과).
 */

export interface AdminOverview {
  creators: number;
  posts_published: number;
  posts_draft: number;
  objects: number;
  objects_linked: number;
  objects_exact: number;
  canonical_products: number;
  merchant_offers: number;
  merchants: number;
  clicks: number;
  conversions: number;
  failed_postbacks: number;
  ledger_pending: number;
  ledger_confirmed: number;
  ledger_payable: number;
  ledger_paid: number;
  ledger_reversed: number;
  tiktok_connections: number;
  tiktok_imports: number;
  fraud_flags: number;
  fraud_critical: number;
}

export interface AdminPostRow {
  id: string;
  caption: string;
  status: string;
  source: string;
  created_at: string;
  published_at: string | null;
  creator_id: string;
  objects: { id: string; pipeline_version: string | null; confidence: number }[];
}

export interface AdminClickRow {
  id: string;
  created_at: string;
  creator_id: string | null;
  post_id: string | null;
  canonical_product_id: string | null;
  merchant_id: string;
  source_surface: string;
  viewer_id: string | null;
  provider: string;
}

export interface AdminConversionRow {
  id: string;
  provider: string;
  external_conversion_id: string;
  external_order_id: string | null;
  gross_order_value: number;
  commission_amount: number;
  status: string;
  occurred_at: string;
  confirmed_at: string | null;
}

export interface AdminLedgerRow {
  id: string;
  creator_id: string;
  conversion_id: string;
  gross_commission: number;
  creator_share: number;
  platform_share: number;
  status: string;
  available_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AdminFailureRow {
  id: string;
  provider: string;
  reason: string;
  created_at: string;
}

export interface AdminFraudRow {
  id: string;
  kind: string;
  severity: string;
  subject_type: string;
  subject_id: string;
  creator_id: string | null;
  reason: string;
  created_at: string;
}

export interface AdminConnectionRow {
  provider: string;
  connections: number;
  imports: number;
}

export interface AdminBundle {
  isAdmin: boolean;
  overview: AdminOverview | null;
  posts: AdminPostRow[];
  clicks: AdminClickRow[];
  conversions: AdminConversionRow[];
  ledger: AdminLedgerRow[];
  failures: AdminFailureRow[];
  fraud: AdminFraudRow[];
  tiktokImports: { provider_video_id: string; title: string | null; post_id: string | null; imported_at: string }[];
}

export const EMPTY_BUNDLE: AdminBundle = {
  isAdmin: false,
  overview: null,
  posts: [],
  clicks: [],
  conversions: [],
  ledger: [],
  failures: [],
  fraud: [],
  tiktokImports: [],
};

export async function fetchAdminBundle(userId: string | null): Promise<AdminBundle> {
  const supabase = getBrowserSupabase();
  if (!supabase || !userId) return EMPTY_BUNDLE;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "admin") return EMPTY_BUNDLE;

  const [overview, posts, clicks, conversions, ledger, failures, fraud, imports] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase
      .from("posts")
      .select("id, caption, status, source, created_at, published_at, creator_id, objects (id, pipeline_version, confidence)")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("commerce_clicks").select("*").order("created_at", { ascending: false }).limit(25),
    supabase.from("conversions").select("*").order("occurred_at", { ascending: false }).limit(25),
    supabase.from("creator_ledger_entries").select("*").order("created_at", { ascending: false }).limit(25),
    supabase.from("postback_failures").select("*").order("created_at", { ascending: false }).limit(25),
    supabase.from("fraud_flags").select("*").order("created_at", { ascending: false }).limit(25),
    supabase
      .from("tiktok_video_imports")
      .select("provider_video_id, title, post_id, imported_at")
      .order("imported_at", { ascending: false })
      .limit(25),
  ]);

  return {
    isAdmin: true,
    overview: (overview.data as AdminOverview | null) ?? null,
    posts: (posts.data ?? []) as unknown as AdminPostRow[],
    clicks: (clicks.data ?? []) as AdminClickRow[],
    conversions: (conversions.data ?? []) as AdminConversionRow[],
    ledger: (ledger.data ?? []) as AdminLedgerRow[],
    failures: (failures.data ?? []) as AdminFailureRow[],
    fraud: (fraud.data ?? []) as AdminFraudRow[],
    tiktokImports: (imports.data ?? []) as AdminBundle["tiktokImports"],
  };
}
