import { z } from "zod";

export const REPOSITORY_FEED_SELECT = [
  "id",
  "creator_id",
  "creator_key",
  "caption",
  "category",
  "content_kind",
  "published_at",
  "created_at",
  "disclosure",
  "is_demo",
  "content_sources(id, source_kind, provider, canonical_url, external_id)",
  "content_rights(rights_status, license_scope, can_display, can_use_for_commerce_matching, can_redistribute, rights_evidence_url, expires_at)",
  "media_assets(id, asset_order, media_kind, public_url, poster_url, hls_url, duration_ms, width, height, processing_state)",
  "post_objects(id, media_asset_id, product_id, label, geometry, exactness, confidence)",
].join(", ");

const relatedSourceSchema = z.object({
  source_kind: z.enum(["user_upload", "licensed_editorial", "brand_feed", "official_embed", "demo_seed"]),
  provider: z.string().trim().min(1),
  canonical_url: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
});

const relatedRightsSchema = z.object({
  rights_status: z.enum(["pending", "approved", "rejected", "expired", "takedown"]),
  license_scope: z.enum(["user_owned", "licensed", "display_only", "public_embed", "demo_seed"]),
  can_display: z.boolean(),
  can_use_for_commerce_matching: z.boolean(),
  can_redistribute: z.boolean().nullable().optional(),
  rights_evidence_url: z.string().nullable().optional(),
  expires_at: z.string().nullable(),
});

const repositoryAssetSchema = z.object({
  id: z.string().trim().min(1),
  asset_order: z.number().int().nonnegative(),
  media_kind: z.enum(["photo", "image", "video", "embed", "poster", "thumbnail"]),
  public_url: z.string().trim().min(1),
  poster_url: z.string().nullable().optional(),
  hls_url: z.string().nullable().optional(),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  processing_state: z.enum(["uploaded", "processing", "ready", "blocked", "failed"]).optional(),
});

const repositoryObjectSchema = z.object({
  id: z.string().trim().min(1),
  media_asset_id: z.string().trim().min(1).nullable().optional(),
  product_id: z.string().nullable(),
  label: z.string().trim().min(1),
  geometry: z.unknown(),
  exactness: z.enum(["exact", "likely", "similar", "review", "unverified"]),
  confidence: z.union([z.number(), z.string()]).nullable().optional(),
});

const repositoryRowSchema = z.object({
  id: z.string().trim().min(1),
  creator_id: z.string().nullable(),
  creator_key: z.string().nullable().optional(),
  caption: z.string(),
  category: z.enum(["fashion", "beauty", "interior", "tech", "lifestyle"]),
  content_kind: z.enum(["photo", "carousel", "reel", "video", "story", "lookbook"]),
  published_at: z.string().nullable().optional(),
  created_at: z.string(),
  disclosure: z.enum(["none", "affiliate", "sponsored", "partner", "official", "editorial", "demo"]),
  is_demo: z.boolean().optional(),
  content_sources: z.union([relatedSourceSchema, z.array(relatedSourceSchema)]).nullable().optional(),
  content_rights: z.union([relatedRightsSchema, z.array(relatedRightsSchema)]).nullable().optional(),
  media_assets: z.array(repositoryAssetSchema).nullable().optional(),
  post_objects: z.array(repositoryObjectSchema).nullable().optional(),
});

export const repositoryRowsSchema = z.array(repositoryRowSchema);

export const geometrySchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  w: z.number().finite().min(0).max(1),
  h: z.number().finite().min(0).max(1),
});

export type RepositoryFeedRow = z.infer<typeof repositoryRowSchema>;
export type RepositoryAssetRow = z.infer<typeof repositoryAssetSchema>;
export type RepositoryObjectRow = z.infer<typeof repositoryObjectSchema>;
export type RepositorySourceRow = z.infer<typeof relatedSourceSchema>;
export type RepositoryRightsRow = z.infer<typeof relatedRightsSchema>;
