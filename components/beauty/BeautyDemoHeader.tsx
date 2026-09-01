"use client";

import Link from "next/link";

type BeautyDemoHeaderProps = {
  readonly onReset: () => void;
};

export default function BeautyDemoHeader({ onReset }: BeautyDemoHeaderProps) {
  return (
    <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-beauty-veil px-4 text-white">
      <p className="shrink-0 text-[12px] font-extrabold tracking-[0.1em]">STS BEAUTY</p>
      <nav aria-label="Demo navigation" className="flex min-w-0 items-center gap-1 text-[11px] font-semibold">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-full px-2 text-white/65 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Fashion Demo
        </Link>
        <Link
          href="/beauty-demo"
          aria-current="page"
          className="flex min-h-11 items-center rounded-full bg-white/10 px-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Beauty Demo
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-full px-2 text-beauty-soft transition-[transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
          aria-label="Beauty demo reset"
        >
          Reset
        </button>
      </nav>
    </header>
  );
}
