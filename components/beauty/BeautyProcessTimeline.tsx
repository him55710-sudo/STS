"use client";

import { BEAUTY_REGIONS } from "@/lib/beauty/types";
import type { BeautyApplicationStep, BeautyRegion } from "@/lib/beauty/types";

const REGION_LABELS = {
  skin: "SKIN",
  base: "BASE",
  eye: "EYE",
  cheek: "CHEEK",
  lip: "LIP",
} as const satisfies Readonly<Record<BeautyRegion, string>>;

export type BeautyProcessTimelineProps = {
  readonly steps: readonly BeautyApplicationStep[];
  readonly selectedRegion: BeautyRegion | null;
  readonly selectedStepId: string | null;
  readonly onSelectStep: (step: BeautyApplicationStep) => void;
};

function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null) return "시간 확인 필요";
  const minutes = Math.floor(timestamp / 60);
  const seconds = Math.floor(timestamp % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function BeautyProcessTimeline({
  steps,
  selectedRegion,
  selectedStepId,
  onSelectStep,
}: BeautyProcessTimelineProps) {
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? null;
  const activeRegion = selectedRegion ?? selectedStep?.region ?? null;
  const regionSteps = activeRegion === null
    ? []
    : steps.filter((step) => step.region === activeRegion);

  return (
    <section
      className="beauty-sheet-enter absolute inset-x-0 bottom-0 z-40 rounded-t-(--radius-sheet) border-t border-line bg-surface px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 text-ink shadow-beauty-sheet"
      aria-label="메이크업 과정 타임라인"
    >
      <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" aria-hidden="true" />
      <div className="flex items-end justify-between gap-1" role="group" aria-label="얼굴 영역">
        {BEAUTY_REGIONS.map((region) => {
          const firstStep = steps.find((step) => step.region === region) ?? null;
          const selected = activeRegion === region;
          return (
            <button
              key={region}
              type="button"
              aria-pressed={selected}
              aria-label={`${REGION_LABELS[region]} 과정 선택`}
              disabled={firstStep === null}
              onClick={() => {
                if (firstStep !== null) onSelectStep(firstStep);
              }}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-(--radius-prod) px-1 py-1 text-[10px] font-semibold transition-[color,background-color,transform] duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-2 focus-visible:outline-beauty disabled:opacity-40 motion-reduce:transition-none ${
                selected ? "bg-beauty-soft text-beauty-ink" : "text-ink-2"
              }`}
            >
              <span>{REGION_LABELS[region]}</span>
              <span
                className={`h-2 w-2 rounded-full border ${
                  selected ? "border-beauty bg-beauty" : "border-line bg-surface-2"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div id="beauty-region-steps" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {activeRegion === null ? (
          <p className="flex min-h-14 w-full items-center justify-center rounded-(--radius-card) border border-line bg-surface-2 px-3 text-center text-[12px] font-semibold text-ink-2">
            궁금한 부위를 선택하세요
          </p>
        ) : regionSteps.map((step) => {
          const selected = step.id === selectedStepId;
          return (
            <button
              key={step.id}
              type="button"
              aria-pressed={selected}
              aria-label={`${REGION_LABELS[step.region]} ${step.label} 선택`}
              onClick={() => onSelectStep(step)}
              className={`min-h-14 min-w-[148px] rounded-(--radius-card) border px-3 py-2.5 text-left transition-[color,background-color,border-color,transform] duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-2 focus-visible:outline-beauty motion-reduce:transition-none ${
                selected
                  ? "border-beauty bg-beauty-soft text-ink"
                  : "border-line bg-surface text-ink-2"
              }`}
            >
              <span className="block text-[10px] font-semibold tracking-[0.08em]">
                STEP {step.order ?? "—"} · {formatTimestamp(step.startTime)}
              </span>
              <span className="mt-1 block line-clamp-2 text-[12px] font-semibold leading-snug">
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
