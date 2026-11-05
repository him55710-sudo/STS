import { describe, expect, it } from "vitest";
import { DEFAULT_BEAUTY_PROFILE } from "@/lib/beauty-commerce/fit";
import { DEFAULT_WATCH_PREFERENCES, parseWatchPreferences, rankWatchItems, WATCH_ITEMS } from "@/lib/beauty-commerce/recommendations";

describe("explainable watch recommendations", () => {
  it("puts a chosen creator first with an explicit creator reason", () => {
    const ranked = rankWatchItems(WATCH_ITEMS, DEFAULT_BEAUTY_PROFILE, { ...DEFAULT_WATCH_PREFERENCES, status: "complete", creators: ["@iam.chae"] });
    expect(ranked[0]?.item.creator).toBe("@iam.chae");
    expect(ranked[0]?.reasons.some((reason) => reason.en.includes("creator you chose"))).toBe(true);
  });

  it("uses selected areas to rank relevant content without claiming skin compatibility", () => {
    const ranked = rankWatchItems(WATCH_ITEMS, { ...DEFAULT_BEAUTY_PROFILE, skinType: "dry" }, { ...DEFAULT_WATCH_PREFERENCES, status: "complete", interests: ["lip"] });
    expect(ranked[0]?.item.regions).toContain("lip");
    expect(ranked.flatMap((entry) => entry.reasons.map((reason) => reason.en)).join(" ")).not.toMatch(/diagnosed|safe for your skin|suitability score/i);
  });

  it("does not treat default skin fields as user choices before onboarding", () => {
    const ranked = rankWatchItems(WATCH_ITEMS, { ...DEFAULT_BEAUTY_PROFILE, skinType: "dry", finish: "glossy" }, DEFAULT_WATCH_PREFERENCES);
    expect(ranked.flatMap((entry) => entry.reasons.map((reason) => reason.en)).join(" ")).not.toContain("dry skin");
  });

  it("recovers corrupt or unsupported persisted choices", () => {
    expect(parseWatchPreferences("broken")).toEqual(DEFAULT_WATCH_PREFERENCES);
    expect(parseWatchPreferences('{"status":"complete","interests":["face-inferred"],"creators":[]}')).toEqual(DEFAULT_WATCH_PREFERENCES);
  });

  it("filters unknown creator ids and de-duplicates chosen interests", () => {
    const result = parseWatchPreferences(JSON.stringify({ status: "complete", interests: ["lip", "lip"], creators: ["@iam.chae", "@invented"] }));
    expect(result.interests).toEqual(["lip"]);
    expect(result.creators).toEqual(["@iam.chae"]);
  });

  it("preserves deterministic order and does not mutate catalog input", () => {
    const ids = WATCH_ITEMS.map((item) => item.id);
    expect(rankWatchItems(WATCH_ITEMS, DEFAULT_BEAUTY_PROFILE, DEFAULT_WATCH_PREFERENCES).map((entry) => entry.item.id)).toEqual(rankWatchItems(WATCH_ITEMS, DEFAULT_BEAUTY_PROFILE, DEFAULT_WATCH_PREFERENCES).map((entry) => entry.item.id));
    expect(WATCH_ITEMS.map((item) => item.id)).toEqual(ids);
  });
});
