"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRightIcon, XIcon } from "@/components/Icons";
import { BRAND_NAV_ITEMS } from "./BrandHomeData";

function MenuIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function BrandHomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const menuWasOpen = useRef(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setMenuOpen(false);
    };

    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      if (menuWasOpen.current) {
        menuWasOpen.current = false;
        menuButtonRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    menuWasOpen.current = true;
    const backgroundNodes = [
      document.querySelector("main"),
      document.querySelector("footer"),
      document.querySelector("[data-brand-floating-actions]"),
      logoRef.current,
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);
    const previousInert = backgroundNodes.map((node) => node.inert);
    backgroundNodes.forEach((node) => { node.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusableElements = () => [
      menuButtonRef.current,
      ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []),
    ].filter((element): element is HTMLElement => Boolean(element && element.getClientRects().length > 0));

    const firstMenuItem = menuRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])");
    firstMenuItem?.focus({ preventScroll: true });

    const keepFocusInsideMenu = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        menuButtonRef.current?.focus({ preventScroll: true });
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const restoreFocusInsideMenu = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && (menuRef.current?.contains(target) || target === menuButtonRef.current)) return;
      getFocusableElements()[0]?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", keepFocusInsideMenu);
    document.addEventListener("focusin", restoreFocusInsideMenu);
    return () => {
      document.removeEventListener("keydown", keepFocusInsideMenu);
      document.removeEventListener("focusin", restoreFocusInsideMenu);
      backgroundNodes.forEach((node, index) => { node.inert = previousInert[index] ?? false; });
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-7 lg:px-10">
      <div className="relative mx-auto flex h-16 max-w-[1080px] items-center justify-between rounded-brand-pill border border-white/75 bg-white/90 px-5 text-ink shadow-brand-nav backdrop-blur-md sm:px-7">
        <Link ref={logoRef} href="#top" aria-label="STS 홈으로 이동" className="font-sans text-[25px] font-black tracking-[-0.11em] transition-transform hover:scale-[0.97]">
          STS
        </Link>

        <nav aria-label="주 메뉴" className="hidden items-center gap-6 text-[12px] font-semibold lg:flex">
          {BRAND_NAV_ITEMS.map((item, index) => {
            const isActive = item.label === "브랜드";
            return (
              <span key={item.label} className="contents">
                {index === 3 && <span aria-hidden="true" className="h-4 w-px bg-line" />}
                <Link href={item.href} className={`group relative py-2 transition-colors hover:text-brand-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4 ${isActive ? "font-bold text-brand-wine" : ""}`}>
                  {item.label}
                  {isActive && <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-0.5 bg-brand-wine" />}
                </Link>
              </span>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login?next=%2Ffeed" className="rounded-brand-pill border border-line bg-white px-5 py-2.5 text-[12px] font-bold transition-colors hover:border-brand-wine hover:text-brand-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4">
            로그인
          </Link>
          <Link href="/login?next=%2Fcreator" className="inline-flex items-center gap-2 rounded-brand-pill bg-brand-wine px-5 py-2.5 text-[12px] font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4">
            시작하기 <ArrowUpRightIcon size={14} strokeWidth={1.8} />
          </Link>
        </div>

        <button ref={menuButtonRef} type="button" aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-haspopup="dialog" onClick={() => setMenuOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4 lg:hidden">
          {menuOpen ? <XIcon size={21} strokeWidth={1.7} /> : <MenuIcon />}
        </button>

        {menuOpen && (
          <div ref={menuRef} id="mobile-menu" role="dialog" aria-modal="true" aria-label="모바일 메뉴" className="absolute inset-x-0 top-[72px] overflow-hidden rounded-brand-panel border border-line bg-white p-5 text-ink shadow-brand-panel lg:hidden">
            <nav aria-label="모바일 주 메뉴" className="grid gap-1">
              {BRAND_NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} onClick={closeMenu} className={`flex items-center justify-between border-b border-brand-line py-4 text-[17px] font-semibold transition-colors hover:text-brand-wine ${item.label === "브랜드" ? "text-brand-wine" : ""}`}>
                  {item.label}
                  <ArrowUpRightIcon size={17} strokeWidth={1.7} />
                </Link>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/login?next=%2Ffeed" onClick={closeMenu} className="border border-line py-3 text-center text-[12px] font-bold">로그인</Link>
              <Link href="/login?next=%2Fcreator" onClick={closeMenu} className="bg-brand-wine py-3 text-center text-[12px] font-bold text-white">시작하기</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
