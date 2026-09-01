import { z } from "zod";
import {
  DAILY_ELIGIBLE_PRESS_LIMIT,
  FIRST_RUN_PRESS_TARGET,
  KEYCAP_REWARD_TARGET,
} from "./keycap-state";
import {
  KEYCAP_FINISHES,
  KEYCAP_FONTS,
  KEYCAP_LEGEND_POSITIONS,
  KEYCAP_MATERIALS,
  KEYCAP_PATTERNS,
  KEYCAP_PROFILES,
  KEYCAP_SIZES,
  KEYCAP_SOUND_PRESETS,
  KEYCAP_SWITCH_FEELINGS,
  type KeycapId,
} from "./keycap-types";
import { KEYCAPS } from "./keycaps";

function isKnownKeycapId(value: unknown): value is KeycapId {
  return typeof value === "string" && KEYCAPS.some((keycap) => keycap.id === value);
}

const keycapIdSchema = z.custom<KeycapId>(isKnownKeycapId);
const uniqueKeycapIdsSchema = z.array(keycapIdSchema).refine(
  (keycapIds) => new Set(keycapIds).size === keycapIds.length,
  "Keycap IDs must be unique",
);
const appearanceSchema = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  legend: z.string().max(12),
  legendPosition: z.enum(KEYCAP_LEGEND_POSITIONS),
  font: z.enum(KEYCAP_FONTS),
  icon: z.string().max(4),
  backgroundPattern: z.enum(KEYCAP_PATTERNS),
  transparency: z.number().finite().min(0).max(100),
  material: z.enum(KEYCAP_MATERIALS),
  size: z.enum(KEYCAP_SIZES),
  profile: z.enum(KEYCAP_PROFILES),
  finish: z.enum(KEYCAP_FINISHES),
  glow: z.boolean(),
  sound: z.enum(KEYCAP_SOUND_PRESETS),
  switchFeeling: z.enum(KEYCAP_SWITCH_FEELINGS),
});
const boardSlotSchema = z.object({
  id: z.string().regex(/^slot-\d+$/),
  label: z.string().min(1).max(32),
  keycapId: keycapIdSchema,
  appearance: appearanceSchema.optional(),
});
const rewardLedgerSchema = z.object({
  eligiblePresses: z.number().int().nonnegative(),
  dailyEligiblePresses: z.number().int().min(0).max(DAILY_ELIGIBLE_PRESS_LIMIT),
  dayKey: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  suspiciousPresses: z.number().int().nonnegative(),
  lastPressAt: z.number().int().nonnegative().nullable(),
  verification: z.literal("local-only"),
});
const persistedKeycapStateSchema = z.object({
  board: z.array(boardSlotSchema).length(12),
  introSeen: z.boolean(),
  keycapPresses: z.record(keycapIdSchema, z.number().int().nonnegative()),
  lastUnlockedKeycapIds: uniqueKeycapIdsSchema,
  ownedKeycapIds: uniqueKeycapIdsSchema,
  rewardLedger: rewardLedgerSchema,
  rewardProgress: z.number().finite(),
  selectedBoardSlotId: z.string(),
  selectedKeycapId: keycapIdSchema,
  soundEnabled: z.boolean(),
  studio: appearanceSchema.extend({ keycapId: keycapIdSchema }),
  totalPresses: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  unlockedKeycapIds: uniqueKeycapIdsSchema,
});

export type KeycapPersistedState = z.infer<typeof persistedKeycapStateSchema>;

export function parsePersistedKeycapState(value: unknown): KeycapPersistedState | null {
  const parsed = persistedKeycapStateSchema.safeParse(value);
  if (!parsed.success) return null;

  const state = parsed.data;
  const selectedSlotExists = state.board.some((slot) => slot.id === state.selectedBoardSlotId);
  const studioKeycapIsOwned = state.ownedKeycapIds.includes(state.studio.keycapId);
  if (!selectedSlotExists || !studioKeycapIsOwned) return null;

  return {
    ...state,
    introSeen: state.totalPresses >= FIRST_RUN_PRESS_TARGET,
    rewardProgress: Math.min(1, state.rewardLedger.eligiblePresses / KEYCAP_REWARD_TARGET),
  };
}
