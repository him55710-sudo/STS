"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  applyKeycapPress,
  createInitialKeycapProgress,
  type KeycapProgressState,
} from "./keycap-state";
import type {
  BoardSlot,
  KeycapAppearance,
  KeycapDefinition,
  KeycapId,
  KeycapStudioPatch,
  KeycapStudioState,
} from "./keycap-types";
import { KEYCAPS } from "./keycaps";
import { parsePersistedKeycapState } from "./keycap-persistence";

type KeycapStoreState = KeycapProgressState & {
  readonly board: readonly BoardSlot[];
  readonly hasHydrated: boolean;
  readonly lastUnlockedKeycapIds: readonly KeycapId[];
  readonly selectedBoardSlotId: string;
  readonly soundEnabled: boolean;
  readonly studio: KeycapStudioState;
  readonly applyStudioToSlot: (slotId: string) => void;
  readonly clearUnlocks: () => void;
  readonly loadStudioKeycap: (keycapId: KeycapId, appearance?: KeycapAppearance) => void;
  readonly markHydrated: () => void;
  readonly pressKeycap: (keycapId: KeycapId, occurredAt?: number) => void;
  readonly selectBoardSlot: (slotId: string) => void;
  readonly selectKeycap: (keycapId: KeycapId) => void;
  readonly toggleSound: () => void;
  readonly updateStudio: (patch: KeycapStudioPatch) => void;
};

const DEFAULT_BOARD_KEYCAPS = [
  "kcap-milk-1",
  "kcap-matcha-1",
  "kcap-sakura-1",
  "kcap-retro-1",
] as const satisfies readonly KeycapId[];

function createDefaultBoard(): readonly BoardSlot[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `slot-${index + 1}`,
    label: `Slot ${index + 1}`,
    keycapId: DEFAULT_BOARD_KEYCAPS[index % DEFAULT_BOARD_KEYCAPS.length] ?? "kcap-milk-1",
  }));
}

function createStudioState(keycap: KeycapDefinition): KeycapStudioState {
  return {
    keycapId: keycap.id,
    color: keycap.color,
    legend: keycap.legend,
    legendPosition: "center",
    font: "grotesk",
    icon: keycap.icon,
    backgroundPattern: "none",
    transparency: 0,
    material: keycap.material,
    size: keycap.size,
    profile: keycap.profile,
    finish: "matte",
    glow: false,
    sound: keycap.sound,
    switchFeeling: "creamy",
  };
}

function studioAppearance(studio: KeycapStudioState): KeycapAppearance {
  const { keycapId, ...appearance } = studio;
  void keycapId;
  return appearance;
}

const starterKeycap = KEYCAPS[0];

export const useKeycapStore = create<KeycapStoreState>()(
  persist(
    (set) => ({
      ...createInitialKeycapProgress(),
      board: createDefaultBoard(),
      hasHydrated: false,
      lastUnlockedKeycapIds: [],
      selectedBoardSlotId: "slot-1",
      soundEnabled: true,
      studio: createStudioState(starterKeycap),
      applyStudioToSlot: (slotId) =>
        set((state) => {
          if (!state.ownedKeycapIds.includes(state.studio.keycapId)) return {};
          return {
            board: state.board.map((slot) => (
              slot.id === slotId
                ? {
                    id: slot.id,
                    label: slot.label,
                    keycapId: state.studio.keycapId,
                    appearance: studioAppearance(state.studio),
                  }
                : slot
            )),
          };
        }),
      clearUnlocks: () => set({ lastUnlockedKeycapIds: [] }),
      loadStudioKeycap: (keycapId, appearance) =>
        set((state) => {
          const keycap = KEYCAPS.find((item) => item.id === keycapId);
          if (!keycap || !state.ownedKeycapIds.includes(keycapId)) return {};
          return {
            selectedKeycapId: keycapId,
            studio: {
              ...createStudioState(keycap),
              ...appearance,
              keycapId,
            },
          };
        }),
      markHydrated: () => set({ hasHydrated: true }),
      pressKeycap: (keycapId, occurredAt = Date.now()) =>
        set((state) => {
          const result = applyKeycapPress(state, { keycapId, occurredAt });
          return {
            ...result.state,
            lastUnlockedKeycapIds: result.newlyUnlocked.length > 0
              ? result.newlyUnlocked
              : state.lastUnlockedKeycapIds,
          };
        }),
      selectBoardSlot: (slotId) => set({ selectedBoardSlotId: slotId }),
      selectKeycap: (keycapId) => set({ selectedKeycapId: keycapId }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      updateStudio: (patch) =>
        set((state) => ({
          studio: {
            ...state.studio,
            ...patch,
            keycapId: state.studio.keycapId,
          },
        })),
    }),
    {
      name: "tactile-keycap-v2",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const parsedState = parsePersistedKeycapState(persistedState);
        if (parsedState === null) return currentState;
        return { ...currentState, ...parsedState, hasHydrated: false };
      },
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
