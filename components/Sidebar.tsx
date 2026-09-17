"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, useHydrated } from "@/lib/store";
import {
  BarChartIcon,
  BookmarkIcon,
  EyeIcon,
  HomeIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "./Icons";
import { Sparkles, FileText } from "lucide-react";
import { IrServicePlanModal } from "./ir/IrServicePlanModal";

const NAV = [
  { href: "/", label: "메인 홈", Icon: HomeIcon },
  { href: "/beauty-demo", label: "뷰티 데모 (8단계)", Icon: Sparkles, badge: "IR 핵심" },
  { href: "/feed", label: "소셜 피드", Icon: BookmarkIcon },
  { href: "/reels", label: "릴스 숏폼", Icon: EyeIcon },
  { href: "/analytics", label: "AI 성과분석", Icon: BarChartIcon },
  { href: "/create", label: "만들기", Icon: PlusIcon },
  { href: "/discover", label: "발견", Icon: SearchIcon },
  { href: "/admin", label: "운영", Icon: SettingsIcon },
];

/** 데스크톱 웹 좌측 내비게이션 — SEEIT web layout */
export default function Sidebar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);
  const [irModalOpen, setIrModalOpen] = useState(false);

  if (pathname.startsWith("/demo")) {
    return null;
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-line bg-bg px-4 py-6 lg:flex z-30">
        <Link href="/" className="px-3 text-[22px] font-extrabold tracking-[0.14em] hover:opacity-80 transition">
          STS<span className="text-primary">.</span>
        </Link>
        <p className="mt-1 px-3 text-[11px] text-ink-2">See it. Tap it. Shop it.</p>

        {/* IR & Service Plan Fast Access Button */}
        <div className="mt-4 px-2">
          <button
            type="button"
            onClick={() => setIrModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-[#FF2D78]/30 bg-gradient-to-r from-[#FF2D78]/10 via-purple-500/10 to-transparent px-3 py-2 text-xs font-bold text-ink hover:bg-[#FF2D78]/15 transition-all shadow-sm group"
          >
            <span className="flex items-center gap-2">
              <FileText size={15} className="text-[#FF2D78]" />
              IR & 서비스 계획
            </span>
            <span className="rounded bg-[#FF2D78] px-1.5 py-0.5 text-[9px] font-black text-white group-hover:scale-105 transition-transform">
              PDF
            </span>
          </button>
        </div>

        <nav className="mt-5 flex flex-col gap-1">
          {NAV.map(({ href, label, Icon, badge }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`press flex items-center justify-between rounded-(--radius-btn) px-3 py-2.5 text-[14px] transition-colors ${
                  active ? "bg-surface font-bold text-ink shadow-sm" : "font-medium text-ink-2 hover:bg-surface-2"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} strokeWidth={active ? 1.9 : 1.5} />
                  {label}
                </span>
                {badge && (
                  <span className="rounded-full bg-[#FF2D78]/15 px-2 py-0.5 text-[10px] font-bold text-[#FF2D78]">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          {hydrated && user ? (
            <Link href="/profile" className="flex items-center gap-2.5 rounded-(--radius-card) border border-line bg-surface px-3 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">
                {user.name[0]}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{user.name}</span>
                <span className="block text-[11px] text-ink-2">@me.sts</span>
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="press flex h-11 items-center justify-center rounded-(--radius-btn) bg-ink text-[13px] font-bold text-surface"
            >
              3초 만에 시작하기
            </Link>
          )}
        </div>
      </aside>

      <IrServicePlanModal isOpen={irModalOpen} onClose={() => setIrModalOpen(false)} />
    </>
  );
}
