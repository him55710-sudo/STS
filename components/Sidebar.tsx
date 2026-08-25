"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, useHydrated } from "@/lib/store";
import {
  BarChartIcon,
  BookmarkIcon,
  HomeIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "./Icons";

const NAV = [
  { href: "/feed", label: "홈", Icon: HomeIcon },
  { href: "/discover", label: "발견", Icon: SearchIcon },
  { href: "/saved", label: "저장됨", Icon: BookmarkIcon },
  { href: "/create", label: "만들기", Icon: PlusIcon },
  { href: "/analytics", label: "애널리틱스", Icon: BarChartIcon },
  { href: "/admin", label: "운영", Icon: SettingsIcon },
];

/** 데스크톱 웹 좌측 내비게이션 — SEEIT web layout */
export default function Sidebar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-bg px-4 py-6 lg:flex">
      <Link href="/" className="px-3 text-[22px] font-extrabold tracking-[0.14em]">
        STS<span className="text-primary">.</span>
      </Link>
      <p className="mt-1 px-3 text-[11px] text-ink-2">See it. Tap it. Shop it.</p>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`press flex items-center gap-3 rounded-(--radius-btn) px-3 py-2.5 text-[14px] transition-colors ${
                active ? "bg-surface font-bold text-ink shadow-sm" : "font-medium text-ink-2 hover:bg-surface-2"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 1.9 : 1.5} />
              {label}
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
  );
}
