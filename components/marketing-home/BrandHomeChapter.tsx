import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@/components/Icons";
import type { BrandChapterData } from "./BrandHomeData";

type BrandHomeChapterProps = {
  readonly chapter: BrandChapterData;
  readonly children: ReactNode;
};

export function BrandHomeChapter({ chapter, children }: BrandHomeChapterProps) {
  const sectionTone = chapter.tone === "warm" ? "bg-brand-blush" : "bg-white";
  const copyOrder = chapter.flipped ? "lg:order-2" : "lg:order-1";
  const visualOrder = chapter.flipped ? "lg:order-1" : "lg:order-2";

  return (
    <section id={chapter.id} className={`relative isolate overflow-hidden border-t border-brand-line ${sectionTone}`}>
      <span aria-hidden="true" className="brand-chapter-number pointer-events-none absolute -right-2 top-16 text-[clamp(12rem,27vw,27rem)] font-black leading-[0.7] text-brand-wine/[0.045] sm:top-20 lg:right-6">
        {chapter.number}
      </span>
      <div className="relative mx-auto grid min-h-[620px] max-w-[1280px] items-center gap-12 px-5 py-24 sm:px-10 sm:py-28 lg:grid-cols-2 lg:gap-20 lg:px-16 lg:py-32">
        <div className={`relative z-10 max-w-[550px] ${copyOrder}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-wine">{chapter.eyebrow}</p>
          <h2 className="mt-6 whitespace-pre-line text-[clamp(2.45rem,5vw,5.15rem)] font-extrabold leading-[0.98] tracking-[-0.09em] text-ink">{chapter.title}</h2>
          <p className="mt-7 max-w-[500px] text-[15px] leading-[1.78] text-ink-2 sm:text-[17px]">{chapter.body}</p>
          <ol className="mt-8 flex max-w-[480px] flex-wrap gap-2">
            {chapter.steps.map((step, index) => (
              <li key={step} className="inline-flex items-center gap-2 rounded-brand-pill border border-brand-line bg-white/75 px-3 py-2 text-[11px] font-semibold text-ink-2">
                <span className="font-mono text-[10px] text-brand-wine">({index + 1})</span>{step}
              </li>
            ))}
          </ol>
        </div>
        <div className={`relative z-10 w-full ${visualOrder}`}>{children}</div>
      </div>
      <a href="#top" aria-label={`${chapter.eyebrow}에서 위로 이동`} className="absolute bottom-7 right-7 flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white/80 text-brand-wine transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-wine focus-visible:outline-offset-4 sm:right-10">
        <ArrowUpRightIcon size={17} strokeWidth={1.6} className="-rotate-45" />
      </a>
    </section>
  );
}
