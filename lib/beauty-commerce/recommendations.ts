import { z } from "zod";
import { BEAUTY_LOOKS } from "./catalog";
import { INITIAL_CREATOR_RECORDS, normalizeTikTokUrl, SOURCE_PRODUCT_STACKS } from "./tiktok";
import type { CreatorRecord } from "./tiktok";
import type { PersonalBeautyProfile } from "./fit";
import type { Localized, Region } from "./types";

const tri = (en: string, vi: string, ko: string): Localized => ({ en, vi, ko });
export type WatchItem = {
  readonly id: string; readonly title: Localized; readonly creator: string;
  readonly regions: readonly Region[]; readonly finish: "glossy" | "unspecified";
  readonly sourceUrl: string; readonly detailHref: string;
  readonly media: { readonly kind: "local"; readonly src: string; readonly poster: string; readonly captions?: string }
    | { readonly kind: "tiktok"; readonly embedUrl: string; readonly record: CreatorRecord };
};
const localItems: readonly WatchItem[] = BEAUTY_LOOKS.flatMap((look) => look.media.kind === "licensed" ? [{
  id: `local-${look.id}`, title: look.title, creator: look.creator, regions: [look.category], finish: "unspecified",
  sourceUrl: look.media.sourceUrl, detailHref: `/look/${look.id}`,
  media: { kind: "local", src: look.media.src, poster: look.image, captions: look.media.captions?.find((caption) => caption.locale === "en")?.src },
}] : []);
function creatorWatchItems(records: readonly CreatorRecord[]): readonly WatchItem[] { return records.flatMap((record) => {
  const source = normalizeTikTokUrl(record.url);
  if (!source) return [];
  const regions = [...new Set((SOURCE_PRODUCT_STACKS[source.videoId] ?? []).map((product) => product.region))];
  return [{ id: source.videoId, title: record.title.trim() ? tri(record.title, record.title, record.title) : tri("A creator's beauty routine", "Routine làm đẹp của tác giả", "크리에이터의 뷰티 루틴"), creator: record.author,
    regions, finish: source.videoId === "7518741157669653790" ? "glossy" : "unspecified",
    sourceUrl: source.url, detailHref: `/creators?video=${source.videoId}`, media: { kind: "tiktok", embedUrl: source.embedUrl, record } }];
}); }

export function buildWatchItems(records: readonly CreatorRecord[]): readonly WatchItem[] { return [
  ...localItems,
  { id: "local-brush-practice", title: tri("A closer look at brush placement", "Quan sát cách đặt cọ", "브러시가 닿는 위치를 가까이"), creator: "Polina / Pexels", regions: ["base", "cheek"], finish: "unspecified",
    sourceUrl: "https://www.pexels.com/video/woman-putting-makeup-6543119/", detailHref: "/discover?category=base",
    media: { kind: "local", src: "/beauty-media/daily-makeup.mp4", poster: "/beauty-media/daily-makeup.webp", captions: "/beauty-media/daily-makeup.vi.vtt" } },
  ...creatorWatchItems(records).filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index),
]; }
export const WATCH_ITEMS = buildWatchItems(INITIAL_CREATOR_RECORDS);
export const WATCH_CREATORS = [...new Set(creatorWatchItems(INITIAL_CREATOR_RECORDS).map((item) => item.creator))];
const regionSchema = z.enum(["skin", "base", "eye", "cheek", "lip"]);
const watchPreferencesSchema = z.strictObject({
  status: z.enum(["new", "complete", "skipped"]), interests: z.array(regionSchema).max(5), creators: z.array(z.string().max(100)).max(20),
  skinTone: z.enum(["unsure", "light", "medium", "deep"]).default("unsure"),
  undertone: z.enum(["unsure", "warm", "cool", "neutral"]).default("unsure"),
  savedVideoIds: z.array(z.string().max(100)).max(100).default([]),
});
export type WatchPreferences = z.infer<typeof watchPreferencesSchema>;
export const DEFAULT_WATCH_PREFERENCES: WatchPreferences = { status: "new", interests: [], creators: [], skinTone: "unsure", undertone: "unsure", savedVideoIds: [] };
export const WATCH_PREFERENCES_KEY = "sts-watch-preferences-v1";

export function parseWatchPreferences(raw: string | null, items: readonly WatchItem[] = WATCH_ITEMS): WatchPreferences {
  if (!raw || raw.length > 8_000) return DEFAULT_WATCH_PREFERENCES;
  let input: unknown;
  try { input = JSON.parse(raw); } catch (error) { if (error instanceof SyntaxError) return DEFAULT_WATCH_PREFERENCES; throw error; }
  const parsed = watchPreferencesSchema.safeParse(input);
  if (!parsed.success) return DEFAULT_WATCH_PREFERENCES;
  return { ...parsed.data, interests: [...new Set(parsed.data.interests)], creators: [...new Set(parsed.data.creators)].filter((creator) => items.some((item) => item.creator === creator)), savedVideoIds: [...new Set(parsed.data.savedVideoIds)].filter((id) => items.some((item) => item.id === id)) };
}

export function rankWatchItems(items: readonly WatchItem[], profile: PersonalBeautyProfile, preferences: WatchPreferences): readonly { readonly item: WatchItem; readonly reasons: readonly Localized[] }[] {
  const personal = preferences.status === "complete";
  return items.map((item, index) => {
    let score = item.media.kind === "local" ? 12 : 6;
    const reasons: Localized[] = [];
    if (personal && preferences.creators.includes(item.creator)) {
      score += 60; reasons.push(tri("From a creator you chose.", "Từ tác giả bạn đã chọn.", "직접 선택한 크리에이터의 영상입니다."));
    }
    if (personal && item.regions.some((region) => preferences.interests.includes(region))) {
      score += 24; reasons.push(tri("Includes a makeup area you want to explore.", "Có vùng trang điểm bạn muốn khám phá.", "관심 부위로 선택한 메이크업을 포함합니다."));
    }
    if (personal && profile.finish === "glossy" && item.finish === "glossy") {
      score += 8; reasons.push(tri("The source describes a dewy look, matching your finish preference.", "Nguồn mô tả diện mạo căng bóng, hợp sở thích của bạn.", "원문이 설명하는 윤기 있는 룩이 선택한 마무리 취향과 관련됩니다."));
    }
    if (personal && profile.skinType === "dry" && item.regions.includes("skin")) {
      score += 4; reasons.push(tri("You chose dry skin; this source includes skin-prep ideas, not a skin-safety assessment.", "Bạn chọn da khô; nguồn này có gợi ý chuẩn bị da, không đánh giá an toàn da.", "건성을 선택해 스킨 준비 아이디어를 포함한 영상을 제안합니다. 피부 안전성을 평가한 결과는 아닙니다."));
    }
    if (reasons.length === 0) reasons.push(tri("From the current curated video collection.", "Từ bộ video tuyển chọn hiện tại.", "현재 큐레이션한 영상 모음에서 골랐습니다."));
    return { item, reasons, score, index };
  }).sort((left, right) => right.score - left.score || left.index - right.index).map(({ item, reasons }) => ({ item, reasons }));
}
