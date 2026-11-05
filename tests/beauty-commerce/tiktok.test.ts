import { describe, expect, it } from "vitest";
import { analyzeCreatorCaption, normalizeTikTokUrl, parseTimestampLines, parseCreatorLibrary, parsePlayerMessage } from "@/lib/beauty-commerce/tiktok";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/beauty/tiktok/route";

const source = "https://www.tiktok.com/@creator.name/video/7421123456789012345";

describe("TikTok creator evidence", () => {
  it("normalizes a supported source while discarding tracking parameters", () => {
    const result = normalizeTikTokUrl(`${source}?lang=ko&tracking=x#comment`);
    expect(result).toEqual({ url: source, handle: "creator.name", videoId: "7421123456789012345", embedUrl: "https://www.tiktok.com/player/v1/7421123456789012345?description=1&music_info=1&controls=1" });
  });

  it.each([
    "http://www.tiktok.com/@creator/video/7421123456789012345",
    "https://www.tiktok.com.evil.test/@creator/video/7421123456789012345",
    "https://www.tiktok.com@evil.test/@creator/video/7421123456789012345",
    "https://evil.test/?url=https://www.tiktok.com/@creator/video/7421123456789012345",
    "https://www.tiktok.com:8443/@creator/video/7421123456789012345",
    "https://www.tiktok.com/@creator/video/123",
    "https://www.tiktok.com/@creator/video/0000000000000000000",
    "javascript:alert(1)",
    "https://www.tiktok.com/@creator/video/7421123456789012345/other",
  ])("rejects unsupported or injected source %s", (value) => {
    expect(normalizeTikTokUrl(value)).toBeNull();
  });

  it("distinguishes named products from brand-only evidence", () => {
    const result = analyzeCreatorCaption("오늘 립: 롬앤 쥬시 래스팅 틴트 #23\n베이스는 CLIO 제품입니다.");
    expect(result.find((item) => item.productId === "romand-tint")?.strength).toBe("product-name-mentioned");
    expect(result.find((item) => item.productId === "clio-cushion")?.strength).toBe("brand-only");
    expect(result.find((item) => item.productId === "romand-tint")?.excerpt).toContain("쥬시 래스팅 틴트");
  });

  it("does not infer an unnamed product from makeup words or skin concerns", () => {
    expect(analyzeCreatorCaption("Lipstick, serum, highlighter. Good for dry skin?")).toEqual([]);
  });

  it("does not match a brand embedded inside a different Latin word", () => {
    expect(analyzeCreatorCaption("This is a precliomakeup routine.")).toEqual([]);
  });

  it("extracts ordered manual segments without inventing the last end", () => {
    const result = parseTimestampLines("0:00 Skin prep\n00:12 Base\n01:05 Lips");
    expect(result.errors).toEqual([]);
    expect(result.segments).toEqual([{ start: 0, end: 12, label: "Skin prep" }, { start: 12, end: 65, label: "Base" }, { start: 65, end: null, label: "Lips" }]);
  });

  it("reports malformed and out-of-order timestamps", () => {
    const result = parseTimestampLines("00:10 Base\n00:05 Prep\n00:60 Lip\nnot a timestamp");
    expect(result.errors.map((item) => item.line)).toEqual([2, 3, 4]);
  });

  it("recovers corrupt saved data and rejects malicious saved sources", () => {
    expect(parseCreatorLibrary("broken-json")).toEqual([]);
    expect(parseCreatorLibrary(JSON.stringify([{ url: "https://evil.test", caption: "", timestamps: "", title: "", author: "" }]))).toEqual([]);
  });

  it("parses expected player envelopes and rejects malformed times", () => {
    expect(parsePlayerMessage({ "x-tiktok-player": true, type: "onCurrentTime", value: { currentTime: 4.5, duration: 20 } })).toEqual({ kind: "time", currentTime: 4.5, duration: 20 });
    expect(parsePlayerMessage({ type: "onPlayerReady" })).toBeNull();
    expect(parsePlayerMessage({ "x-tiktok-player": true, type: "onCurrentTime", value: { currentTime: "evil", duration: 20 } })).toBeNull();
  });

  it("rejects an SSRF destination at the real HTTP boundary", async () => {
    const request = new NextRequest("http://localhost/api/beauty/tiktok", { method: "POST", body: JSON.stringify({ url: "http://127.0.0.1/private" }), headers: { "Content-Type": "application/json" } });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("accepts bounded serialized player messages while ignoring SDK noise and oversized data", () => {
    expect(parsePlayerMessage(JSON.stringify({ "x-tiktok-player": true, type: "onPlayerReady" }))).toEqual({ kind: "ready" });
    expect(parsePlayerMessage("[tea-sdk]ready")).toBeNull();
    expect(parsePlayerMessage("{".repeat(4_097))).toBeNull();
  });

  it("rejects an oversized streaming body without trusting content-length", async () => {
    const request = new NextRequest("http://localhost/api/beauty/tiktok", { method: "POST", body: JSON.stringify({ url: "x".repeat(3_000) }), headers: { "Content-Type": "application/json" } });
    const response = await POST(request);
    expect(response.status).toBe(413);
  });
});
