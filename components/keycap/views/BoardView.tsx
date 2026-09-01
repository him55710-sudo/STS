"use client";

import Link from "next/link";
import { PressableKeycap } from "@/components/keycap/PressableKeycap";
import { useKeycapStore } from "@/lib/keycap-store";
import { FIRST_RUN_PRESS_TARGET } from "@/lib/keycap-state";
import type { BoardSlot, KeycapDefinition, KeycapId } from "@/lib/keycap-types";
import { KEYCAPS } from "@/lib/keycaps";

const HERO_KEYCAP = KEYCAPS[0];

export function BoardView() {
  const {
    board,
    clearUnlocks,
    hasHydrated,
    introSeen,
    lastUnlockedKeycapIds,
    loadStudioKeycap,
    ownedKeycapIds,
    pressKeycap,
    rewardLedger,
    rewardProgress,
    selectBoardSlot,
    selectedBoardSlotId,
    soundEnabled,
    totalPresses,
  } = useKeycapStore();

  if (!hasHydrated) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading keycap board"
        className="min-h-dvh bg-[#F3F0EA]"
      />
    );
  }

  if (!introSeen) {
    const completedPresses = Math.min(totalPresses, FIRST_RUN_PRESS_TARGET);
    const remainingPresses = FIRST_RUN_PRESS_TARGET - completedPresses;
    const remainingLabel = remainingPresses === 1 ? "press remains" : "presses remain";

    return (
      <section
        aria-labelledby="board-intro-title"
        className="grid min-h-dvh place-items-center bg-[#F3F0EA] px-6 py-12 text-[#171714]"
      >
        <div className="flex flex-col items-center gap-8 text-center">
          <h1
            id="board-intro-title"
            aria-live="polite"
            className="text-[clamp(2.125rem,12vw,3.5rem)] font-extrabold tracking-[-0.06em]"
          >
            {completedPresses === 0 ? "Press it." : "Again."}
          </h1>
          <PressableKeycap
            keycap={HERO_KEYCAP}
            scale="hero"
            soundEnabled={soundEnabled}
            accessibleLabel={`Press ${HERO_KEYCAP.name}. ${remainingPresses} ${remainingLabel} before the board appears`}
            onPress={pressKeycap}
          />
          <div
            role="progressbar"
            aria-label="First-run tactile introduction"
            aria-valuemin={0}
            aria-valuemax={FIRST_RUN_PRESS_TARGET}
            aria-valuenow={completedPresses}
            className="flex gap-2"
          >
            {Array.from({ length: FIRST_RUN_PRESS_TARGET }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1 w-5 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                  index < completedPresses ? "bg-tactile-ink" : "bg-tactile-line"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const selectedSlot = board.find((slot) => slot.id === selectedBoardSlotId);
  const selectedKeycap = getKeycap(selectedSlot?.keycapId ?? HERO_KEYCAP.id);
  const nextUnlock = getNextUnlock(ownedKeycapIds);
  const rewardPercent = Math.round(rewardProgress * 100);
  const unlockedNames = KEYCAPS
    .filter((keycap) => lastUnlockedKeycapIds.includes(keycap.id))
    .map((keycap) => keycap.name);

  const playSlot = (slotId: BoardSlot["id"], keycapId: KeycapId) => {
    selectBoardSlot(slotId);
    pressKeycap(keycapId);
  };

  return (
    <section className="tactile-board-reveal min-h-dvh bg-[#F3F0EA] px-4 pb-28 pt-5 text-[#171714] sm:px-6 sm:pt-8 md:pb-12">
      <div className="mx-auto w-full max-w-[860px]">
        <header className="mb-4 flex items-end justify-between gap-4 px-1">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6D6A63]">
            Playable specimen table
          </h2>
          <p className="text-right text-[11px] leading-4 text-[#6D6A63]">
            12 independent switches
          </p>
        </header>

        <div className="rounded-[20px] border border-black/10 bg-[#FBFAF7] px-3 py-5 shadow-[0_20px_60px_rgba(72,61,48,0.08)] sm:rounded-[24px] sm:px-6 sm:py-7">
          <div className="grid grid-cols-3 gap-x-2 gap-y-4 md:grid-cols-4 md:gap-5">
            {board.map((slot) => {
              const keycap = getKeycap(slot.keycapId);
              const selected = slot.id === selectedBoardSlotId;

              return (
                <div
                  key={slot.id}
                  className={`flex min-w-0 flex-col items-center gap-2 ${
                    keycap.size === "2U" ? "col-span-2" : ""
                  }`}
                >
                  <PressableKeycap
                    keycap={keycap}
                    appearance={slot.appearance}
                    scale="board"
                    soundEnabled={soundEnabled}
                    selected={selected}
                    accessibleLabel={`${slot.label}: ${keycap.name}. Press to play and select this slot`}
                    onPress={(keycapId) => playSlot(slot.id, keycapId)}
                  />
                  <span
                    aria-hidden="true"
                    className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      selected ? "text-[#171714]" : "text-[#6D6A63]"
                    }`}
                  >
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {unlockedNames.length > 0 && (
          <div className="flex items-center justify-between gap-4 border-b border-tactile-unlock py-4 text-tactile-unlock">
            <p aria-live="polite" className="text-sm font-semibold">
              Unlocked {unlockedNames.join(" + ")}
            </p>
            <button
              type="button"
              onClick={clearUnlocks}
              className="min-h-11 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] outline-none focus-visible:ring-2 focus-visible:ring-tactile-unlock"
            >
              Dismiss
            </button>
          </div>
        )}

        <dl className="mt-7 grid grid-cols-2 border-y border-black/10">
          <Metric label="Owned" value={`${ownedKeycapIds.length} / ${KEYCAPS.length}`} />
          <Metric label="Local reward" value={`${rewardPercent}%`} />
        </dl>

        <div className="border-b border-black/10 py-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6D6A63]">
                Next unlock
              </p>
              <p className="mt-1 text-base font-semibold">
                {nextUnlock?.name ?? "Collection complete"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-[#6D6A63]">
                {nextUnlock?.unlockCondition ?? "Every catalog specimen is owned."}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6D6A63]">
                Local only
              </p>
              <p className="mt-1 text-sm font-semibold">
                {rewardLedger.eligiblePresses.toLocaleString("en-US")} eligible
              </p>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="Local physical reward progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rewardPercent}
            className="mt-4 h-1.5 overflow-hidden bg-black/10"
          >
            <div
              className="h-full bg-[#6E655E] transition-transform duration-200 motion-reduce:transition-none"
              style={{ transform: `translateX(-${100 - rewardPercent}%)` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6D6A63]">
              Selected slot
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {selectedSlot?.label ?? "Slot 1"} · {selectedKeycap.name}
            </p>
          </div>
          <Link
            href="/studio"
            onClick={() => loadStudioKeycap(selectedKeycap.id, selectedSlot?.appearance)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-[10px] bg-[#171714] px-4 text-sm font-semibold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#CA715B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F0EA] motion-reduce:transition-none"
            aria-label={`Open ${selectedSlot?.label ?? "selected slot"} in Studio`}
          >
            Open Studio
          </Link>
        </div>
      </div>
    </section>
  );
}

function getKeycap(keycapId: KeycapId): KeycapDefinition {
  return KEYCAPS.find((keycap) => keycap.id === keycapId) ?? HERO_KEYCAP;
}

function getNextUnlock(ownedKeycapIds: readonly KeycapId[]): KeycapDefinition | undefined {
  return KEYCAPS.reduce<KeycapDefinition | undefined>((candidate, keycap) => {
    if (ownedKeycapIds.includes(keycap.id)) return candidate;
    if (candidate === undefined || keycap.unlockPresses < candidate.unlockPresses) return keycap;
    return candidate;
  }, undefined);
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-r border-black/10 px-3 py-4 last:border-r-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6D6A63]">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-bold tabular-nums tracking-[-0.03em]">{value}</dd>
    </div>
  );
}
