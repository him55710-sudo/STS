"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchCreatorLedger,
  summarizeLedger,
  type LedgerEntryRow,
} from "@/lib/backend/earnings";
import { canonicalById, merchantById } from "@/lib/commerce";
import { creatorSharePercent } from "@/lib/commerce/revenue";
import { isBackendConfigured } from "@/lib/config";
import { compact, won } from "@/lib/format";
import { useApp, useHydrated } from "@/lib/store";
import { ChevronLeftIcon } from "@/components/Icons";

/**
 * 크리에이터 수익 — 재무 진실(conversions + creator_ledger_entries)만 표시한다.
 * 추정치가 아니다: 모든 금액은 provider postback으로 들어온 전환과
 * 원장 분배 행의 합계다. 드릴다운: 게시물 → 오브젝트 → 상품 → 판매처 → 전환 → 수익.
 */
export default function EarningsPage() {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const [entries, setEntries] = useState<LedgerEntryRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchCreatorLedger()
      .then((rows) => {
        if (!cancelled) setEntries(rows ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const summary = summarizeLedger(entries ?? []);

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/profile" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">수익 정산</p>
        <span className="ml-auto pr-3 text-[11px] text-ink-2">
          수수료의 {creatorSharePercent()}%가 크리에이터 몫
        </span>
      </header>

      {!hydrated ? null : !isBackendConfigured() ? (
        <Notice
          title="백엔드가 설정되지 않았어요"
          body="수익 정산은 실 전환 데이터(conversions·ledger)에서만 계산됩니다. Supabase 환경변수를 설정하면 활성화돼요."
        />
      ) : !session ? (
        <Notice
          title="로그인이 필요해요"
          body="내 게시물로 발생한 구매와 정산 내역을 보려면 로그인하세요."
          cta={{ href: "/login", label: "로그인" }}
        />
      ) : loading ? (
        <p className="px-4 py-16 text-center text-sm text-ink-2">불러오는 중...</p>
      ) : (
        <>
          {/* 6 KPI — 전부 원장/전환 실데이터 */}
          <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 lg:grid-cols-3">
            <Kpi label="이번 달 GMV" value={won(summary.monthGmv)} />
            <Kpi label="구매 건수" value={compact(summary.monthOrders)} />
            <Kpi label="미확정 수익" value={won(summary.pending)} sub="pending" />
            <Kpi label="확정 수익" value={won(summary.confirmed)} sub="보류 기간 경과 후 지급 가능" />
            <Kpi label="지급 가능" value={won(summary.payable)} highlight />
            <Kpi label="누적 지급" value={won(summary.paidTotal)} />
          </div>

          <div className="px-4 pb-8 pt-5">
            <p className="mb-2.5 text-[13px] font-semibold">정산 내역</p>
            {(entries ?? []).length === 0 ? (
              <p className="rounded-(--radius-card) border border-line bg-surface px-3 py-10 text-center text-[12.5px] leading-relaxed text-ink-2">
                아직 전환이 없어요. 게시물 속 물건이 구매되면
                <br />
                판매처 postback이 도착하는 즉시 여기에 기록됩니다.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {(entries ?? []).map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** 드릴다운: 게시물 → 오브젝트 → 상품 → 판매처 → 전환 → 수익 */
function EntryCard({ entry }: { entry: LedgerEntryRow }) {
  const conv = entry.conversions;
  const click = conv?.commerce_clicks ?? null;
  const product = canonicalById(click?.canonical_product_id);
  const merchant = click ? merchantById(click.merchant_id) : undefined;

  return (
    <details className="rounded-(--radius-card) border border-line bg-surface">
      <summary className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
        {product && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={product.primaryImage} alt="" className="h-10 w-10 rounded-[7px] border border-line object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">
            {product ? `${product.brand} ${product.modelName}` : "상품 정보 없음"}
          </p>
          <p className="text-[11px] text-ink-2">
            {merchant?.name ?? conv?.provider ?? "-"} ·{" "}
            {conv ? new Date(conv.occurred_at).toLocaleDateString("ko-KR") : "-"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] font-bold">{won(entry.creator_share)}</p>
          <StatusBadge status={entry.status} />
        </div>
      </summary>
      <div className="border-t border-line px-3.5 py-3 text-[12px] leading-relaxed text-ink-2">
        <Row k="게시물">
          {click?.post_id ? (
            <Link href={`/post/${click.post_id}`} className="text-accent underline-offset-2 hover:underline">
              {click.post_id}
            </Link>
          ) : (
            "컨텍스트 없음"
          )}
        </Row>
        <Row k="오브젝트">{click?.object_id ?? "-"}</Row>
        <Row k="상품">{product ? `${product.brand} ${product.modelName}` : (click?.canonical_product_id ?? "-")}</Row>
        <Row k="판매처">{merchant?.name ?? click?.merchant_id ?? "-"}</Row>
        <Row k="유입면">{click?.source_surface ?? "-"}</Row>
        <Row k="주문금액">{conv ? won(conv.gross_order_value) : "-"}</Row>
        <Row k="총수수료">{won(entry.gross_commission)}</Row>
        <Row k="내 몫 / 플랫폼">{won(entry.creator_share)} / {won(entry.platform_share)}</Row>
        <Row k="전환 상태">{conv?.status ?? "-"}{conv?.external_order_id ? ` · 주문 ${conv.external_order_id}` : ""}</Row>
        {entry.available_at && (
          <Row k="지급 가능일">{new Date(entry.available_at).toLocaleDateString("ko-KR")}</Row>
        )}
        {entry.paid_at && <Row k="지급일">{new Date(entry.paid_at).toLocaleDateString("ko-KR")}</Row>}
      </div>
    </details>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="w-20 shrink-0 text-ink-2">{k}</span>
      <span className="min-w-0 flex-1 text-ink">{children}</span>
    </p>
  );
}

const STATUS_LABEL: Record<LedgerEntryRow["status"], { label: string; cls: string }> = {
  pending: { label: "미확정", cls: "bg-surface-2 text-ink-2" },
  confirmed: { label: "확정", cls: "bg-primary-soft text-primary" },
  payable: { label: "지급 가능", cls: "bg-primary text-white" },
  paid: { label: "지급 완료", cls: "bg-ink text-surface" },
  reversed: { label: "반전됨", cls: "bg-[#fdecec] text-[#c0392b]" },
};

function StatusBadge({ status }: { status: LedgerEntryRow["status"] }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={`inline-block rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-(--radius-card) border bg-surface p-3.5 ${
        highlight ? "border-primary ring-1 ring-primary/25" : "border-line"
      }`}
    >
      <p className={`text-[11px] ${highlight ? "font-semibold text-primary" : "text-ink-2"}`}>{label}</p>
      <p className="mt-0.5 truncate text-[17px] font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-ink-2">{sub}</p>}
    </div>
  );
}

function Notice({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 rounded-(--radius-btn) bg-ink px-5 py-2.5 text-[13px] font-semibold text-surface"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
