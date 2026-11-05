export type Locale = "en" | "vi" | "ko";
export type Localized = { readonly en: string; readonly vi: string; readonly ko: string };
export type Region = "skin" | "base" | "eye" | "cheek" | "lip";
export type BeautyProduct = {
  readonly id: string;
  readonly brand: string;
  readonly name: Localized;
  readonly image: string;
  readonly shades: readonly { readonly name: string; readonly color: string }[];
  readonly searchTerm: string;
  readonly category: Region;
};
export type BeautyStep = {
  readonly id: string;
  readonly label: Localized;
  readonly region: Region;
  readonly instruction: Localized;
  readonly start: number;
  readonly end: number;
  readonly productId: string;
  readonly match: "inspiration" | "verified";
};
export type BeautyMedia =
  | { readonly kind: "licensed"; readonly src: string; readonly sourceUrl: string; readonly credit: string; readonly license: string; readonly captions?: readonly { readonly src: string; readonly locale: Locale; readonly label: string }[] }
  | { readonly kind: "preview"; readonly sourceUrl?: string };
export type BeautyLook = {
  readonly id: string;
  readonly title: Localized;
  readonly subtitle: Localized;
  readonly image: string;
  readonly duration: string;
  readonly category: Region;
  readonly creator: string;
  readonly steps: readonly BeautyStep[];
  readonly media: BeautyMedia;
  readonly tags: readonly Localized[];
  readonly position?: string;
};
export function localize(value: Localized, locale: Locale): string {
  return value[locale];
}
export function translator(locale: Locale) {
  return (en: string, vi: string, ko: string): string => localize({ en, vi, ko }, locale);
}
export function merchantSearch(product: BeautyProduct, shade: string): string {
  const query = `${product.searchTerm} ${shade}`.trim();
  return `https://www.lazada.vn/catalog/?q=${encodeURIComponent(query)}`;
}
