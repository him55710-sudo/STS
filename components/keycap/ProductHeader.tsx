"use client";

import type { ProductTab } from "./ProductNav";

export type ProductHeaderProps = {
  readonly active: ProductTab;
  readonly totalPresses: number;
  readonly totalXp: number;
  readonly soundEnabled: boolean;
  readonly onToggleSound: () => void;
};

type HeaderContent = {
  readonly title: string;
  readonly copy: string;
};

const HEADER_CONTENT = {
  board: {
    title: "Board",
    copy: "A playable table of collected switches.",
  },
  collection: {
    title: "Collection",
    copy: "Owned, discovered, and waiting specimens.",
  },
  studio: {
    title: "Studio",
    copy: "Tune material, profile, legend, and sound.",
  },
  rewards: {
    title: "Rewards",
    copy: "Progress toward the next physical release.",
  },
} as const satisfies Readonly<Record<ProductTab, HeaderContent>>;

const COUNT_FORMATTER = new Intl.NumberFormat("en-US");

export function ProductHeader({
  active,
  totalPresses,
  totalXp,
  soundEnabled,
  onToggleSound,
}: ProductHeaderProps) {
  const content = HEADER_CONTENT[active];

  return (
    <header className="border-b border-[rgba(23,23,20,0.10)] bg-[#F3F0EA] text-[#171714]">
      <div className="mx-auto grid max-w-[1120px] gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.28em]">TACTILE</p>
            <span aria-hidden="true" className="h-3 w-px bg-[rgba(23,23,20,0.18)]" />
            <h1 className="truncate text-[18px] font-bold tracking-[-0.03em]">{content.title}</h1>
          </div>
          <p className="mt-1 truncate text-[12px] font-medium text-[#6D6A63]">{content.copy}</p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <dl className="flex items-center gap-4 tabular-nums">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6D6A63]">Presses</dt>
              <dd className="mt-0.5 text-[13px] font-bold">{COUNT_FORMATTER.format(totalPresses)}</dd>
            </div>
            <div className="border-l border-[rgba(23,23,20,0.10)] pl-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6D6A63]">XP</dt>
              <dd className="mt-0.5 text-[13px] font-bold">{COUNT_FORMATTER.format(totalXp)}</dd>
            </div>
          </dl>

          <button
            type="button"
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? "Turn keycap sound off" : "Turn keycap sound on"}
            title={soundEnabled ? "Sound on" : "Sound off"}
            onClick={onToggleSound}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-[rgba(23,23,20,0.10)] bg-[#FBFAF7] px-3 text-[#171714] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171714]"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 5 7.75 8H5v4h2.75L11 15V5Z" />
              {soundEnabled ? (
                <>
                  <path d="M14 8.25c.75.9.75 2.6 0 3.5" />
                  <path d="M16.25 6.5c1.8 2.1 1.8 4.9 0 7" />
                </>
              ) : (
                <path d="m14 8 4 4m0-4-4 4" />
              )}
            </svg>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.1em] sm:inline">
              {soundEnabled ? "Sound on" : "Sound off"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
