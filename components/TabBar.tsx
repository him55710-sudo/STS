"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, HomeIcon, PlusIcon, SearchIcon, UserIcon } from "./Icons";

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/discover", label: "발견", Icon: SearchIcon },
  { href: "/create", label: "만들기", Icon: PlusIcon, center: true },
  { href: "/saved", label: "저장", Icon: BookmarkIcon },
  { href: "/profile", label: "프로필", Icon: UserIcon },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-surface/95 backdrop-blur-sm lg:hidden">
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, Icon, center }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          if (center) {
            return (
              <Link key={href} href={href} aria-label={label} className="flex items-center px-2">
                <span className="flex h-9 w-12 items-center justify-center rounded-(--radius-btn) bg-ink text-surface transition-transform active:scale-95">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center gap-0.5 px-3 pt-2.5 pb-2 transition-colors ${
                active ? "text-ink" : "text-ink-2"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 1.9 : 1.5} />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
