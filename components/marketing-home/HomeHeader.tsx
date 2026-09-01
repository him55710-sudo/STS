"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRightIcon, SearchIcon, XIcon } from "@/components/Icons";
import { HOME_MENUS, type HomeMenuId } from "@/lib/marketing-home";

type HomeHeaderProps = {
  readonly platformHref: string;
  readonly platformLabel: string;
};

export default function HomeHeader({ platformHref, platformLabel }: HomeHeaderProps) {
  const [openMenu, setOpenMenu] = useState<HomeMenuId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  return (
    <header className="absolute inset-x-0 top-0 z-40 text-surface">
      <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="#top" className="font-serif text-[29px] tracking-[-0.07em]" aria-label="STS 홈">
          STS<span className="text-lilac">.</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="STS 주요 메뉴">
          {HOME_MENUS.map((menu) => (
            <button
              key={menu.id}
              type="button"
              aria-expanded={openMenu === menu.id}
              aria-controls={`${menu.id}-mega-menu`}
              onClick={() => setOpenMenu((current) => current === menu.id ? null : menu.id)}
              onMouseEnter={() => setOpenMenu(menu.id)}
              className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-white/90 transition-[color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {menu.label}
              <span className={`h-1.5 w-1.5 rotate-45 border-b border-r border-white/80 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${openMenu === menu.id ? "-translate-y-0.5 rotate-[225deg]" : ""}`} />
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/discover" className="rounded-full p-3 text-white/80 transition-[background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white" aria-label="상품 검색">
            <SearchIcon size={18} strokeWidth={1.7} />
          </Link>
          <Link href={platformHref} className="text-[13px] font-semibold text-white/90 transition-colors duration-500 hover:text-white">{platformLabel}</Link>
          <Link href="/login?next=%2Fcreator" className="rounded-full border border-white/65 px-4 py-2.5 text-[12px] font-bold text-white transition-[background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">시작하기</Link>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <Link href={platformHref} className="text-[11px] font-bold text-white">{platformLabel}</Link>
          <button type="button" aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} className="rounded-full border border-white/55 p-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {mobileOpen ? <XIcon size={17} strokeWidth={1.8} /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {openMenu && (
        <div id={`${openMenu}-mega-menu`} role="dialog" aria-label={`${HOME_MENUS.find((menu) => menu.id === openMenu)?.label} 메뉴`} onMouseLeave={() => setOpenMenu(null)} className="absolute inset-x-0 top-full border-y border-line bg-bg text-ink shadow-[0_28px_70px_rgba(17,18,20,0.22)]">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">STS / {openMenu}</p>
              <p className="mt-4 max-w-[280px] font-serif text-[clamp(2rem,4vw,3.7rem)] leading-[0.95] tracking-[-0.07em]">{HOME_MENUS.find((menu) => menu.id === openMenu)?.intro}</p>
            </div>
            <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {HOME_MENUS.find((menu) => menu.id === openMenu)?.items.map((item) => (
                <Link key={item.title} href={item.href} onClick={close} className="group bg-bg p-5 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-stone focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[14px] font-bold">{item.title}</span>
                    <ArrowUpRightIcon size={16} strokeWidth={1.6} className="shrink-0 text-primary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-3 block max-w-[260px] text-[12px] leading-[1.65] text-ink-2">{item.body}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full min-h-[calc(100dvh-84px)] overflow-y-auto border-t border-line bg-bg px-5 py-7 text-ink shadow-2xl lg:hidden">
          <div className="grid gap-8 sm:grid-cols-3">
            {HOME_MENUS.map((menu) => (
              <div key={menu.id}>
                <p className="font-serif text-[25px] tracking-[-0.05em]">{menu.label}</p>
                <div className="mt-4 grid gap-4">
                  {menu.items.map((item) => (
                    <Link key={item.title} href={item.href} onClick={close} className="border-b border-line pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                      <p className="text-[13px] font-bold">{item.title}</p>
                      <p className="mt-1 text-[11px] leading-[1.55] text-ink-2">{item.body}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-9 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            <Link href={platformHref} onClick={close} className="border border-line py-3.5 text-center text-[12px] font-bold">{platformLabel}</Link>
            <Link href="/login?next=%2Fcreator" onClick={close} className="bg-ink py-3.5 text-center text-[12px] font-bold text-surface">크리에이터 시작</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
