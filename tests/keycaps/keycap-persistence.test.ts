import { describe, expect, it } from "vitest";
import { parsePersistedKeycapState } from "@/lib/keycap-persistence";
import { useKeycapStore } from "@/lib/keycap-store";

describe("keycap persistence boundary", () => {
  it("rejects invalid persisted Studio values", () => {
    // Given
    const state = useKeycapStore.getInitialState();
    const invalidState = {
      ...state,
      studio: { ...state.studio, material: "painted cardboard" },
    };

    // When
    const parsed = parsePersistedKeycapState(invalidState);

    // Then
    expect(parsed).toBeNull();
  });

  it("repairs derived intro and reward progress fields", () => {
    // Given
    const state = useKeycapStore.getInitialState();
    const staleState = {
      ...state,
      introSeen: true,
      rewardProgress: 9,
      totalPresses: 1,
    };

    // When
    const parsed = parsePersistedKeycapState(staleState);

    // Then
    expect(parsed).toMatchObject({ introSeen: false, rewardProgress: 0 });
  });

  it("accepts customized board-slot appearances", () => {
    // Given
    const state = useKeycapStore.getInitialState();
    const customizedState = {
      ...state,
      board: state.board.map((slot) => (
        slot.id === "slot-1" ? { ...slot, appearance: state.studio } : slot
      )),
    };

    // When
    const parsed = parsePersistedKeycapState(customizedState);

    // Then
    expect(parsed?.board[0]?.appearance).toMatchObject({
      color: state.studio.color,
      sound: state.studio.sound,
    });
  });
});
