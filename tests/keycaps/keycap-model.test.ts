import { describe, expect, it } from "vitest";
import {
  applyKeycapPress,
  createInitialKeycapProgress,
  DAILY_ELIGIBLE_PRESS_LIMIT,
  FIRST_RUN_PRESS_TARGET,
  KEYCAP_REWARD_TARGET,
} from "@/lib/keycap-state";

const DAY_START = Date.UTC(2026, 7, 28);

describe("keycap progression model", () => {
  it("starts with a playable four-key board", () => {
    // Given
    const expectedStarters = ["kcap-milk-1", "kcap-matcha-1", "kcap-sakura-1", "kcap-retro-1"];

    // When
    const state = createInitialKeycapProgress();

    // Then
    expect(state.ownedKeycapIds).toEqual(expectedStarters);
    expect(state.unlockedKeycapIds).toEqual(expectedStarters);
  });

  it("adds XP, press history, and eligible reward progress for a press", () => {
    // Given
    const state = createInitialKeycapProgress();

    // When
    const result = applyKeycapPress(state, { keycapId: "kcap-milk-1", occurredAt: DAY_START });

    // Then
    expect(result.state).toMatchObject({ totalPresses: 1, totalXp: 12, introSeen: false });
    expect(result.state.keycapPresses["kcap-milk-1"]).toBe(1);
    expect(result.state.rewardLedger.eligiblePresses).toBe(1);
    expect(result.state.rewardProgress).toBe(1 / KEYCAP_REWARD_TARGET);
  });

  it("reveals the board only after the tactile first-run sequence", () => {
    // Given
    let state = createInitialKeycapProgress();

    // When
    for (let press = 0; press < FIRST_RUN_PRESS_TARGET; press += 1) {
      state = applyKeycapPress(state, {
        keycapId: "kcap-milk-1",
        occurredAt: DAY_START + press * 100,
      }).state;

      if (press < FIRST_RUN_PRESS_TARGET - 1) expect(state.introSeen).toBe(false);
    }

    // Then
    expect(state.introSeen).toBe(true);
    expect(state.totalPresses).toBe(FIRST_RUN_PRESS_TARGET);
  });

  it("unlocks Matcha Beam on the twelfth Milk One press without duplicates", () => {
    // Given
    let state = createInitialKeycapProgress();

    // When
    for (let press = 0; press < 13; press += 1) {
      state = applyKeycapPress(state, {
        keycapId: "kcap-milk-1",
        occurredAt: DAY_START + press * 100,
      }).state;
    }

    // Then
    expect(state.unlockedKeycapIds.filter((id) => id === "kcap-matcha-2")).toHaveLength(1);
    expect(state.ownedKeycapIds.filter((id) => id === "kcap-matcha-2")).toHaveLength(1);
  });

  it("records implausible bursts as an anti-abuse signal without breaking multi-touch play", () => {
    // Given
    const firstPress = applyKeycapPress(createInitialKeycapProgress(), {
      keycapId: "kcap-milk-1",
      occurredAt: DAY_START,
    }).state;

    // When
    const secondPress = applyKeycapPress(firstPress, {
      keycapId: "kcap-matcha-1",
      occurredAt: DAY_START + 8,
    }).state;

    // Then
    expect(secondPress.rewardLedger.suspiciousPresses).toBe(1);
    expect(secondPress.rewardLedger.eligiblePresses).toBe(2);
  });

  it("soft-caps daily reward eligibility while continuing collection presses", () => {
    // Given
    let state = createInitialKeycapProgress();
    for (let press = 0; press < DAILY_ELIGIBLE_PRESS_LIMIT; press += 1) {
      state = applyKeycapPress(state, {
        keycapId: "kcap-milk-1",
        occurredAt: DAY_START + press * 100,
      }).state;
    }

    // When
    const capped = applyKeycapPress(state, {
      keycapId: "kcap-milk-1",
      occurredAt: DAY_START + DAILY_ELIGIBLE_PRESS_LIMIT * 100,
    }).state;

    // Then
    expect(capped.totalPresses).toBe(DAILY_ELIGIBLE_PRESS_LIMIT + 1);
    expect(capped.rewardLedger.dailyEligiblePresses).toBe(DAILY_ELIGIBLE_PRESS_LIMIT);
    expect(capped.rewardLedger.eligiblePresses).toBe(DAILY_ELIGIBLE_PRESS_LIMIT);
  });

  it("resets the daily eligible counter on a new UTC day", () => {
    // Given
    const firstDay = applyKeycapPress(createInitialKeycapProgress(), {
      keycapId: "kcap-milk-1",
      occurredAt: DAY_START,
    }).state;

    // When
    const nextDay = applyKeycapPress(firstDay, {
      keycapId: "kcap-milk-1",
      occurredAt: DAY_START + 86_400_000,
    }).state;

    // Then
    expect(nextDay.rewardLedger.dailyEligiblePresses).toBe(1);
    expect(nextDay.rewardLedger.eligiblePresses).toBe(2);
  });

  it("clamps physical reward progress at one", () => {
    // Given
    const initial = createInitialKeycapProgress();
    const nearlyEligible = {
      ...initial,
      rewardProgress: (KEYCAP_REWARD_TARGET - 1) / KEYCAP_REWARD_TARGET,
      rewardLedger: {
        ...initial.rewardLedger,
        eligiblePresses: KEYCAP_REWARD_TARGET - 1,
      },
    };

    // When
    const rewardReady = applyKeycapPress(nearlyEligible, {
      keycapId: "kcap-milk-1",
      occurredAt: DAY_START,
    }).state;

    // Then
    expect(rewardReady.rewardProgress).toBe(1);
  });
});
