import { beforeEach, describe, expect, it } from "vitest";
import { KEYCAP_REWARD_TARGET } from "@/lib/keycap-state";
import { useKeycapStore } from "@/lib/keycap-store";
import { KEYCAPS } from "@/lib/keycaps";

describe("keycap progression", () => {
  beforeEach(() => {
    useKeycapStore.setState(useKeycapStore.getInitialState(), true);
  });

  it("keeps one canonical catalog with at least twelve unique designs", () => {
    // Given
    const ids = KEYCAPS.map((keycap) => keycap.id);

    // When
    const uniqueIds = new Set(ids);

    // Then
    expect(KEYCAPS.length).toBeGreaterThanOrEqual(12);
    expect(uniqueIds.size).toBe(KEYCAPS.length);
  });

  it("unlocks Matcha Beam when Milk One reaches twelve presses", () => {
    // Given
    const pressKeycap = useKeycapStore.getState().pressKeycap;
    for (let press = 0; press < 11; press += 1) {
      pressKeycap("kcap-milk-1");
    }

    // When
    pressKeycap("kcap-milk-1");

    // Then
    const state = useKeycapStore.getState();
    expect(state.keycapPresses["kcap-milk-1"]).toBe(12);
    expect(state.unlockedKeycapIds).toContain("kcap-matcha-2");
    expect(state.ownedKeycapIds).toContain("kcap-matcha-2");
  });

  it("keeps an unlock notice until it is dismissed", () => {
    // Given
    const pressKeycap = useKeycapStore.getState().pressKeycap;
    pressKeycap("kcap-milk-1", 100);
    pressKeycap("kcap-milk-1", 200);
    pressKeycap("kcap-milk-1", 300);

    // When
    pressKeycap("kcap-milk-1", 400);

    // Then
    expect(useKeycapStore.getState().lastUnlockedKeycapIds).toContain("kcap-milk-2");
    useKeycapStore.getState().clearUnlocks();
    expect(useKeycapStore.getState().lastUnlockedKeycapIds).toEqual([]);
  });

  it("preserves Studio identity when a visual field changes", () => {
    // Given
    const initialKeycapId = useKeycapStore.getState().studio.keycapId;

    // When
    useKeycapStore.getState().updateStudio({ color: "#201F24" });

    // Then
    expect(useKeycapStore.getState().studio).toMatchObject({
      keycapId: initialKeycapId,
      color: "#201F24",
    });
  });

  it("persists a complete Studio appearance on a board slot", () => {
    // Given
    useKeycapStore.getState().updateStudio({
      color: "#201F24",
      legend: "Mine",
      sound: "marble",
      switchFeeling: "tactile",
    });

    // When
    useKeycapStore.getState().applyStudioToSlot("slot-1");
    const slot = useKeycapStore.getState().board.find((item) => item.id === "slot-1");
    if (slot === undefined) throw new Error("Expected slot-1 to exist");
    useKeycapStore.getState().loadStudioKeycap(slot.keycapId, slot.appearance);

    // Then
    expect(slot.appearance).toMatchObject({
      color: "#201F24",
      legend: "Mine",
      sound: "marble",
      switchFeeling: "tactile",
    });
    expect(useKeycapStore.getState().studio).toMatchObject({
      keycapId: slot.keycapId,
      color: "#201F24",
      legend: "Mine",
      sound: "marble",
      switchFeeling: "tactile",
    });
  });

  it("caps physical reward progress at one", () => {
    // Given
    useKeycapStore.setState((state) => ({
      rewardProgress: (KEYCAP_REWARD_TARGET - 1) / KEYCAP_REWARD_TARGET,
      rewardLedger: {
        ...state.rewardLedger,
        eligiblePresses: KEYCAP_REWARD_TARGET - 1,
      },
    }));

    // When
    useKeycapStore.getState().pressKeycap("kcap-milk-1");

    // Then
    expect(useKeycapStore.getState().rewardProgress).toBe(1);
  });
});
