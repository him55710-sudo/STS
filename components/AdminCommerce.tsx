"use client";

import { useEffect, useState } from "react";
import { canonicalById, merchantById } from "@/lib/commerce";
import { isBackendConfigured } from "@/lib/config";
import { won } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";

/**
 * 관리자 커머스 운영 뷰 — 클릭 / 전환 / 원장 / 반전 / 실패 postback.
 * 데이터는 RLS(is_admin)를 통과해야만 보인다: 관리자가 아니면 전부 빈 결과다.
 * 관리자 지정은 SQL로 한다: update profiles set role='admin' where id='...';
 */

interface ClickRow {
  id: string;
  creator_id: string | null;
  post_id: string | null;
  canonical_product_id: string | null;
  merchant_id: string;
  source_surface: string;
  viewer_id: string | null;
  created_at: string;
}
interface ConversionRow {
  id: string;
  provider: string;
  external_conversion_id: string;
  commission_amount: number;
  gross_order_value: number;
  status: string;
  occurred_at: string;
}
interface LedgerRow {
  id: string;
  creator_id: string;
  creator_share: number;
  platform_share: number;
  status: string;
  created_at: string;
}
interface FailureRow {
  id: string;
  provider: string;
  reason: string;
  created_at: string;
}

export default function AdminCommerce() {
  const session = useApp((s) => s.session);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !session) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.userId)
        .maybeSingle();
      if (cancelled) return;
      const admin = profile?.role === "admin";
      setIsAdmin(admin);
      if (!admin) return;

      const [c1, c2, c3, c4] = await Promise.all([
        supabase.from("commerce_clicks").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("conversions").select("*").order("occurred_at", { ascending: false }).limit(20),
        supabase.from("creator_ledger_entries").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("postback_failures").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      setClicks((c1.data ?? []) as ClickRow[]);
      setConversions((c2.data ?? []) as ConversionRow[]);
      setLedger((c3.data ?? []) as LedgerRow[]);
      setFailures((c4.data ?? []) as FailureRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!isBackendConfigured()) {
    return (
      <Section title="커머스 운영">
        <Empty text="백엔드 미설정 — 클릭/전환/원장 데이터는 Supabase 연결 시 표시됩니다." />
      </Section>
    );
  }
  if (isAdmin === false) {
    return (
      <Section title="커머스 운영">
        <Empty text="관리자 전용입니다. (profiles.role = 'admin' 계정으로 로그인)" />
      </Section>
    );
  }
  if (isAdmin == null) return null;

  const reversals = conversions.filter((c) => c.status === "reversed");

  return (
    <>
      <Section title={`클릭 (최근 ${clicks.length})`}>
        <Table
          rows={clicks.map((c) => ({
            key: c.id,
            cells: [
              new Date(c.created_at).toLocaleTimeString("ko-KR", { hour12: false }),
              canonicalById(c.canonical_product_id)?.modelName ?? c.canonical_product_id ?? "-",
              merchantById(c.merchant_id)?.name ?? c.merchant_id,
              c.source_surface,
              c.viewer_id ? "로그인" : "익명",
            ],
          }))}
          empty="아직 클릭이 없어요."
        />
      </Section>

      <Section title={`전환 (최근 ${conversions.length})`}>
        <Table
          rows={conversions.map((c) => ({
            key: c.id,
            cells: [
              new Date(c.occurred_at).toLocaleDateString("ko-KR"),
              c.provider,
              c.external_conversion_id,
              won(c.commission_amount),
              c.status,
            ],
          }))}
          empty="아직 전환이 없어요."
        />
      </Section>

      <Section title={`원장 (최근 ${ledger.length})`}>
        <Table
          rows={ledger.map((l) => ({
            key: l.id,
            cells: [
              new Date(l.created_at).toLocaleDateString("ko-KR"),
              l.creator_id.slice(0, 8),
              `크리에이터 ${won(l.creator_share)}`,
              `플랫폼 ${won(l.platform_share)}`,
              l.status,
            ],
          }))}
          empty="원장 기록이 없어요."
        />
      </Section>

      <Section title={`반전 (${reversals.length})`}>
        <Table
          rows={reversals.map((c) => ({
            key: c.id,
            cells: [c.provider, c.external_conversion_id, won(c.commission_amount), "reversed"],
          }))}
          empty="반전된 전환이 없어요."
        />
      </Section>

      <Section title={`실패한 postback (${failures.length})`}>
        <Table
          rows={failures.map((f) => ({
            key: f.id,
            cells: [
              new Date(f.created_at).toLocaleTimeString("ko-KR", { hour12: false }),
              f.provider,
              f.reason,
            ],
          }))}
          empty="검증 실패 기록이 없어요."
        />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5">
      <p className="mb-2 text-[13px] font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-(--radius-card) border border-line bg-surface px-3 py-5 text-center text-[12px] text-ink-2">
      {text}
    </p>
  );
}

function Table({ rows, empty }: { rows: { key: string; cells: string[] }[]; empty: string }) {
  if (rows.length === 0) return <Empty text={empty} />;
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11.5px] last:border-b-0"
        >
          {r.cells.map((c, i) => (
            <span key={i} className={i === 0 ? "shrink-0 text-ink-2" : "truncate"}>
              {c}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
