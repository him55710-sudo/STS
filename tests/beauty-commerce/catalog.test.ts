import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEAUTY_LOOKS, BEAUTY_PRODUCTS, getLook, getProduct } from "@/lib/beauty-commerce/catalog";
import { merchantSearch } from "@/lib/beauty-commerce/types";
import { parseBeautyPreferences } from "@/lib/beauty-commerce/context";

describe("beauty editorial catalog", () => {
  it("offers distinct localized looks with valid step and product relationships", () => {
    // Given: the curated launch catalog.
    const looks = BEAUTY_LOOKS;
    // When: a visitor browses available looks.
    const ids = new Set(looks.map((look) => look.id));
    // Then: every look is usable without inventing verified product matches.
    expect(looks.length).toBeGreaterThanOrEqual(5);
    expect(ids.size).toBe(looks.length);
    for (const look of looks) {
      expect(look.title.vi.length).toBeGreaterThan(0);
      expect(look.title.ko.length).toBeGreaterThan(0);
      expect(look.title.en.length).toBeGreaterThan(0);
      expect(look.subtitle.en.length).toBeGreaterThan(0);
      expect(existsSync(join(process.cwd(), "public", look.image))).toBe(true);
      expect(getLook(look.id)).toBe(look);
      expect(look.steps.length).toBeGreaterThan(0);
      for (const step of look.steps) {
        expect(getProduct(step.productId)).toBeDefined();
        expect(step.end).toBeGreaterThan(step.start);
        expect(step.match).toBe("inspiration");
        expect(step.label.en.length).toBeGreaterThan(0);
        expect(step.instruction.en.length).toBeGreaterThan(0);
      }
    }
  });

  it("provides real local product imagery and no invented prices", () => {
    // Given: the editorial product selection.
    const products = BEAUTY_PRODUCTS;
    // When: product information is displayed.
    const ids = new Set(products.map((product) => product.id));
    // Then: images and option data exist, while commercial data is not fabricated.
    expect(products.length).toBeGreaterThanOrEqual(6);
    expect(ids.size).toBe(products.length);
    for (const product of products) {
      expect(existsSync(join(process.cwd(), "public", product.image))).toBe(true);
      expect(product.shades.length).toBeGreaterThan(0);
      expect(product).not.toHaveProperty("price");
    }
  });

  it("encodes product and shade into a labeled merchant search destination", () => {
    // Given: a product containing punctuation and a shade with spaces.
    const product = BEAUTY_PRODUCTS.find((item) => item.id === "romand-tint");
    if (!product) throw new Error("The launch catalog must contain romand-tint");
    // When: a visitor chooses a shade and searches a Vietnam merchant.
    const destination = new URL(merchantSearch(product, "#23 Nucadamia"));
    // Then: the query retains the entire product/shade and no affiliate claim.
    expect(destination.hostname).toBe("www.lazada.vn");
    expect(destination.searchParams.get("q")).toBe(`${product.searchTerm} #23 Nucadamia`);
    expect([...destination.searchParams.keys()]).toEqual(["q"]);
  });

  it("returns no result for stale or unknown look and product identifiers", () => {
    // Given: identifiers absent from the catalog.
    const unknown = "deleted-content";
    // When: a stale saved link is resolved.
    const resolved = [getLook(unknown), getProduct(unknown)];
    // Then: the caller can render its unavailable state.
    expect(resolved).toEqual([undefined, undefined]);
  });
});

describe("persisted beauty preferences boundary", () => {
  it.each([null, "{broken", "null", "[]", '{"locale":"fr","savedLookIds":[],"savedProductIds":[]}', '{"locale":"vi","savedLookIds":"glow-lip","savedProductIds":[]}'])("recovers default preferences when stored input is absent or invalid: %s", (raw) => {
    // Given: absent, corrupted or unsupported stored data.
    // When: the app restores a visitor's preferences.
    const preferences = parseBeautyPreferences(raw);
    // Then: the first render remains usable with English defaults.
    expect(preferences).toEqual({ locale: "en", localeVersion: 2, savedLookIds: [], savedProductIds: [], selectedShades: {} });
  });

  it("restores the selected locale and deduplicates only currently resolvable saved items", () => {
    // Given: a saved selection containing duplicate and stale catalog identifiers.
    const raw = JSON.stringify({ locale: "ko", localeVersion: 2, savedLookIds: ["glow-lip", "glow-lip", "old-look"], savedProductIds: ["romand-tint", "old-product", "romand-tint"] });
    // When: that selection crosses the storage boundary.
    const preferences = parseBeautyPreferences(raw);
    // Then: known selections survive once and missing content is safely omitted.
    expect(preferences).toEqual({ locale: "ko", localeVersion: 2, savedLookIds: ["glow-lip"], savedProductIds: ["romand-tint"], selectedShades: {} });
  });

  it("restores a selected shade before the product has been saved", () => {
    // Given: a visitor selected a supported shade without bookmarking it.
    const raw = JSON.stringify({ locale: "vi", savedLookIds: [], savedProductIds: [], selectedShades: { "romand-tint": "#25 Bare Grape" } });
    // When: preferences are restored after reopening the page.
    const preferences = parseBeautyPreferences(raw);
    // Then: the chosen option survives independently of bookmarks.
    expect(preferences.selectedShades).toEqual({ "romand-tint": "#25 Bare Grape" });
    expect(preferences.savedProductIds).toEqual([]);
  });

  it("omits unknown products and invalid shades while retaining valid selections", () => {
    // Given: persisted options include a valid shade, a mismatched shade and an unknown product.
    const raw = JSON.stringify({ locale: "ko", savedLookIds: ["glow-lip"], savedProductIds: ["romand-tint"], selectedShades: { "romand-tint": "#22 Pomelo Skin", "clio-cushion": "#25 Bare Grape", "old-product": "Rose Beige" } });
    // When: those options cross the storage boundary.
    const preferences = parseBeautyPreferences(raw);
    // Then: only an option belonging to its actual catalog product is restored.
    expect(preferences.selectedShades).toEqual({ "romand-tint": "#22 Pomelo Skin" });
    expect(preferences.savedProductIds).toEqual(["romand-tint"]);
  });

  it("retains selected shades through the persisted JSON round trip", () => {
    // Given: saved preferences contain valid options for two products.
    const original = { locale: "ko", localeVersion: 2, savedLookIds: ["glow-lip"], savedProductIds: ["romand-tint", "clio-cushion"], selectedShades: { "romand-tint": "#23 Nucadamia", "clio-cushion": "04 Ginger" } };
    // When: the store serializes and subsequently restores that state.
    const restored = parseBeautyPreferences(JSON.stringify(parseBeautyPreferences(JSON.stringify(original))));
    // Then: both exact option names remain selected.
    expect(restored).toEqual(original);
  });

  it("migrates an earlier Vietnamese default to English while preserving saved content and shade", () => {
    // Given: preferences written before the visitor had an English-language option.
    const oldPreferences = { locale: "vi", savedLookIds: ["glow-lip"], savedProductIds: ["romand-tint"], selectedShades: { "romand-tint": "#25 Bare Grape" } };
    // When: the updated service restores that payload.
    const migrated = parseBeautyPreferences(JSON.stringify(oldPreferences));
    // Then: only the initial language preference changes; the visitor's collection survives.
    expect(migrated).toEqual({ ...oldPreferences, locale: "en", localeVersion: 2 });
  });

  it.each(["en", "ko", "vi"])("preserves an explicit new %s language choice across stored round trips", (locale) => {
    // Given: the updated language selector wrote its versioned preference.
    const chosen = { locale, localeVersion: 2, savedLookIds: [], savedProductIds: [], selectedShades: {} };
    // When: the visitor reopens the service.
    const restored = parseBeautyPreferences(JSON.stringify(chosen));
    // Then: English defaults do not override the visitor's explicit choice.
    expect(restored).toEqual(chosen);
  });
});
