"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRightIcon } from "@/components/Icons";
import { BrandHomeChapters } from "./BrandHomeChapters";
import { BrandHomeHeader } from "./BrandHomeHeader";
import { BrandHomeHero } from "./BrandHomeHero";
import { PARTNERSHIP_EMAIL } from "./BrandHomeData";
import { BrandHomeProof, BrandHomeStream } from "./BrandHomeProof";

type InquiryState = {
  readonly name: string;
  readonly email: string;
  readonly message: string;
};

const INITIAL_INQUIRY: InquiryState = { name: "", email: "", message: "" };

function InquiryForm() {
  const [inquiry, setInquiry] = useState(INITIAL_INQUIRY);
  const [sent, setSent] = useState(false);

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`[STS 파트너 문의] ${inquiry.name}`);
    const body = encodeURIComponent(`담당자: ${inquiry.name}\n이메일: ${inquiry.email}\n\n${inquiry.message}`);
    setSent(true);
    window.location.href = `mailto:${PARTNERSHIP_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <form id="inquiry-form" onSubmit={submitInquiry} className="grid gap-5">
      <label className="grid gap-2 text-[11px] font-semibold text-white/60">담당자 이름<input required value={inquiry.name} onChange={(event) => setInquiry((current) => ({ ...current, name: event.target.value }))} placeholder="이름을 입력해 주세요" className="border-b border-white/20 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-coral" /></label>
      <label className="grid gap-2 text-[11px] font-semibold text-white/60">업무 이메일<input required type="email" value={inquiry.email} onChange={(event) => setInquiry((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" className="border-b border-white/20 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-coral" /></label>
      <label className="grid gap-2 text-[11px] font-semibold text-white/60">문의 내용<textarea required rows={3} value={inquiry.message} onChange={(event) => setInquiry((current) => ({ ...current, message: event.target.value }))} placeholder="브랜드, 캠페인, 상품 연결에 대해 알려 주세요" className="resize-none border-b border-white/20 bg-transparent px-0 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-coral" /></label>
      <button type="submit" className="mt-3 inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-white px-5 text-[12px] font-bold text-brand-wine transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4">{sent ? "메일 앱을 확인해 주세요" : "문의 메일 작성하기"}<ArrowUpRightIcon size={15} strokeWidth={1.8} /></button>
    </form>
  );
}

function BrandHomeInquiry() {
  return (
    <section id="inquiry" className="border-t border-brand-line bg-brand-blush">
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
        <div className="relative overflow-hidden rounded-brand-cta bg-brand-wine px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div aria-hidden="true" className="brand-dot-grid absolute inset-x-[15%] inset-y-0 opacity-20" />
          <div className="relative"><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">Start with STS</p><h2 className="mx-auto mt-6 max-w-[760px] text-[clamp(2.45rem,5vw,5.2rem)] font-extrabold leading-[0.98] tracking-[-0.09em]">취향이 매출이 되는 연결,<br /><span className="text-brand-coral">STS에서 시작하세요.</span></h2><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/discover" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3.5 text-[12px] font-bold text-brand-wine transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4">쇼핑 시작하기 <ArrowUpRightIcon size={15} /></Link><Link href="/login?next=%2Fcreator" className="inline-flex items-center gap-2 rounded-full border border-white/45 px-5 py-3.5 text-[12px] font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-4">크리에이터 시작 <ArrowUpRightIcon size={15} /></Link></div></div>
        </div>
        <div className="mt-20 grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24"><div><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-wine">For brands & partners</p><h2 className="mt-6 text-[clamp(2.4rem,4.8vw,4.8rem)] font-extrabold leading-[0.98] tracking-[-0.09em]">좋은 상품을<br />좋은 취향 옆에.</h2><p className="mt-7 max-w-[360px] text-[15px] leading-[1.75] text-ink-2">브랜드와 에이전시를 위한 상품 연결, 크리에이터 협업, 성과 추적을 함께 설계합니다.</p></div><div className="rounded-brand-panel bg-brand-night p-6 text-white sm:p-8"><p className="mb-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-coral">Partnership inquiry</p><InquiryForm /></div></div>
      </div>
    </section>
  );
}

function BrandHomeFooter() {
  return (
    <footer id="about" className="bg-brand-night text-white"><div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-10 sm:py-20 lg:px-16"><div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between"><div><Link href="#top" className="text-[31px] font-black tracking-[-0.13em]">STS</Link><p className="mt-4 max-w-[250px] text-[13px] leading-[1.7] text-white/45">사진 속 발견을, 더 자연스러운 구매와 수익으로 연결합니다.</p></div><div className="grid grid-cols-2 gap-x-12 gap-y-4 text-[12px] text-white/65"><Link href="/discover" className="transition-colors hover:text-white">쇼핑하기</Link><Link href="/creator" className="transition-colors hover:text-white">크리에이터</Link><Link href="#inquiry" className="transition-colors hover:text-white">파트너 문의</Link><Link href="/privacy" className="transition-colors hover:text-white">개인정보처리방침</Link><Link href="/terms" className="transition-colors hover:text-white">이용약관</Link></div></div><div className="mt-16 flex flex-col gap-3 border-t border-white/15 pt-5 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 STS. See it. Tap it. Shop it.</span><span>Built for people with taste.</span></div></div></footer>
  );
}

export function BrandHome() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="brand-home min-h-dvh overflow-x-hidden text-ink">
      <BrandHomeHeader />
      <main><BrandHomeHero /><BrandHomeStream /><BrandHomeChapters /><BrandHomeProof /><BrandHomeInquiry /></main>
      <BrandHomeFooter />
      <div data-brand-floating-actions className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:bottom-7 sm:right-7"><a href="#top" aria-label="맨 위로 이동" className={`flex h-10 w-10 items-center justify-center rounded-brand-pill border border-brand-line bg-white text-brand-wine shadow-brand-nav transition-[opacity,transform] duration-300 ${scrolled ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}><ArrowUpRightIcon size={17} strokeWidth={1.6} className="-rotate-45" /></a><a href="#inquiry-form" className="inline-flex items-center gap-2 rounded-brand-pill bg-brand-wine px-4 py-3 text-[11px] font-bold text-white shadow-brand-float transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4"><span className="h-1.5 w-1.5 rounded-full bg-brand-coral" />상담 문의</a></div>
    </div>
  );
}
