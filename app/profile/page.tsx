"use client";

import Link from "next/link";
import { POSTS } from "@/lib/catalog";
import { demoEstimatedEarnings, pct, statsForPosts, totals } from "@/lib/analytics";
import { isDemoMode } from "@/lib/config";
import { compact, won } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useApp, useHydrated } from "@/lib/store";
import {
  BarChartIcon,
  ChevronRightIcon,
  PlusIcon,
  SettingsIcon,
  TagIcon,
} from "@/components/Icons";

/**
 * Creator Console Home — 사업계획서 §17.
 * 이번 달 views / taps / outbound / earnings + 내 콘텐츠.
 */
export default function ProfilePage() {
  const hydrated = useHydrated();
  const { userPosts, events, user, signOut, session, remotePosts } = useApp();
  const demo = isDemoMode();

  // 실 세션: 내가 발행한 서버 게시물이 "내 콘텐츠". 데모 모드에서는 시드 전체를 보여준다
  const myRemote = session ? remotePosts.filter((p) => p.creatorId === session.userId) : [];
  const myPosts = [
    ...myRemote,
    ...(hydrated && demo ? userPosts : []),
    ...(demo ? POSTS : []),
  ];
  const stats = statsForPosts(myPosts, hydrated ? events : []);
  const t = totals(stats.values());
  const otr = pct(t.taps, t.views);
  const earnings = demoEstimatedEarnings(t.outbound);

  return (
    <div>
      <header className="flex items-center justify-between px-4 pt-4">
        <div>
          <h1 className="text-[19px] font-bold">
            {session ? session.displayName : hydrated && user ? user.name : "@me.sts"}
          </h1>
          {session ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
              @{session.handle} · 크리에이터 스튜디오
              <button
                onClick={() => getBrowserSupabase()?.auth.signOut()}
                className="press font-medium text-ink-2 underline underline-offset-2"
              >
                로그아웃
              </button>
            </p>
          ) : hydrated && user ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
              {user.provider === "kakao" ? "카카오" : "Google"} 데모 세션
              <button onClick={signOut} className="press font-medium text-ink-2 underline underline-offset-2">
                로그아웃
              </button>
            </p>
          ) : (
            <Link href="/login" className="mt-0.5 inline-block text-[12px] font-semibold text-primary">
              3초 로그인하고 수익 받기 →
            </Link>
          )}
        </div>
        <div className="flex gap-1.5">
          <Link
            href="/admin"
            aria-label="운영"
            className="flex h-9 w-9 items-center justify-center rounded-(--radius-btn) border border-line text-ink-2"
          >
            <SettingsIcon size={17} />
          </Link>
          <Link
            href="/create"
            aria-label="새 콘텐츠"
            className="flex h-9 w-9 items-center justify-center rounded-(--radius-btn) bg-ink text-surface"
          >
            <PlusIcon size={17} />
          </Link>
        </div>
      </header>

      {/* Product Tap Rate를 가장 위에 (PRD §55) */}
      <div className="mx-4 mt-4 rounded-(--radius-card) border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-medium text-ink-2">Object Tap Rate</p>
          <p className="text-[11px] text-ink-2">목표 ≥ 4%</p>
        </div>
        <p className="mt-1 text-[28px] font-bold tracking-tight">{otr}%</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.min(100, parseFloat(otr) * 10)}%` }}
          />
        </div>
      </div>

      <div className="mx-4 mt-2.5 grid grid-cols-2 gap-2.5">
        <Metric label="이번 달 조회" value={compact(t.views)} />
        <Metric label="오브젝트 탭" value={compact(t.taps)} />
        <Metric label="구매처 이동" value={compact(t.outbound)} />
        <Metric label="수익 (데모 추정치)" value={won(earnings)} accent />
      </div>

      <Link
        href="/creator/earnings"
        className="mx-4 mt-2.5 flex items-center gap-2.5 rounded-(--radius-card) border border-line bg-surface px-4 py-3.5"
      >
        <BarChartIcon size={18} className="text-primary" />
        <span className="flex-1 text-[14px] font-medium">수익 정산 (실데이터)</span>
        <ChevronRightIcon size={16} className="text-ink-2" />
      </Link>
      <Link
        href="/analytics"
        className="mx-4 mt-2 flex items-center gap-2.5 rounded-(--radius-card) border border-line bg-surface px-4 py-3.5"
      >
        <BarChartIcon size={18} className="text-accent" />
        <span className="flex-1 text-[14px] font-medium">상세 애널리틱스</span>
        <ChevronRightIcon size={16} className="text-ink-2" />
      </Link>

      <div className="mt-6 flex items-center justify-between px-4">
        <p className="text-[14px] font-semibold">내 콘텐츠 {myPosts.length}</p>
        <Link href="/create" className="flex items-center gap-1 text-[13px] font-medium text-accent">
          <TagIcon size={14} />새 shoppable 콘텐츠
        </Link>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-0.5">
        {myPosts.map((p) => {
          const s = stats.get(p.id);
          return (
            <Link key={p.id} href={`/post/${p.id}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.caption} className="aspect-square w-full object-cover" />
              {s && s.views > 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {compact(s.views)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-4">
      <p className="text-[12px] text-ink-2">{label}</p>
      <p className={`mt-1 text-[20px] font-bold tracking-tight ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
    </div>
  );
}
