import type { Category } from "../types";
import type { CanonicalProduct } from "./types";

const KNOWN_BRANDS = [
  "Polo Ralph Lauren",
  "Ralph Lauren",
  "Nike",
  "Adidas",
  "New Balance",
  "Uniqlo",
  "Zara",
  "COS",
  "Musinsa Standard",
  "나이키",
  "아디다스",
] as const;

const COLOR_ALIASES = [
  { canonical: "sky blue", values: ["sky blue", "skyblue", "스카이블루", "하늘색"] },
  { canonical: "light blue", values: ["light blue", "lightblue", "라이트블루", "연청", "연한 파랑"] },
  { canonical: "blue", values: ["blue", "블루", "파랑", "파란색"] },
  { canonical: "navy", values: ["navy", "네이비"] },
  { canonical: "gray", values: ["gray", "grey", "그레이", "회색", "차콜"] },
  { canonical: "black", values: ["black", "블랙", "검정", "검은색"] },
  { canonical: "white", values: ["white", "화이트", "흰색"] },
] as const;

export function queryCanonical(
  category: string | undefined,
  productName: string,
  canonicalClass?: string
): CanonicalProduct {
  const identityText = [productName, canonicalClass].filter(Boolean).join(" ");
  const brand = KNOWN_BRANDS.find((value) => includesToken(identityText, value)) ?? null;
  const color = COLOR_ALIASES.find((group) => group.values.some((value) => includesToken(identityText, value)))?.canonical ?? null;
  const normalized = compact(productName);

  return {
    id: `query:${normalized}`,
    brand,
    productName,
    category: categoryValue(category),
    sourceIdentity: null,
    sku: null,
    model: null,
    gtin: null,
    attributes: { productLine: canonicalClass ?? productName, color, size: null, volume: null },
    identifiers: [],
    aliases: [productName, ...(canonicalClass ? [canonicalClass] : [])],
    referenceImages: [],
  };
}

function categoryValue(value: string | undefined): Category {
  switch (value) {
    case "fashion":
    case "beauty":
    case "interior":
    case "tech":
    case "lifestyle":
      return value;
    default:
      return "lifestyle";
  }
}

function includesToken(value: string, token: string): boolean {
  return compact(value).includes(compact(token));
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}
