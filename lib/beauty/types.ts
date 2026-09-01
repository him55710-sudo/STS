export const BEAUTY_REGIONS = ["skin", "base", "eye", "cheek", "lip"] as const;

export type BeautyRegion = (typeof BEAUTY_REGIONS)[number];

export type BeautyHotspot = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type BeautyProduct = {
  readonly id: string;
  readonly brand: string;
  readonly name: string;
  readonly shade: string;
  readonly image: string | null;
  readonly price: number | null;
  readonly retailer: string | null;
  readonly url: string | null;
  readonly similarIds: readonly string[];
};

export type BeautyApplicationStep = {
  readonly id: string;
  readonly order: number | null;
  readonly region: BeautyRegion;
  readonly label: string;
  readonly startTime: number | null;
  readonly endTime: number | null;
  readonly productId: string;
  readonly amount: string;
  readonly method: string;
  readonly applicationArea: string;
  readonly layerCount: number | null;
  readonly hotspot: BeautyHotspot | null;
};

export type BeautyLook = {
  readonly id: string;
  readonly creatorName: string;
  readonly creatorHandle: string;
  readonly avatar: string | null;
  readonly caption: string;
  readonly videoSrc: string;
  readonly posterSrc: string;
  readonly finalLookStart: number | null;
  readonly finalLookEnd: number | null;
  readonly steps: readonly BeautyApplicationStep[];
};
