import { describe, expect, it } from "vitest";
import { getCreatorSegments, getReviewedSteps, parseCreatorLibrary } from "@/lib/beauty-commerce/tiktok";

const original = { url: "https://www.tiktok.com/@iam.chae/video/7310866363613039874", title: "Daily routine", author: "@iam.chae", caption: "", timestamps: "", captionOrigin: "indexed-source", titleOrigin: "indexed-source" };

describe("reviewed routine evidence", () => {
  it("upgrades an untouched saved source with reviewed phases while preserving intentional gaps", () => {
    const record = parseCreatorLibrary(JSON.stringify([original]))[0];
    if (!record) throw new Error("The original source must resolve");
    const segments = getCreatorSegments(record);
    expect(getReviewedSteps(record)).toHaveLength(8);
    expect(segments.some((segment) => segment.start <= 45 && segment.end !== null && segment.end > 45)).toBe(false);
    expect(segments.find((segment) => segment.start === 64)?.end).toBe(69);
  });

  it("preserves a visitor's own notes without upgrading them into reviewed claims", () => {
    const record = parseCreatorLibrary(JSON.stringify([{ ...original, timestamps: "00:03 My own step", captionOrigin: "manual" }]))[0];
    if (!record) throw new Error("The saved source must resolve");
    expect(record.timestamps).toBe("00:03 My own step");
    expect(getReviewedSteps(record)).toEqual([]);
    expect(getCreatorSegments(record)[0]?.start).toBe(3);
  });

  it("requires the exact reviewed markers before showing a reviewed badge", () => {
    const record = parseCreatorLibrary(JSON.stringify([{ ...original, timestamps: "00:02 Unreviewed", timestampOrigin: "reviewed" }]))[0];
    if (!record) throw new Error("The saved source must resolve");
    expect(getReviewedSteps(record)).toEqual([]);
  });
});
