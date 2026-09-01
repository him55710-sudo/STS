import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { classifyCommerceUrl } from "../commerce/url-policy";
import { createSupabaseServerClient } from "../supabase/server";
import type { Category } from "../types";

const catalogExactnessSchema = z.enum(["exact", "likely", "similar", "review", "unverified"]);
const categorySchema = z.enum(["fashion", "beauty", "interior", "tech", "lifestyle"]);
const lifecycleSchema = z.enum(["active", "stale", "quarantined"]);
const jsonArraySchema = z.array(z.unknown()).default([]);

const rawOfferSchema = z.object({
  id: z.string().trim().min(1),
  detail_url: z.string().trim().min(1),
  affiliate_url: z.string().trim().min(1).nullable(),
  exactness: catalogExactnessSchema,
  verified_detail_url: z.boolean(),
  verified: z.boolean(),
  images: jsonArraySchema,
  product: z.object({
    id: z.string().trim().min(1),
    canonical_sku: z.string().trim().min(1),
    brand: z.string().trim().min(1).nullable(),
    name: z.string().trim().min(1),
    merchant: z.string().trim().min(1),
    category: categorySchema,
    currency: z.string().trim().min(3).max(8),
    price: z.number().finite().nonnegative().nullable(),
    image_primary_url: z.string().trim().min(1).nullable(),
    image_alt_urls: jsonArraySchema,
    lifecycle: lifecycleSchema,
    source_identity_id: z.string().trim().min(1).nullable(),
    fallback_source_identity_id: z.string().trim().min(1).nullable(),
    source_identity_verified: z.boolean(),
  }),
  source_identity: z.object({
    id: z.string().trim().min(1),
    source_id: z.string().trim().min(1),
    source_product_id: z.string().trim().min(1),
    canonical_product_id: z.string().trim().min(1).nullable(),
    detail_url: z.string().trim().min(1),
    verified: z.boolean(),
    verified_detail_url: z.boolean(),
    source: z.object({ provider: z.string().trim().min(1) }),
  }),
});

export type PersistedCatalogOffer = {
  readonly id: string;
  readonly canonicalProductId: string;
  readonly canonicalSku: string;
  readonly sourceProvider: string;
  readonly sourceProductId: string;
  readonly brand: string | null;
  readonly name: string;
  readonly merchant: string;
  readonly category: Category;
  readonly currency: string;
  readonly price: number | null;
  readonly detailUrl: string;
  readonly affiliateUrl: string | null;
  readonly exactness: z.infer<typeof catalogExactnessSchema>;
  readonly images: readonly string[];
};

export interface PersistedCatalogOfferRepository {
  listOffers(): Promise<readonly PersistedCatalogOffer[]>;
}

const selectColumns = [
  "id",
  "detail_url",
  "affiliate_url",
  "exactness",
  "verified_detail_url",
  "verified",
  "images",
  "product:catalog_products!catalog_offers_product_id_fkey(id,canonical_sku,brand,name,merchant,category,currency,price,image_primary_url,image_alt_urls,lifecycle,source_identity_id,fallback_source_identity_id,source_identity_verified)",
  "source_identity:catalog_source_identities!catalog_offers_source_identity_id_fkey(id,source_id,source_product_id,canonical_product_id,detail_url,verified,verified_detail_url,source:catalog_sources!catalog_source_identities_source_id_fkey(provider))",
].join(",");

export function createSupabaseCatalogOfferRepository(): PersistedCatalogOfferRepository {
  return {
    async listOffers(): Promise<readonly PersistedCatalogOffer[]> {
      const supabase = await createCatalogReadClient();
      const result = await supabase.from("catalog_offers").select(selectColumns);
      if (result.error) throw result.error;
      return parsePersistedCatalogOffers(result.data);
    },
  };
}

async function createCatalogReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && serviceRoleKey) {
    return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return createSupabaseServerClient();
}

export function parsePersistedCatalogOffers(value: unknown): readonly PersistedCatalogOffer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const parsed = rawOfferSchema.safeParse(row);
    if (!parsed.success || !isCanonicalActiveOffer(parsed.data)) return [];
    return [toPersistedCatalogOffer(parsed.data)];
  });
}

export async function readPersistedCatalogOffers(
  repository: PersistedCatalogOfferRepository = createSupabaseCatalogOfferRepository()
): Promise<readonly PersistedCatalogOffer[]> {
  return repository.listOffers();
}

function isCanonicalActiveOffer(row: z.infer<typeof rawOfferSchema>): boolean {
  const detail = classifyCommerceUrl(row.detail_url);
  return row.product.lifecycle === "active"
    && row.source_identity.source.provider !== "fixture"
    && (row.product.source_identity_id === row.source_identity.id || row.product.fallback_source_identity_id === row.source_identity.id)
    && row.source_identity.canonical_product_id === row.product.id
    && row.source_identity.verified
    && row.product.source_identity_verified
    && row.verified
    && row.verified_detail_url
    && row.source_identity.verified_detail_url
    && row.source_identity.detail_url === row.detail_url
    && detail.kind === "detail";
}

function toPersistedCatalogOffer(row: z.infer<typeof rawOfferSchema>): PersistedCatalogOffer {
  const imageValues = [...row.images, row.product.image_primary_url, ...row.product.image_alt_urls];
  const images = imageValues.flatMap((value) => typeof value === "string" && value.trim().length > 0 ? [value] : []);
  return {
    id: row.id,
    canonicalProductId: row.product.id,
    canonicalSku: row.product.canonical_sku,
    sourceProvider: row.source_identity.source.provider,
    sourceProductId: row.source_identity.source_product_id,
    brand: row.product.brand,
    name: row.product.name,
    merchant: row.product.merchant,
    category: row.product.category,
    currency: row.product.currency,
    price: row.product.price,
    detailUrl: row.detail_url,
    affiliateUrl: row.affiliate_url,
    exactness: row.exactness,
    images: [...new Set(images)],
  };
}
