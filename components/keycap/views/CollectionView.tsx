"use client";

import Link from "next/link";
import { PressableKeycap } from "@/components/keycap/PressableKeycap";
import { useKeycapStore } from "@/lib/keycap-store";
import { KEYCAPS } from "@/lib/keycaps";

const PRESSES_PER_LEVEL = 25;

export function CollectionView() {
  const {
    hasHydrated,
    keycapPresses,
    loadStudioKeycap,
    ownedKeycapIds,
    selectedKeycapId,
    soundEnabled,
    unlockedKeycapIds,
  } = useKeycapStore();

  if (!hasHydrated) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading keycap collection"
        className="min-h-dvh bg-tactile-canvas"
      />
    );
  }

  return (
    <section
      aria-labelledby="collection-title"
      className="min-h-dvh bg-tactile-canvas px-4 pb-12 pt-6 text-tactile-ink sm:px-6 sm:pt-10"
    >
      <div className="mx-auto w-full max-w-[960px]">
        <header className="grid gap-4 border-b border-tactile-line pb-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-tactile-muted">
              Canonical specimens
            </p>
            <h1
              id="collection-title"
              className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl"
            >
              Collection
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-tactile-muted">
              Press an owned object to select it. Locked and unowned specimens remain reference-only.
            </p>
          </div>
          <p className="text-sm tabular-nums text-tactile-muted">
            <strong className="text-tactile-ink">{ownedKeycapIds.length}</strong>
            {` of ${KEYCAPS.length} owned`}
          </p>
        </header>

        <ol className="grid border-t border-tactile-line sm:grid-cols-2">
          {KEYCAPS.map((keycap, index) => {
            const owned = ownedKeycapIds.includes(keycap.id);
            const unlocked = unlockedKeycapIds.includes(keycap.id);
            const selected = owned && selectedKeycapId === keycap.id;
            const stateLabel = owned ? "Owned" : unlocked ? "Unlocked" : "Locked";
            const pressCount = keycapPresses[keycap.id] ?? 0;
            const level = Math.floor(pressCount / PRESSES_PER_LEVEL) + 1;

            return (
              <li
                key={keycap.id}
                className={`border-b border-tactile-line py-6 sm:px-6 ${
                  index % 2 === 0 ? "sm:border-r" : ""
                } ${owned ? "" : "text-tactile-muted"}`}
              >
                <article className="grid grid-cols-[112px_minmax(0,1fr)] gap-4">
                  <div className="flex min-w-0 items-start justify-center pt-1">
                    <PressableKeycap
                      keycap={keycap}
                      scale="card"
                      soundEnabled={soundEnabled}
                      disabled={!owned}
                      selected={selected}
                      accessibleLabel={
                        owned
                          ? `Select ${keycap.name}`
                          : `${keycap.name}, ${stateLabel.toLowerCase()}. ${keycap.unlockCondition}`
                      }
                      onPress={loadStudioKeycap}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                      <span className={owned ? "text-tactile-success" : "text-tactile-muted"}>
                        {stateLabel}
                      </span>
                      <span aria-hidden="true" className="text-tactile-line">/</span>
                      <span className="capitalize text-tactile-violet">{keycap.rarity}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-bold tracking-[-0.025em] text-tactile-ink">
                      {keycap.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-tactile-muted">{keycap.collection}</p>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-tactile-line py-3 text-xs">
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.12em] text-tactile-muted">Material</dt>
                        <dd className="mt-1 font-semibold text-tactile-ink">{keycap.material}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.12em] text-tactile-muted">Sound</dt>
                        <dd className="mt-1 font-semibold capitalize text-tactile-ink">{keycap.sound}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.12em] text-tactile-muted">Presses</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-tactile-ink">
                          {pressCount.toLocaleString("en-US")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.12em] text-tactile-muted">Level</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-tactile-ink">Level {level}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.12em] text-tactile-muted">Profile</dt>
                        <dd className="mt-1 font-semibold text-tactile-ink">{keycap.profile}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.12em] text-tactile-muted">Size</dt>
                        <dd className="mt-1 font-semibold text-tactile-ink">{keycap.size}</dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-xs leading-5 text-tactile-muted">
                      <span className="font-semibold text-tactile-ink">Unlock:</span>{" "}
                      {keycap.unlockCondition}
                    </p>
                    {owned && (
                      <Link
                        href="/studio"
                        onClick={() => loadStudioKeycap(keycap.id)}
                        className="mt-4 inline-flex min-h-11 items-center border-b border-tactile-ink text-xs font-semibold text-tactile-ink outline-none transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-tactile-unlock focus-visible:ring-offset-4 focus-visible:ring-offset-tactile-canvas motion-reduce:transition-none"
                        aria-label={`Open ${keycap.name} in Studio`}
                      >
                        Open in Studio
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
