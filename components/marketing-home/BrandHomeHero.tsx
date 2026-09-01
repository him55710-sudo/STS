"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRightIcon, BookmarkIcon, HeartIcon, SearchIcon } from "@/components/Icons";
import { HERO_STATS, PHONE_SLIDES, type PhoneSlide } from "./BrandHomeData";

function DevicePreview({ slide }: { readonly slide: PhoneSlide }) {
  return (
    <div className="brand-device-drift relative w-[204px] rotate-[-1deg] rounded-brand-device border-[3px] border-white/75 bg-brand-night p-1.5 brand-device-shadow sm:w-[250px] lg:w-[286px]">
      <div className="relative aspect-[9/18] overflow-hidden rounded-brand-device-inner bg-ink">
        <Image src={slide.image} alt={`${slide.creator}의 ${slide.title} 콘텐츠`} fill sizes="(min-width: 1024px) 286px, 204px" className="object-cover object-center transition-opacity duration-500" priority />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-white">
          <span className="text-[9px] font-semibold tracking-[0.14em]">STS</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/70 text-[9px]">•••</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent px-4 pb-4 pt-20 text-white">
          <p className="text-[9px] font-semibold tracking-[0.08em] text-white/70">{slide.creator}</p>
          <p className="mt-1 text-[14px] font-bold leading-[1.2]">{slide.title}</p>
          <Link href="/discover" className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-bold text-brand-coral" aria-label={`${slide.product} 상품 확인`}>
            {slide.product} <ArrowUpRightIcon size={12} strokeWidth={1.9} />
          </Link>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/85">
          <SearchIcon size={14} strokeWidth={1.7} />
          <HeartIcon size={14} strokeWidth={1.7} />
          <BookmarkIcon size={14} strokeWidth={1.7} />
          <span className="h-3.5 w-3.5 rounded-full border border-white/75" />
        </div>
      </div>
      <span className="pointer-events-none absolute left-[-5px] top-28 h-10 w-0.5 rounded-full bg-white/65" />
      <span className="pointer-events-none absolute right-[-5px] top-32 h-12 w-0.5 rounded-full bg-white/65" />
    </div>
  );
}

export function BrandHomeHero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = PHONE_SLIDES[activeSlide] ?? PHONE_SLIDES[0];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % PHONE_SLIDES.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="top" className="relative isolate flex min-h-[930px] items-start overflow-hidden bg-brand-night text-white sm:min-h-[1040px] lg:min-h-[1150px]">
      <div aria-hidden="true" className="brand-hero-glow absolute inset-0" />
      <div aria-hidden="true" className="brand-dot-grid absolute inset-x-[14%] top-24 h-[580px] sm:inset-x-[22%] lg:top-32" />
      <div className="relative mx-auto flex w-full max-w-[1180px] flex-col items-center px-5 pb-16 pt-32 text-center sm:px-8 sm:pt-40 lg:pt-60">
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55 sm:block">Visual commerce for people with taste</p>
        <h1 className="mt-7 max-w-[850px] text-[clamp(3rem,6.4vw,6.6rem)] font-extrabold leading-[0.98] tracking-[-0.03em] text-white sm:tracking-[-0.06em] lg:tracking-[-0.09em]">
          <span className="hidden sm:inline">좋아하는 사람의 취향이<br /><span className="text-brand-coral">나의 쇼핑이 되는 곳</span></span>
          <span className="sm:hidden">좋아하는 사람의<br />취향이 나의<br /><span className="text-brand-coral">쇼핑이 되는 곳</span></span>
        </h1>
        <div className="mt-12 flex flex-col items-center sm:mt-14">
          <DevicePreview slide={slide} />
          <div className="mt-4 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45" aria-live="polite">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-coral" /> {String(activeSlide + 1).padStart(2, "0")} / {String(PHONE_SLIDES.length).padStart(2, "0")} · tap to shop
          </div>
        </div>
        <p className="mt-8 max-w-[430px] text-[13px] leading-[1.7] text-white/60 sm:mt-10 sm:text-[14px]">
          사진 속 상품을 발견하고, 좋아하는 크리에이터의 선택을 따라가고, 한 번의 탭으로 구매까지 이어보세요.
        </p>
        <div className="mt-14 grid w-full max-w-[720px] grid-cols-3 border-y border-white/15">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="px-3 py-5 sm:py-6">
              <p className="text-[clamp(1.65rem,3.5vw,2.5rem)] font-extrabold tracking-[-0.06em] text-white">{stat.value}</p>
              <p className="mt-1 text-[10px] tracking-[0.08em] text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
        <a href="#stream" className="mt-12 inline-flex flex-col items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-coral focus-visible:outline-offset-4">
          <span>scroll</span>
          <ArrowUpRightIcon size={18} strokeWidth={1.5} className="rotate-90" />
        </a>
      </div>
    </section>
  );
}
