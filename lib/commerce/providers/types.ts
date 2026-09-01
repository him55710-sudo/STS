import type { CanonicalProduct, CommerceOffer } from "../types";

export type ProviderSearchInput = {
  readonly canonical: CanonicalProduct;
  readonly keywords: readonly string[];
  readonly plainlink?: string;
  readonly barcode?: string;
  readonly market?: string;
  readonly trackingId?: string;
};

export type ProviderResult =
  | { readonly kind: "disabled"; readonly provider: string; readonly offers: readonly CommerceOffer[]; readonly reason: string }
  | { readonly kind: "success"; readonly provider: string; readonly offers: readonly CommerceOffer[] }
  | { readonly kind: "error"; readonly provider: string; readonly offers: readonly CommerceOffer[]; readonly reason: string };

export interface CommerceProvider {
  readonly name: string;
  search(input: ProviderSearchInput): Promise<ProviderResult>;
  createAffiliateLink(destinationUrl: string, trackingId?: string): string | null;
}
