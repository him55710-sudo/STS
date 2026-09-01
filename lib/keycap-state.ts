import type { KeycapId } from "./keycap-types";

export const KEYCAP_REWARD_TARGET = 14_800;
export const DAILY_ELIGIBLE_PRESS_LIMIT = 1_200;
export const FIRST_RUN_PRESS_TARGET = 4;
export const STARTER_KEYCAP_IDS = [
  "kcap-milk-1",
  "kcap-matcha-1",
  "kcap-sakura-1",
  "kcap-retro-1",
] as const satisfies readonly KeycapId[];

const SUSPICIOUS_BURST_INTERVAL_MS = 24;

export type RewardLedger = {
  readonly eligiblePresses: number;
  readonly dailyEligiblePresses: number;
  readonly dayKey: string;
  readonly suspiciousPresses: number;
  readonly lastPressAt: number | null;
  readonly verification: "local-only";
};

export type KeycapProgressState = {
  readonly introSeen: boolean;
  readonly totalPresses: number;
  readonly totalXp: number;
  readonly selectedKeycapId: KeycapId;
  readonly keycapPresses: Readonly<Partial<Record<KeycapId, number>>>;
  readonly ownedKeycapIds: readonly KeycapId[];
  readonly unlockedKeycapIds: readonly KeycapId[];
  readonly rewardProgress: number;
  readonly rewardLedger: RewardLedger;
};

export type KeycapPressInput = {
  readonly keycapId: KeycapId;
  readonly occurredAt: number;
};

export type KeycapPressResult = {
  readonly state: KeycapProgressState;
  readonly newlyUnlocked: readonly KeycapId[];
};

export function createInitialKeycapProgress(): KeycapProgressState {
  return {
    introSeen: false,
    totalPresses: 0,
    totalXp: 0,
    selectedKeycapId: "kcap-milk-1",
    keycapPresses: {},
    ownedKeycapIds: [...STARTER_KEYCAP_IDS],
    unlockedKeycapIds: [...STARTER_KEYCAP_IDS],
    rewardProgress: 0,
    rewardLedger: {
      eligiblePresses: 0,
      dailyEligiblePresses: 0,
      dayKey: "",
      suspiciousPresses: 0,
      lastPressAt: null,
      verification: "local-only",
    },
  };
}

export function applyKeycapPress(
  state: KeycapProgressState,
  input: KeycapPressInput,
): KeycapPressResult {
  const dayKey = new Date(input.occurredAt).toISOString().slice(0, 10);
  const dailyEligiblePresses = state.rewardLedger.dayKey === dayKey
    ? state.rewardLedger.dailyEligiblePresses
    : 0;
  const countsTowardReward = dailyEligiblePresses < DAILY_ELIGIBLE_PRESS_LIMIT;
  const nextDailyEligiblePresses = dailyEligiblePresses + (countsTowardReward ? 1 : 0);
  const eligiblePresses = state.rewardLedger.eligiblePresses + (countsTowardReward ? 1 : 0);
  const interval = state.rewardLedger.lastPressAt === null
    ? Number.POSITIVE_INFINITY
    : input.occurredAt - state.rewardLedger.lastPressAt;
  const suspiciousPresses = state.rewardLedger.suspiciousPresses
    + (interval < SUSPICIOUS_BURST_INTERVAL_MS ? 1 : 0);
  const keycapPresses = (state.keycapPresses[input.keycapId] ?? 0) + 1;
  const totalPresses = state.totalPresses + 1;
  const unlockCandidates = collectUnlockCandidates({
    eligiblePresses,
    keycapId: input.keycapId,
    keycapPresses,
    totalPresses,
  });
  const newlyUnlocked = unlockCandidates.filter(
    (keycapId) => !state.unlockedKeycapIds.includes(keycapId),
  );

  return {
    newlyUnlocked,
    state: {
      introSeen: totalPresses >= FIRST_RUN_PRESS_TARGET,
      totalPresses,
      totalXp: state.totalXp + 12,
      selectedKeycapId: input.keycapId,
      keycapPresses: { ...state.keycapPresses, [input.keycapId]: keycapPresses },
      unlockedKeycapIds: [...state.unlockedKeycapIds, ...newlyUnlocked],
      ownedKeycapIds: [
        ...state.ownedKeycapIds,
        ...newlyUnlocked.filter((keycapId) => !state.ownedKeycapIds.includes(keycapId)),
      ],
      rewardProgress: Math.min(1, eligiblePresses / KEYCAP_REWARD_TARGET),
      rewardLedger: {
        eligiblePresses,
        dailyEligiblePresses: nextDailyEligiblePresses,
        dayKey,
        suspiciousPresses,
        lastPressAt: input.occurredAt,
        verification: "local-only",
      },
    },
  };
}

type UnlockContext = {
  readonly eligiblePresses: number;
  readonly keycapId: KeycapId;
  readonly keycapPresses: number;
  readonly totalPresses: number;
};

function collectUnlockCandidates(context: UnlockContext): readonly KeycapId[] {
  const unlocks: KeycapId[] = [];

  if (context.totalPresses >= 3) unlocks.push("kcap-milk-2");
  if (context.keycapId === "kcap-milk-1" && context.keycapPresses >= 12) {
    unlocks.push("kcap-matcha-2");
  }
  if (context.keycapId === "kcap-milk-1" && context.keycapPresses >= 36) {
    unlocks.push("kcap-jelly-1");
  }
  if (context.totalPresses >= 60) unlocks.push("kcap-cloud-1");
  if (context.totalPresses >= 144) unlocks.push("kcap-stone-1");
  if (context.totalPresses >= 250) unlocks.push("kcap-midnight-1");
  if (context.eligiblePresses >= 4_200) unlocks.push("kcap-arcade-1");
  if (context.eligiblePresses >= 8_000) unlocks.push("kcap-transparent-1");
  if (context.eligiblePresses >= KEYCAP_REWARD_TARGET) {
    unlocks.push("kcap-cyber-1", "kcap-artist-1");
  }

  return unlocks;
}
