import { z } from "zod";
import { classifyCommerceUrl } from "../commerce/url-policy";
import type { ImageVariant } from "../commerce/types";
import type { Category } from "../types";
import type {
  CatalogRow,
  CatalogRowError,
  CatalogRowErrorCode,
  CatalogStockStatus,
  FixtureRecord,
} from "./types";

const categorySchema = z.enum(["fashion", "beauty", "interior", "tech", "lifestyle"]);
const recordSchema = z.record(z.string(), z.unknown());

const categoryAliases = {
  패션: "fashion",
  뷰티: "beauty",
  인테리어: "interior",
  테크: "tech",
  라이프스타일: "lifestyle",
} as const;

const brandAliases = {
  "폴로 랄프로렌": "Polo Ralph Lauren",
  "폴로 랄프 로렌": "Polo Ralph Lauren",
  "polo ralph lauren": "Polo Ralph Lauren",
  아디다스: "Adidas",
  adidas: "Adidas",
  나이키: "Nike",
  nike: "Nike",
} as const;

type ParsedNumber = { readonly kind: "missing" | "invalid" | "valid"; readonly value: number | null };
type ImageResult =
  | { readonly kind: "missing" }
  | { readonly kind: "invalid" }
  | { readonly kind: "valid"; readonly images: readonly string[] };
type NormalizedRow =
  | { readonly kind: "accepted"; readonly row: CatalogRow }
  | { readonly kind: "quarantine"; readonly error: CatalogRowError };

export function normalizeFixtureRow(source: string, record: unknown, rowNumber: number): NormalizedRow {
  const parsed = recordSchema.safeParse(record);
  if (!parsed.success) return { kind: "quarantine", error: errorAt(rowNumber, "malformed_row", null, "fixture row must be an object") };
  const input = parsed.data;
  const sourceProductId = readText(input, "sourceProductId");
  if (!sourceProductId) return { kind: "quarantine", error: errorAt(rowNumber, "missing_source_product_id", "sourceProductId", "source product ID is required") };
  const title = readText(input, "title");
  if (!title) return { kind: "quarantine", error: errorAt(rowNumber, "missing_title", "title", "title is required") };
  const merchant = readText(input, "merchant");
  if (!merchant) return { kind: "quarantine", error: errorAt(rowNumber, "missing_merchant", "merchant", "merchant is required") };
  const detailUrl = readText(input, "detailUrl");
  if (!detailUrl) return { kind: "quarantine", error: errorAt(rowNumber, "missing_detail_url", "detailUrl", "direct detail URL is required") };
  const classification = classifyCommerceUrl(detailUrl);
  if (classification.kind === "discovery") return { kind: "quarantine", error: errorAt(rowNumber, "search_url", "detailUrl", "search URLs cannot be catalog detail URLs") };
  if (classification.kind !== "detail") return { kind: "quarantine", error: errorAt(rowNumber, "invalid_detail_url", "detailUrl", "detail URL must be a valid HTTPS product URL") };

  const imageResult = normalizeImages(input["images"] ?? input["image"]);
  if (imageResult.kind === "missing") return { kind: "quarantine", error: errorAt(rowNumber, "missing_images", "images", "at least one product image is required") };
  if (imageResult.kind === "invalid") return { kind: "quarantine", error: errorAt(rowNumber, "invalid_images", "images", "product images must be valid HTTP(S) URLs") };
  const category = normalizeCategory(readText(input, "category"));
  if (!category) return { kind: "quarantine", error: errorAt(rowNumber, readText(input, "category") ? "invalid_category" : "missing_category", "category", "category is invalid or missing") };
  const price = parseNumber(input["price"]);
  if (price.kind === "invalid") return { kind: "quarantine", error: errorAt(rowNumber, "invalid_price", "price", "price must be a non-negative number") };

  const images = imageResult.images;
  const imageVariants: ImageVariant[] = images.map((url, index) => ({ kind: index === 0 ? "primary" : "alternate", url }));
  const stock = normalizeStock(input["stock"] ?? input["availability"]);
  return {
    kind: "accepted",
    row: {
      source,
      sourceProductId,
      sourceIdentity: { source, sourceProductId },
      brand: normalizeBrand(readText(input, "brand")),
      title,
      merchant,
      variant: readText(input, "variant"),
      category,
      price: price.value,
      currency: readText(input, "currency")?.toUpperCase() ?? null,
      stock,
      availability: stock,
      sku: readText(input, "sku"),
      model: readText(input, "model") ?? readText(input, "modelNumber"),
      gtin: readText(input, "gtin") ?? readText(input, "ean") ?? readText(input, "upc"),
      detailUrl: classification.url,
      affiliateUrl: normalizeHttpUrl(readText(input, "affiliateUrl")),
      images,
      imageVariants,
    },
  };
}

function normalizeCategory(value: string | null): Category | null {
  if (!value) return null;
  const alias = Object.entries(categoryAliases).find(([key]) => key === value)?.[1] ?? value.toLowerCase();
  const parsed = categorySchema.safeParse(alias);
  return parsed.success ? parsed.data : null;
}

function normalizeBrand(value: string | null): string | null {
  if (!value) return null;
  return Object.entries(brandAliases).find(([key]) => key === value || key === value.toLowerCase())?.[1] ?? value;
}

function normalizeImages(value: unknown): ImageResult {
  if (value === undefined || value === null || (typeof value === "string" && !cleanText(value))) return { kind: "missing" };
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[;|]/) : null;
  if (!values) return { kind: "invalid" };
  const images: string[] = [];
  for (const item of values) {
    if (typeof item !== "string") return { kind: "invalid" };
    const normalized = normalizeHttpUrl(item);
    if (!normalized) return { kind: "invalid" };
    if (!images.includes(normalized)) images.push(normalized);
  }
  return images.length > 0 ? { kind: "valid", images } : { kind: "missing" };
}

function parseNumber(value: unknown): ParsedNumber {
  if (value === undefined || value === null || (typeof value === "string" && !cleanText(value))) return { kind: "missing", value: null };
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? { kind: "valid", value } : { kind: "invalid", value: null };
  if (typeof value !== "string") return { kind: "invalid", value: null };
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? { kind: "valid", value: parsed } : { kind: "invalid", value: null };
}

function normalizeStock(value: unknown): CatalogStockStatus {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (/(out|sold|unavailable|품절)/.test(normalized)) return "out_of_stock";
  if (/(in.?stock|available|재고|판매중)/.test(normalized)) return "in_stock";
  return "unknown";
}

function normalizeHttpUrl(value: string | null): string | null {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
}

function readText(record: FixtureRecord, key: string): string | null {
  const value = record[key];
  if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) return cleanText(String(value));
  return null;
}

function cleanText(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || null;
}

function errorAt(rowNumber: number, code: CatalogRowErrorCode, field: string | null, message: string): CatalogRowError {
  return { kind: "quarantine", rowNumber, code, field, message };
}
