import { z } from "zod";
import { BEAUTY_PRODUCTS } from "./catalog";
import type { Region } from "./types";
import { REVIEWED_ROUTINES, serializeReviewedSteps } from "./reviewed-routines";
import type { ReviewedRoutineStep } from "./reviewed-routines";

export const TIKTOK_ORIGIN = "https://www.tiktok.com";
export const CREATOR_LIBRARY_KEY = "sts-creator-library-v1";
export type TikTokSource = { readonly url: string; readonly handle: string; readonly videoId: string; readonly embedUrl: string };
export type ProductEvidence = { readonly productId: string; readonly strength: "product-name-mentioned" | "brand-only"; readonly excerpt: string; readonly matchedTerms: readonly string[] };
export type ManualSegment = { readonly start: number; readonly end: number | null; readonly label: string };

export function normalizeTikTokUrl(input: string): TikTokSource | null {
  let url: URL;
  try { url = new URL(input.trim()); } catch (error) { if (error instanceof TypeError) return null; throw error; }
  if (url.protocol !== "https:" || url.hostname !== "www.tiktok.com" || url.port || url.username || url.password) return null;
  const match = /^\/@([a-zA-Z0-9._]{1,24})\/video\/([1-9]\d{17,19})\/?$/.exec(url.pathname);
  if (!match) return null;
  const [, handle, videoId] = match;
  if (!handle || !videoId) return null;
  return { url: `${TIKTOK_ORIGIN}/@${handle}/video/${videoId}`, handle, videoId, embedUrl: `${TIKTOK_ORIGIN}/player/v1/${videoId}?description=1&music_info=1&controls=1` };
}

const ALIASES: Readonly<Record<string, { readonly brands: readonly string[]; readonly names: readonly string[] }>> = {
  "romand-tint": { brands: ["romand", "rom&nd", "롬앤"], names: ["juicy lasting tint", "쥬시 래스팅 틴트", "쥬시래스팅틴트"] },
  "clio-cushion": { brands: ["clio", "클리오"], names: ["kill cover the new founwear", "kill cover founwear", "킬커버 더 뉴 파운웨어", "킬커버 파운웨어"] },
  "torriden-serum": { brands: ["torriden", "토리든"], names: ["torriden dive in", "토리든 다이브인", "다이브인 세럼"] },
  "3ce-blush": { brands: ["3ce", "쓰리씨이"], names: ["mood recipe face blush", "무드 레시피 페이스 블러쉬", "무드레시피 페이스블러쉬"] },
  "glint-highlighter": { brands: ["glint", "글린트"], names: ["glint highlighter", "글린트 하이라이터"] },
  "etude-brow": { brands: ["etude", "etude house", "에뛰드"], names: ["etude drawing eye brow", "drawing eye brow", "드로잉 아이브로우"] },
} as const;

function normalized(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function mentions(text: string, term: string): boolean {
  const token = normalized(term);
  return /[가-힣]/.test(term) ? text.includes(token) : ` ${text} `.includes(` ${token} `);
}

export function analyzeCreatorCaption(caption: string): readonly ProductEvidence[] {
  const bounded = caption.slice(0, 12_000);
  const text = normalized(bounded);
  const evidence: ProductEvidence[] = [];
  for (const product of BEAUTY_PRODUCTS) {
    const alias = ALIASES[product.id];
    if (!alias) continue;
    const names = alias.names.filter((term) => mentions(text, term));
    const brands = alias.brands.filter((term) => mentions(text, term));
    const terms = names.length > 0 ? names : brands;
    if (terms.length === 0) continue;
    const line = bounded.split(/\r?\n/).find((part) => terms.some((term) => mentions(normalized(part), term))) ?? bounded;
    evidence.push({ productId: product.id, strength: names.length > 0 ? "product-name-mentioned" : "brand-only", excerpt: line.slice(0, 320), matchedTerms: terms });
  }
  return evidence;
}

export function parseTimestampLines(input: string): { readonly segments: readonly ManualSegment[]; readonly errors: readonly { readonly line: number; readonly message: string }[] } {
  const points: { readonly start: number; readonly label: string }[] = [];
  const errors: { readonly line: number; readonly message: string }[] = [];
  const lines = input.trim() ? input.trim().split(/\r?\n/) : [];
  if (lines.length > 30) return { segments: [], errors: [{ line: 31, message: "Use at most 30 timestamp lines." }] };
  for (const [index, line] of lines.entries()) {
    const match = /^(\d{1,2}):(\d{2})\s+(.{1,100})$/.exec(line.trim());
    if (!match) { errors.push({ line: index + 1, message: "Use mm:ss followed by a step name." }); continue; }
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const label = match[3]?.trim() ?? "";
    const start = minutes * 60 + seconds;
    const previous = points[points.length - 1];
    if (seconds > 59 || minutes > 59 || !label || (previous && start <= previous.start)) {
      errors.push({ line: index + 1, message: "Times must be valid and strictly increasing." }); continue;
    }
    points.push({ start, label });
  }
  return { segments: points.map((point, index) => ({ ...point, end: points[index + 1]?.start ?? null })), errors };
}

export const creatorRecordSchema = z.strictObject({
  url: z.string().max(500).refine((url) => normalizeTikTokUrl(url) !== null),
  caption: z.string().max(12_000), timestamps: z.string().max(4_000),
  title: z.string().max(1_000), author: z.string().max(100),
  captionOrigin: z.enum(["manual", "indexed-source"]).default("manual"),
  titleOrigin: z.enum(["manual", "indexed-source", "oembed"]).default("manual"),
  timestampOrigin: z.enum(["manual", "reviewed"]).default("manual"),
});
export type CreatorRecord = z.infer<typeof creatorRecordSchema>;
export type CreatorSourceProduct = { readonly brand: string; readonly name: string; readonly sourceDetail: string | null; readonly region: Region; readonly labelSeenAt?: number };

export const SOURCE_PRODUCT_STACKS: Readonly<Record<string, readonly CreatorSourceProduct[]>> = {
  "7518741157669653790": [
    { brand: "NARS", name: "Light Reflecting Serum Cushion", sourceDetail: null, region: "base" },
    { brand: "2aN", name: "Better Me eye shadow", sourceDetail: null, region: "eye" },
    { brand: "AOU", name: "Glowy Cream Blush", sourceDetail: "churu cheeks", region: "cheek" },
    { brand: "MAKE UP FOR EVER", name: "Waterproof eyeliner", sourceDetail: "ebony", region: "eye" },
    { brand: "COLORGRAM", name: "Shade Reforming Brush Liner", sourceDetail: "70%", region: "eye" },
    { brand: "COLORGRAM", name: "Heartlighter", sourceDetail: "peach heart", region: "cheek" },
    { brand: "COLORGRAM", name: "Style Up Lash Mascara", sourceDetail: null, region: "eye" },
    { brand: "Peripera", name: "Brow Cara", sourceDetail: "ash brown", region: "eye" },
    { brand: "Peripera", name: "Ink Mood Glowy Tint", sourceDetail: "coral influencer", region: "lip" },
  ],
  "7310866363613039874": [
    { brand: "Incellderm", name: "Sunscreen", sourceDetail: null, region: "skin" },
    { brand: "Incellderm", name: "BB cream", sourceDetail: null, region: "base" },
    { brand: "lilybyred", name: "Mood Keyboard eyeshadow", sourceDetail: null, region: "eye" },
    { brand: "NARS", name: "Afterglow Liquid Blush", sourceDetail: null, region: "cheek" },
    { brand: "ETUDE", name: "Play101 Stick", sourceDetail: null, region: "base" },
    { brand: "REVLON", name: "Skinlights", sourceDetail: null, region: "cheek" },
    { brand: "NUSE", name: "Mousse Carecheek", sourceDetail: null, region: "cheek" },
    { brand: "NUSE", name: "Mousse Liptual", sourceDetail: null, region: "lip" },
    { brand: "NUDESTIX", name: "Hydra Peptide Lip Butter", sourceDetail: null, region: "lip", labelSeenAt: 63 },
  ],
  "7292952659240209672": [
    { brand: "rom&nd", name: "Juicy Lasting Tint", sourceDetail: null, region: "lip" },
    { brand: "rom&nd", name: "Dewyful Water Tint", sourceDetail: null, region: "lip" },
    { brand: "Peripera", name: "Ink Mood Glowy Tint", sourceDetail: null, region: "lip" },
    { brand: "AMUSE", name: "Dew Tint", sourceDetail: null, region: "lip" },
  ],
} as const;

// Indexed primary-source notes documented in public/beauty-media/routine-media-provenance.md.
// Product-family excerpts are evidence summaries, not invented captions or transcripts.
export const INITIAL_CREATOR_RECORDS: readonly CreatorRecord[] = [
  { url: "https://www.tiktok.com/@jooshica/video/7518741157669653790", title: "Easy Korean Natural Makeup Tutorial: Dewy Skin & Peach Blush", author: "@jooshica", caption: "", timestamps: "", captionOrigin: "indexed-source", titleOrigin: "indexed-source" },
  { url: "https://www.tiktok.com/@iam.chae/video/7310866363613039874", title: "Current daily makeup routine", author: "@iam.chae", caption: "", timestamps: "", captionOrigin: "indexed-source", titleOrigin: "indexed-source" },
  { url: "https://www.tiktok.com/@jooshica/video/7211035061427146027", title: "Eyebrow tutorial", author: "@jooshica", caption: "", timestamps: "", captionOrigin: "indexed-source", titleOrigin: "indexed-source" },
  { url: "https://www.tiktok.com/@sarahkchey/video/7292952659240209672", title: "Favorite K-beauty lip tints", author: "@sarahkchey", caption: "rom&nd Juicy Lasting Tint", timestamps: "", captionOrigin: "indexed-source", titleOrigin: "indexed-source" },
].map((record) => enrichReviewedSteps(creatorRecordSchema.parse(record)));

export function parseCreatorLibrary(raw: string | null): readonly CreatorRecord[] {
  if (!raw || raw.length > 400_000) return [];
  let input: unknown;
  try { input = JSON.parse(raw); } catch (error) { if (error instanceof SyntaxError) return []; throw error; }
  const parsed = z.array(z.unknown()).max(20).safeParse(input);
  if (!parsed.success) return [];
  const records = new Map<string, CreatorRecord>();
  for (const item of parsed.data) {
    const record = creatorRecordSchema.safeParse(item);
    if (!record.success) continue;
    const source = normalizeTikTokUrl(record.data.url);
    if (source) records.set(source.videoId, enrichReviewedSteps({ ...record.data, url: source.url }));
  }
  return [...records.values()];
}

function enrichReviewedSteps(record: CreatorRecord): CreatorRecord {
  const steps = REVIEWED_ROUTINES[normalizeTikTokUrl(record.url)?.videoId ?? ""];
  if (!steps || record.timestamps.trim() || record.captionOrigin !== "indexed-source") return record;
  return { ...record, timestampOrigin: "reviewed", timestamps: serializeReviewedSteps(steps) };
}
export function getReviewedSteps(record: CreatorRecord): readonly ReviewedRoutineStep[] {
  const steps = REVIEWED_ROUTINES[normalizeTikTokUrl(record.url)?.videoId ?? ""];
  return steps && record.timestampOrigin === "reviewed" && record.timestamps === serializeReviewedSteps(steps) ? steps : [];
}
export function getCreatorSegments(record: CreatorRecord): readonly ManualSegment[] {
  const reviewed = getReviewedSteps(record);
  return reviewed.length ? reviewed.map((step) => ({ start: step.start, end: step.end, label: step.label.en })) : parseTimestampLines(record.timestamps).segments;
}

export const tikTokMetadataSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available"), source: z.string(), title: z.string().max(1_000), author: z.string().max(100) }),
  z.object({ status: z.literal("unavailable"), source: z.string(), reason: z.enum(["blocked", "timeout", "invalid", "network"]) }),
]);
export type TikTokMetadata = z.infer<typeof tikTokMetadataSchema>;

export type PlayerMessage =
  | { readonly kind: "ready" }
  | { readonly kind: "time"; readonly currentTime: number; readonly duration: number }
  | { readonly kind: "error"; readonly code: number; readonly message: string };
const envelopeSchema = z.object({ "x-tiktok-player": z.literal(true), type: z.string(), value: z.unknown().optional() });
const timeSchema = z.object({ currentTime: z.number().finite().nonnegative(), duration: z.number().finite().nonnegative() });
const errorSchema = z.object({ errorCode: z.number().int(), errorType: z.string().max(100) });

export function parsePlayerMessage(input: unknown): PlayerMessage | null {
  let payload: unknown = input;
  if (typeof input === "string") {
    if (input.length > 4_096) return null;
    try { payload = JSON.parse(input); }
    catch (error) { if (error instanceof SyntaxError) return null; throw error; }
  }
  const envelope = envelopeSchema.safeParse(payload);
  if (!envelope.success) return null;
  switch (envelope.data.type) {
    case "onPlayerReady": return { kind: "ready" };
    case "onCurrentTime": {
      const value = timeSchema.safeParse(envelope.data.value);
      return value.success ? { kind: "time", ...value.data } : null;
    }
    case "onPlayerError": {
      const value = errorSchema.safeParse(envelope.data.value);
      return value.success ? { kind: "error", code: value.data.errorCode, message: value.data.errorType } : null;
    }
    default: return null;
  }
}
