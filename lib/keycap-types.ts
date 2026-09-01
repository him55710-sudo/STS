export const KEYCAP_COLLECTIONS = [
  "Milk",
  "Matcha",
  "Sakura",
  "Retro Terminal",
  "Midnight",
  "Jelly",
  "Cyber",
  "Stone",
  "Cloud",
  "Arcade",
  "Transparent",
  "Limited Artist Series",
] as const;

export const KEYCAP_MATERIALS = [
  "PBT",
  "ABS",
  "translucent",
  "clear resin",
  "frosted",
  "ceramic-like",
  "metallic",
  "glossy artisan",
] as const;

export const KEYCAP_SOUND_PRESETS = [
  "creamy",
  "thock",
  "clack",
  "marble",
  "poppy",
  "silent",
  "tactile",
  "custom",
] as const;

export const KEYCAP_SIZES = ["1U", "1.25U", "1.5U", "2U"] as const;
export const KEYCAP_PROFILES = ["Cherry", "SA", "XDA", "DSA"] as const;
export const KEYCAP_PATTERNS = ["none", "grid", "noise", "stripes"] as const;
export const KEYCAP_FINISHES = ["matte", "satin", "gloss"] as const;
export const KEYCAP_FONTS = ["mono", "grotesk", "rounded"] as const;
export const KEYCAP_LEGEND_POSITIONS = ["center", "top", "bottom"] as const;
export const KEYCAP_SWITCH_FEELINGS = ["creamy", "snappy", "silent", "tactile"] as const;

export type KeycapId = `kcap-${string}`;
export type KeycapCollection = (typeof KEYCAP_COLLECTIONS)[number];
export type KeycapMaterial = (typeof KEYCAP_MATERIALS)[number];
export type KeycapSoundPreset = (typeof KEYCAP_SOUND_PRESETS)[number];
export type KeycapSize = (typeof KEYCAP_SIZES)[number];
export type KeycapProfile = (typeof KEYCAP_PROFILES)[number];
export type KeycapPattern = (typeof KEYCAP_PATTERNS)[number];
export type KeycapFinish = (typeof KEYCAP_FINISHES)[number];
export type KeycapFont = (typeof KEYCAP_FONTS)[number];
export type KeycapLegendPosition = (typeof KEYCAP_LEGEND_POSITIONS)[number];
export type KeycapSwitchFeeling = (typeof KEYCAP_SWITCH_FEELINGS)[number];
export type KeycapRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type KeycapDefinition = {
  readonly id: KeycapId;
  readonly name: string;
  readonly collection: KeycapCollection;
  readonly rarity: KeycapRarity;
  readonly material: KeycapMaterial;
  readonly sound: KeycapSoundPreset;
  readonly size: KeycapSize;
  readonly profile: KeycapProfile;
  readonly color: string;
  readonly accent: string;
  readonly legend: string;
  readonly icon: string;
  readonly description: string;
  readonly unlockCondition: string;
  readonly unlockPresses: number;
};

export type KeycapAppearance = {
  readonly color: string;
  readonly legend: string;
  readonly legendPosition: KeycapLegendPosition;
  readonly font: KeycapFont;
  readonly icon: string;
  readonly backgroundPattern: KeycapPattern;
  readonly transparency: number;
  readonly material: KeycapMaterial;
  readonly size: KeycapSize;
  readonly profile: KeycapProfile;
  readonly finish: KeycapFinish;
  readonly glow: boolean;
  readonly sound: KeycapSoundPreset;
  readonly switchFeeling: KeycapSwitchFeeling;
};

export type KeycapStudioState = KeycapAppearance & {
  readonly keycapId: KeycapId;
};

export type KeycapStudioPatch = Partial<KeycapAppearance>;

export type BoardSlot = {
  readonly id: string;
  readonly label: string;
  readonly keycapId: KeycapId;
  readonly appearance?: KeycapAppearance;
};
