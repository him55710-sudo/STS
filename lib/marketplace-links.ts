import type { Product } from "./types";

export type MarketplaceId = "naver" | "musinsa" | "coupang";

export type MarketplaceLink = {
  readonly marketplace: MarketplaceId;
  readonly label: string;
  readonly url: string;
  readonly kind: "detail" | "search";
  readonly verified: boolean;
};

const listingPath = /\/(search|list|category|categor|ranking|best|event|plan)(\/|$)/i;
const listingQuery = /(^|&)(keyword|query|q|search|searchWord)=/i;
const detailPath = /\/(products?|goods|item|detail|dp|vp\/products|app\/goods)\/[-\w]+/i;

export function isMarketplaceDetailUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (listingPath.test(url.pathname) || listingQuery.test(url.search.slice(1))) return false;
    if (url.hostname.includes("musinsa.com")) return /\/products\/\d+/i.test(url.pathname);
    if (url.hostname.includes("coupang.com")) return /\/vp\/products\/\d+/i.test(url.pathname);
    if (url.hostname.includes("naver.com")) {
      return /\/(products|catalog)\/[-\w]+/i.test(url.pathname);
    }
    return detailPath.test(url.pathname);
  } catch {
    return false;
  }
}

export function marketplaceForUrl(value: string): MarketplaceId | null {
  try {
    const host = new URL(value).hostname;
    if (host.includes("musinsa.com")) return "musinsa";
    if (host.includes("coupang.com")) return "coupang";
    if (host.includes("naver.com")) return "naver";
    return null;
  } catch {
    return null;
  }
}

export function buildMarketplaceSearchLinks(product: Pick<Product, "brand" | "name">): MarketplaceLink[] {
  const query = `${product.brand} ${product.name}`.trim();
  return [
    {
      marketplace: "naver",
      label: "네이버 쇼핑 검색",
      url: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`,
      kind: "search",
      verified: false,
    },
    {
      marketplace: "musinsa",
      label: "무신사 검색",
      url: `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(query)}`,
      kind: "search",
      verified: false,
    },
    {
      marketplace: "coupang",
      label: "쿠팡 검색",
      url: `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`,
      kind: "search",
      verified: false,
    },
  ];
}

export function productMarketplaceLinks(product: Product): MarketplaceLink[] {
  const links = buildMarketplaceSearchLinks(product);
  if (!isMarketplaceDetailUrl(product.url)) return links;
  const marketplace = marketplaceForUrl(product.url);
  if (!marketplace) return links;
  return [
    {
      marketplace,
      label: `${product.retailer} 상품 상세`,
      url: product.url,
      kind: "detail",
      verified: true,
    },
    ...links.filter((link) => link.marketplace !== marketplace),
  ];
}
