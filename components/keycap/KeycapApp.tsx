"use client";

import type { ComponentType } from "react";
import { ProductHeader } from "@/components/keycap/ProductHeader";
import { ProductNav, type ProductTab } from "@/components/keycap/ProductNav";
import { BoardView } from "@/components/keycap/views/BoardView";
import { CollectionView } from "@/components/keycap/views/CollectionView";
import { RewardsView } from "@/components/keycap/views/RewardsView";
import { StudioView } from "@/components/keycap/views/StudioView";
import { useKeycapStore } from "@/lib/keycap-store";

type KeycapAppProps = {
  readonly initialTab?: ProductTab;
};

const VIEW_BY_TAB = {
  board: BoardView,
  collection: CollectionView,
  rewards: RewardsView,
  studio: StudioView,
} as const satisfies Readonly<Record<ProductTab, ComponentType>>;

export default function KeycapApp({ initialTab = "board" }: KeycapAppProps) {
  const hasHydrated = useKeycapStore((state) => state.hasHydrated);
  const introSeen = useKeycapStore((state) => state.introSeen);
  const soundEnabled = useKeycapStore((state) => state.soundEnabled);
  const toggleSound = useKeycapStore((state) => state.toggleSound);
  const totalPresses = useKeycapStore((state) => state.totalPresses);
  const totalXp = useKeycapStore((state) => state.totalXp);
  const ActiveView = VIEW_BY_TAB[initialTab];
  const firstRunBoard = initialTab === "board" && (!hasHydrated || !introSeen);

  return (
    <div className="min-h-dvh bg-tactile-canvas text-tactile-ink">
      {!firstRunBoard && (
        <>
          <ProductHeader
            active={initialTab}
            totalPresses={totalPresses}
            totalXp={totalXp}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
          />
          <ProductNav active={initialTab} />
        </>
      )}

      <main className={firstRunBoard ? undefined : "pb-20 md:pb-0"}>
        <ActiveView />
      </main>
    </div>
  );
}
