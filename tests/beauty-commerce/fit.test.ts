import { describe, expect, it } from "vitest";
import { BEAUTY_PRODUCTS } from "@/lib/beauty-commerce/catalog";
import { assessProductFit, DEFAULT_BEAUTY_PROFILE, parsePersonalProfile } from "@/lib/beauty-commerce/fit";

describe("personal product comparisons", () => {
  it("explains the tradeoff when a fragrance-avoiding user considers a scented tint", () => {
    const product = BEAUTY_PRODUCTS.find((item) => item.id === "romand-tint");
    if (!product) throw new Error("Tint fixture missing");
    const comparison = assessProductFit(product, { ...DEFAULT_BEAUTY_PROFILE, fragrance: "avoid" });
    expect(comparison.kind).toBe("tradeoff");
    expect(comparison.sourceUrl).toBe("https://romandbeauty.com/products/juicy-lasting-tint");
    expect(comparison.reasons.some((reason) => /scent/i.test(reason.en))).toBe(true);
  });
  it("recognizes a glossy finish preference without promising skin compatibility", () => {
    const product = BEAUTY_PRODUCTS.find((item) => item.id === "romand-tint");
    if (!product) throw new Error("Tint fixture missing");
    const comparison = assessProductFit(product, { ...DEFAULT_BEAUTY_PROFILE, finish: "glossy" });
    expect(comparison.kind).toBe("aligned");
    expect(comparison.reasons.some((reason) => /gloss/i.test(reason.en))).toBe(true);
  });
  it("keeps products without verified feature information in review", () => {
    const product = BEAUTY_PRODUCTS.find((item) => item.id === "clio-cushion");
    if (!product) throw new Error("Cushion fixture missing");
    const comparison = assessProductFit(product, { ...DEFAULT_BEAUTY_PROFILE, skinType: "oily" });
    expect(comparison.kind).toBe("review");
    expect(comparison.sourceUrl).toBeNull();
    expect(comparison.reasons.length).toBeGreaterThan(0);
  });
  it("uses hydration evidence for dry-skin routine comparison", () => {
    const product = BEAUTY_PRODUCTS.find((item) => item.id === "torriden-serum");
    if (!product) throw new Error("Serum fixture missing");
    const comparison = assessProductFit(product, { ...DEFAULT_BEAUTY_PROFILE, skinType: "dry" });
    expect(comparison.kind).toBe("aligned");
    expect(comparison.sourceUrl).toBe("https://torriden.us/products/dive-in-serum");
  });
  it("recovers malformed preferences without guessing personal skin characteristics", () => {
    expect(parsePersonalProfile('{"skinType":"diagnosed-by-photo"}')).toEqual(DEFAULT_BEAUTY_PROFILE);
    expect(parsePersonalProfile("broken").skinType).toBe("unsure");
  });
});
