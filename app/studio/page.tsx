"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCreatorLedger, summarizeLedger, type LedgerEntryRow } from "@/lib/backend/earnings";
import { pct, statsForPosts, totals } from "@/lib/analytics";
import { POSTS } from "@/lib/catalog";
import { creatorSharePercent } from "@/lib/commerce/revenue";
import { isBackendConfigured, isDemoMode } from "@/lib/config";
import { compact, won } from "@/lib/format";
import { useApp, useHydrated } from "@/lib/store";
import { BarChartIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";

/**
 * Creator Studio — **비공개 백스테이지**.
 *
 * 커머스 무결성 원칙: 매출은 무대 뒤에 산다 (docs/COMMERCE_INTEGRITY.md).
 * GMV·전환·수익·지급은 오직 이 화면(크리에이터 본인)에만 존재하고,
 * 공개 프로필·피드·상품 시트 어디에도 노출되지 않는다.
 */
export default function StudioPage() {
  const hydrated = useHydrated();
  const { userPosts, events, session, remotePosts } = useApp();
  const demo = isDemoMode();
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
  const hasReal = (entries?.length ?? 0) > 0;

  // 퍼널(조회·탭·이동)은 이벤트 집계 — 커머스 금액과 구분해서 보여준다
  const myPosts = [
    ...(session ? remotePosts.filter((p) => p.creatorId === session.userId) : []),
    ...(hydrated && demo ? userPosts : []),
    ...(demo ? POSTS : []),
  ];
  const t = totals(statsForPosts(myPosts, hydrated ? events : []).values());
  const conversionRate = t.outbound > 0 ? (summary.monthOrders / t.outbound) * 100 : 0;

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/profile" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">크리에이터 스튜디오</p>
        <span className="ml-auto mr-3 rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
          나만 보임
        </span>
      </header>

      {!hydrated ? null : !session ? (
        <Notice
          title="로그인이 필요해요"
          body="스튜디오는 크리에이터 본인에게만 보이는 공간이에요."
          cta={{ href: "/login", label: "로그인" }}
        />
      ) : loading ? (
        <p className="px-4 py-16 text-center text-sm text-ink-2">불러오는 중...</p>
      ) : (
        <>
          {/* 커머스 4대 지표 — 전부 실 원장 데이터 */}
          <div className="grid grid-cols-2 gap-2.5 px-4 pt-4">
            <Kpi label="이번 달 GMV" value={won(summary.monthGmv)} sub={`구매 ${summary.monthOrders}건`} />
            <Kpi
              label="전환율"
              value={`${conversionRate.toFixed(1)}%`}
              sub={`구매처 이동 ${compact(t.outbound)}`}
            />
            <Kpi
              label="수익 (확정)"
              value={won(summary.confirmed + summary.payable + summary.paidTotal)}
              sub={`미확정 ${won(summary.pending)}`}
            />
            <Kpi label="지급 가능" value={won(summary.payable)} sub={`누적 지급 ${won(summary.paidTotal)}`} highlight />
          </div>

          {!hasReal && (
            <p className="mx-4 mt-3 rounded-(--radius-card) border border-line bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-ink-2">
              아직 전환 데이터가 없어요. 판매처에서 구매가 확인되면 여기에 실제 금액이 기록됩니다.
              {!isBackendConfigured() && " (백엔드 미설정 상태예요.)"}
            </p>
          )}

          {/* 지급 — 현재 한계를 정직하게 표시한다 */}
          <div className="mx-4 mt-4 rounded-(--radius-card) border border-line bg-surface p-4">
            <p className="text-[13px] font-semibold">지급</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
              확정 수익은 보류 기간(30일) 후 지급 가능 상태가 돼요. 판매 수수료 중 크리에이터 몫은{" "}
              {creatorSharePercent()}%입니다.
            </p>
            <p className="mt-2 text-[12px] font-medium text-[#b3752e]">
              지급 실행(계좌 등록·이체)은 준비 중이에요.
            </p>
          </div>

          {/* 상세 이동 */}
          <div className="mt-4 flex flex-col gap-2 px-4">
            <StudioLink href="/creator/earnings" label="정산 내역" desc="건별 드릴다운 · 게시물→상품→전환" />
            <StudioLink href="/analytics" label="콘텐츠 애널리틱스" desc={`조회 ${compact(t.views)} · OTR ${pct(t.taps, t.views)}%`} />
          </div>
        </>
      )}
    </div>
  );
}

function StudioLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="press flex items-center gap-2.5 rounded-(--radius-card) border border-line bg-surface px-4 py-3.5"
    >
      <BarChartIcon size={18} className="text-accent" />
      <span className="flex-1">
        <span className="block text-[14px] font-medium">{label}</span>
        <span className="block text-[11.5px] text-ink-2">{desc}</span>
      </span>
      <ChevronRightIcon size={16} className="text-ink-2" />
    </Link>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-(--radius-card) border bg-surface p-3.5 ${
        highlight ? "border-primary ring-1 ring-primary/25" : "border-line"
      }`}
    >
      <p className={`text-[11px] ${highlight ? "font-semibold text-primary" : "text-ink-2"}`}>{label}</p>
      <p className="mt-0.5 truncate text-[17px] font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-ink-2">{sub}</p>
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
