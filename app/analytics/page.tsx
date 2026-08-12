"use client";

import Link from "next/link";
import { POSTS } from "@/lib/catalog";
import { estimatedEarnings, pct, statsForPosts, totals } from "@/lib/analytics";
import { compact, won } from "@/lib/format";
import { useApp, useHydrated } from "@/lib/store";
import { ChevronLeftIcon } from "@/components/Icons";

/**
 * Creator Analytics — PRD §33 핵심 Funnel + §55 상거래 지표 전면 배치.
 * Post Impression → Object Tap → Product Sheet → Outbound Click → Purchase
 */
export default function AnalyticsPage() {
  const hydrated = useHydrated();
  const { userPosts, events } = useApp();
  const myPosts = hydrated ? [...userPosts, ...POSTS] : POSTS;
  const stats = statsForPosts(myPosts, hydrated ? events : []);
  const t = totals(stats.values());
  const purchases = Math.round(t.outbound * 0.025);

  const funnel = [
    { label: "콘텐츠 조회", value: t.views },
    { label: "오브젝트 탭", value: t.taps },
    { label: "상품 카드", value: t.cardOpens },
    { label: "구매처 이동", value: t.outbound },
    { label: "구매(추정)", value: purchases },
  ];
  const max = funnel[0].value || 1;

  const rows = myPosts
    .map((p) => ({ post: p, s: stats.get(p.id)! }))
    .sort((a, b) => b.s.views - a.s.views);

  return (
    <div>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/profile" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">애널리틱스</p>
        <span className="ml-auto pr-3 text-[12px] text-ink-2">이번 달</span>
      </header>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-2.5 px-4 pt-4">
        <Kpi label="OTR" value={`${pct(t.taps, t.views)}%`} sub="목표 ≥4%" />
        <Kpi label="Card→이동" value={`${pct(t.outbound, t.cardOpens)}%`} sub="목표 ≥35%" />
        <Kpi label="예상 수익" value={won(estimatedEarnings(t.outbound))} sub="수수료 75%" />
      </div>

      {/* Funnel */}
      <div className="mx-4 mt-4 rounded-(--radius-card) border border-line bg-surface p-4">
        <p className="mb-3 text-[13px] font-semibold">커머스 퍼널</p>
        <div className="flex flex-col gap-2.5">
          {funnel.map((f, i) => (
            <div key={f.label}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-ink-2">{f.label}</span>
                <span className="font-semibold">{compact(f.value)}</span>
              </div>
              <div className="h-[18px] overflow-hidden rounded-[5px] bg-surface-2">
                <div
                  className="h-full rounded-[5px]"
                  style={{
                    width: `${Math.max(1.5, (f.value / max) * 100)}%`,
                    background: `color-mix(in srgb, var(--color-accent) ${100 - i * 14}%, var(--color-surface-2))`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-2">
          구매는 판매처 전환율 2.5% 가정 추정치예요. 제휴 네트워크 연동 시 실제 주문 데이터로 대체됩니다.
        </p>
      </div>

      {/* 콘텐츠별 성과 */}
      <div className="px-4 pb-8 pt-5">
        <p className="mb-2.5 text-[13px] font-semibold">콘텐츠별 성과</p>
        <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
          <div className="grid grid-cols-[44px_1fr_64px_64px_56px] items-center gap-2 border-b border-line px-3 py-2 text-[11px] font-medium text-ink-2">
            <span />
            <span>콘텐츠</span>
            <span className="text-right">조회</span>
            <span className="text-right">탭</span>
            <span className="text-right">OTR</span>
          </div>
          {rows.map(({ post, s }) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="grid grid-cols-[44px_1fr_64px_64px_56px] items-center gap-2 border-b border-line px-3 py-2 last:border-b-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image} alt="" className="h-9 w-9 rounded-[6px] object-cover" />
              <span className="truncate text-[12px]">{post.caption}</span>
              <span className="text-right text-[12px] text-ink-2">{compact(s.views)}</span>
              <span className="text-right text-[12px] text-ink-2">{compact(s.taps)}</span>
              <span className="text-right text-[12px] font-semibold">{pct(s.taps, s.views)}%</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-3">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className="mt-0.5 truncate text-[16px] font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-ink-2">{sub}</p>
    </div>
  );
}
