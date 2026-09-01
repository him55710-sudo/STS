"use client";

import { useState } from "react";
import { ArrowUpRightIcon } from "@/components/Icons";
import { BRAND_NAMES, MATCH_STREAM, VOICES } from "./BrandHomeData";

export function BrandHomeStream() {
  const streamItems = [...MATCH_STREAM, ...MATCH_STREAM];

  return (
    <section id="stream" aria-label="최근 STS 발견 스트림" className="overflow-hidden border-b border-brand-line bg-white">
      <div className="flex min-h-16 items-center gap-5 whitespace-nowrap px-5 text-[11px] sm:px-10">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-brand-pill border border-brand-line px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-brand-wine"><span className="h-1.5 w-1.5 rounded-full bg-brand-coral" /> LIVE DISCOVERY</span>
        <div className="relative flex min-w-0 overflow-hidden">
          <div className="brand-ticker-track flex min-w-max items-center gap-9 pr-9">
            {streamItems.map((item, index) => <span key={`${item.creator}-${item.object}-${index}`} className="inline-flex items-center gap-3 text-ink-2"><span>{item.creator}</span><span className="text-brand-line">×</span><span className="font-semibold text-ink">{item.object}</span><span className="text-brand-wine">{item.action}</span><span className="text-brand-line">•</span></span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrandHomeProof() {
  const [activeVoice, setActiveVoice] = useState(0);
  const voice = VOICES[activeVoice] ?? VOICES[0];

  return (
    <section id="proof" className="border-t border-brand-line bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-16 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24 lg:px-16">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-wine">Voices</p>
          <h2 className="mt-6 text-[clamp(2.6rem,5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.09em]">실제로 이렇게<br />쓰고 있어요.</h2>
          <p className="mt-7 max-w-[360px] text-[15px] leading-[1.75] text-ink-2">발견하는 사람, 만드는 사람, 연결하는 사람이 같은 경험을 말합니다.</p>
          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="STS 사용자 후기 선택">
            {VOICES.map((item, index) => <button key={item.name} type="button" role="tab" aria-selected={activeVoice === index} aria-controls="active-voice" onClick={() => setActiveVoice(index)} className={`border px-3 py-2 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4 ${activeVoice === index ? "border-brand-wine bg-brand-wine text-white" : "border-brand-line text-ink-2 hover:border-brand-wine hover:text-brand-wine"}`}>{item.role}</button>)}
          </div>
        </div>
        <div id="active-voice" role="tabpanel" aria-live="polite" className="relative flex min-h-[360px] flex-col justify-between rounded-brand-card bg-brand-night p-7 text-white sm:min-h-[420px] sm:p-10">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45"><span>STS / testimonial</span><span>{String(activeVoice + 1).padStart(2, "0")} / {String(VOICES.length).padStart(2, "0")}</span></div>
          <div className="mt-12"><span className="font-serif text-[62px] leading-none text-brand-coral">“</span><blockquote className="mt-1 max-w-[630px] text-[clamp(1.65rem,3vw,2.6rem)] font-semibold leading-[1.18] tracking-[-0.07em]">{voice.quote}</blockquote></div>
          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[14px] font-bold">{voice.name}</p><p className="mt-1 text-[11px] text-white/55">{voice.role}</p></div><span className="inline-flex items-center gap-2 text-[10px] font-semibold text-brand-coral">{voice.tag} <ArrowUpRightIcon size={14} /></span></div>
        </div>
      </div>
      <div className="border-t border-brand-line">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-10 sm:py-20 lg:px-16"><div className="flex items-end justify-between gap-6"><div><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-wine">Partners</p><h2 className="mt-5 text-[clamp(2.1rem,4vw,4rem)] font-extrabold leading-[1] tracking-[-0.08em]">좋은 상품이<br />함께합니다.</h2></div><p className="hidden max-w-[260px] text-right text-[12px] leading-[1.7] text-ink-2 sm:block">사진과 취향의 맥락 안에서 발견되는 상품을 만들고 있습니다.</p></div><div className="mt-12 grid grid-cols-2 divide-x divide-y divide-brand-line border border-brand-line sm:grid-cols-5">{BRAND_NAMES.map((name) => <span key={name} className="flex min-h-20 items-center justify-center px-3 text-center font-serif text-[14px] font-bold tracking-[-0.04em] text-ink/70 transition-colors hover:bg-brand-blush hover:text-brand-wine">{name}</span>)}</div></div>
      </div>
    </section>
  );
}
