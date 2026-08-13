"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * 크리에이터 수익 조회 — 재무 진실은 conversions + creator_ledger_entries다.
 * RLS: 크리에이터는 자기 원장·자기 귀속 전환·자기 귀속 클릭만 읽을 수 있다.
 * 조회 전에 promote_payable_entries()로 보류 만료(confirmed→payable)를 반영한다.
 */

export interface EarningClickRow {
  id: string;
  post_id: string | null;
  object_id: string | null;
  canonical_product_id: string | null;
  offer_id: string;
  merchant_id: string;
  source_surface: string;
  created_at: string;
}

export interface EarningConversionRow {
  id: string;
  provider: string;
  external_order_id: string | null;
  gross_order_value: number;
  eligible_value: number;
  commission_amount: number;
  currency: string;
  status: "pending" | "confirmed" | "reversed";
  occurred_at: string;
  confirmed_at: string | null;
  commerce_clicks: EarningClickRow | null;
}

export interface LedgerEntryRow {
  id: string;
  creator_id: string;
  conversion_id: string;
  gross_commission: number;
  creator_share: number;
  platform_share: number;
  status: "pending" | "confirmed" | "reversed" | "payable" | "paid";
  available_at: string | null;
  paid_at: string | null;
  created_at: string;
  conversions: EarningConversionRow | null;
}

export async function fetchCreatorLedger(): Promise<LedgerEntryRow[] | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;

  // 보류 만료된 confirmed → payable 승격 (멱등)
  await supabase.rpc("promote_payable_entries").then(({ error }) => {
    if (error) console.warn(`[earnings] promote failed: ${error.message}`);
  });

  const { data, error } = await supabase
    .from("creator_ledger_entries")
    .select("*, conversions (*, commerce_clicks (*))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn(`[earnings] ledger fetch failed: ${error.message}`);
    return null;
  }
  return (data ?? []) as unknown as LedgerEntryRow[];
}

export interface EarningsSummaryData {
  monthGmv: number;
  monthOrders: number;
  pending: number;
  confirmed: number;
  payable: number;
  paidTotal: number;
}

/** 원장 행 → 수익 요약. "이번 달"은 전환 발생 시각(occurred_at) 기준 */
export function summarizeLedger(entries: LedgerEntryRow[], now = new Date()): EarningsSummaryData {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const s: EarningsSummaryData = {
    monthGmv: 0,
    monthOrders: 0,
    pending: 0,
    confirmed: 0,
    payable: 0,
    paidTotal: 0,
  };
  for (const e of entries) {
    const conv = e.conversions;
    if (conv && conv.status !== "reversed" && Date.parse(conv.occurred_at) >= monthStart) {
      s.monthGmv += conv.gross_order_value;
      s.monthOrders += 1;
    }
    if (e.status === "pending") s.pending += e.creator_share;
    else if (e.status === "confirmed") s.confirmed += e.creator_share;
    else if (e.status === "payable") s.payable += e.creator_share;
    else if (e.status === "paid") s.paidTotal += e.creator_share;
  }
  return s;
}
