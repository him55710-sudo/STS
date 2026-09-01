import type { AliExpressImage } from "../affiliate/aliexpress";
import { categoryToAliImageCategory, isAliExpressConfigured, searchAliExpressByImage } from "../affiliate/aliexpress";
import { isAdpickConfigured, searchAdpickProducts } from "../affiliate/adpick";
import type { CanonicalProduct } from "../commerce/types";
import { isSovrnConfigured, searchSovrnPriceComparisons } from "../commerce/providers/sovrn";
import type { ProviderResult } from "../commerce/providers/types";
import { isNaverConfigured } from "../naver/api-hub";
import { searchNaverProducts, type NaverWebCandidate } from "../naver/product-provider";
import { providerChain } from "../llm";
import { searchViaLlm, type WebCandidate } from "./web-candidates";
import type {
  ProductDiscoveryProvider,
  ProductDiscoveryQuery,
  RawProductCandidate,
} from "./discovery-types";

type DiscoveryProviderOptions = {
  readonly canonical: CanonicalProduct;
  readonly aliImage: AliExpressImage | null;
};

export function createProductDiscoveryProviders(
  options: DiscoveryProviderOptions
): readonly ProductDiscoveryProvider[] {
  const providers: ProductDiscoveryProvider[] = [];
  if (isNaverConfigured()) providers.push(naverProvider);
  if (isAdpickConfigured()) providers.push(adpickProvider);
  if (isAliExpressConfigured() && options.aliImage) {
    providers.push(createAliExpressProvider(options.aliImage));
  }
  if (providerChain().length > 0) providers.push(llmProvider);
  if (isSovrnConfigured()) providers.push(createSovrnProvider(options.canonical));
  return providers;
}

const naverProvider: ProductDiscoveryProvider = {
  id: "naver",
  sourceType: "korean_commerce",
  search: async (query) => (await searchNaverProducts([...query.searchQueries])).map((candidate) => fromWeb(candidate, "naver", "korean_commerce")),
};

const adpickProvider: ProductDiscoveryProvider = {
  id: "adpick",
  sourceType: "korean_commerce",
  search: async (query) => {
    const firstQuery = query.searchQueries[0];
    if (!firstQuery) return [];
    return (await searchAdpickProducts(firstQuery)).map((candidate, index) => ({
      ...emptyRaw("adpick", "korean_commerce", candidate.title),
      merchant: candidate.retailer,
      productId: `adpick-${index}`,
      searchUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(candidate.title)}`,
      imageUrls: candidate.imageUrl ? [candidate.imageUrl] : [],
      primaryImageUrl: candidate.imageUrl,
      imageAvailable: candidate.imageUrl !== null,
      price: candidate.price,
      currency: "KRW",
      rawMetadata: { commissionUrl: candidate.commissionUrl, commissionRate: candidate.commissionRate },
    }));
  },
};

const llmProvider: ProductDiscoveryProvider = {
  id: "grounded-web",
  sourceType: "grounded_web",
  search: async (query) => (await searchViaLlm(query.searchQueries)).map((candidate) => fromWeb(candidate, "grounded-web", "grounded_web")),
};

function createAliExpressProvider(image: AliExpressImage): ProductDiscoveryProvider {
  return {
    id: "aliexpress",
    sourceType: "additional_commerce",
    search: async (query) => {
      const products = await searchAliExpressByImage({
        image,
        categoryHint: categoryToAliImageCategory(String(query.category), query.canonicalClass),
        limit: 20,
      });
      return products.map((product) => ({
        ...emptyRaw("aliexpress", "additional_commerce", product.title),
        merchantProductId: product.id,
        productDetailUrl: product.detailUrl,
        imageUrls: product.imageUrl ? [product.imageUrl] : [],
        primaryImageUrl: product.imageUrl,
        imageAvailable: product.imageUrl !== null,
        price: product.price,
        currency: product.currency,
        category: product.category,
        rawMetadata: { promotionUrl: product.promotionUrl, commissionRate: product.commissionRate },
      }));
    },
  };
}

function createSovrnProvider(canonical: CanonicalProduct): ProductDiscoveryProvider {
  return {
    id: "sovrn",
    sourceType: "additional_commerce",
    search: async (query) => {
      const result: ProviderResult = await searchSovrnPriceComparisons({
        canonical,
        keywords: [...query.searchQueries],
      });
      return result.offers.flatMap((offer) => offer.detailUrl ? [{
        ...emptyRaw("sovrn", "additional_commerce", offer.title),
        merchant: offer.merchant,
        merchantProductId: offer.providerProductId ?? null,
        productDetailUrl: offer.detailUrl,
        imageUrls: offer.imageUrl ? [offer.imageUrl] : [],
        primaryImageUrl: offer.imageUrl,
        imageAvailable: offer.imageUrl !== null,
        price: offer.price,
        currency: offer.currency,
        rawMetadata: { providerOfferId: offer.id, commissionRate: offer.commissionRate },
      }] : []);
    },
  };
}

function fromWeb(
  candidate: NaverWebCandidate | WebCandidate,
  provider: string,
  sourceType: "korean_commerce" | "grounded_web"
): RawProductCandidate {
  const detailUrl = candidate.detailUrl;
  const searchUrl = candidate.discoveryUrl ?? (detailUrl ? null : candidate.url);
  return {
    ...emptyRaw(provider, sourceType, candidate.productName),
    merchant: candidate.retailer,
    productId: candidate.id,
    brand: candidate.brand,
    category: candidate.category,
    color: candidate.color,
    productDetailUrl: detailUrl,
    searchUrl,
    imageUrls: candidate.imageUrls,
    primaryImageUrl: candidate.imageUrls[0] ?? null,
    imageAvailable: candidate.imageUrls.length > 0,
    price: candidate.price.value,
    currency: candidate.price.currency,
    sourceConfidence: candidate.pageTrust ?? null,
    rawMetadata: {
      source: candidate.source,
      sourceUrl: candidate.sourceUrl ?? null,
    },
  };
}

function emptyRaw(
  provider: string,
  sourceType: "korean_commerce" | "additional_commerce" | "grounded_web",
  title: string
): RawProductCandidate {
  return {
    provider,
    sourceType,
    merchant: "알 수 없는 판매처",
    merchantProductId: null,
    productId: null,
    title,
    brand: null,
    canonicalClass: null,
    category: null,
    color: null,
    modelName: null,
    modelCode: null,
    sku: null,
    gtin: null,
    ean: null,
    upc: null,
    productDetailUrl: null,
    searchUrl: null,
    imageUrls: [],
    primaryImageUrl: null,
    imageAvailable: false,
    price: null,
    currency: null,
    rawMetadata: {},
    sourceConfidence: null,
  };
}
