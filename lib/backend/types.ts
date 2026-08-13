import type { Category, Exactness } from "@/lib/types";

/** Supabase 행 타입 — Phase 1 스키마와 1:1 (코드젠 도입 전 수동 유지) */

export interface ProfileRow {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  role: "user" | "creator" | "admin";
  verified: boolean;
  created_at: string;
}

export interface PostMediaRow {
  id: string;
  post_id: string;
  media_type: "image" | "video";
  storage_url: string | null;
  external_embed_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  position: number;
}

export interface ObjectLinkRow {
  id: string;
  object_id: string;
  product_id: string;
  relationship: "exact" | "similar" | "likely";
  verified_by: string | null;
  model_confidence: number | null;
  product_snapshot: ProductSnapshot | null;
}

export interface ObjectRow {
  id: string;
  post_id: string;
  media_id: string | null;
  canonical_class: string | null;
  label: string;
  bbox: { x: number; y: number; w: number; h: number } | null;
  polygon: [number, number][] | null;
  polygons: [number, number][][] | null;
  confidence: number;
  pipeline_version: string | null;
  object_product_links: ObjectLinkRow[];
}

export interface PostRow {
  id: string;
  creator_id: string;
  caption: string;
  category: Category;
  status: "draft" | "published" | "removed";
  source: string;
  created_at: string;
  published_at: string | null;
  post_media: PostMediaRow[];
  objects: ObjectRow[];
  profiles: ProfileRow | null;
  post_likes: { count: number }[];
}

/** 카탈로그 밖 상품(URL 직접 연결·웹 후보)의 자기완결 스냅샷 — Phase 2 canonical graph 전까지의 이동 형식 */
export interface ProductSnapshot {
  brand: string;
  name: string;
  price: number;
  currency: "KRW";
  retailer: string;
  url: string;
  image: string;
  category: Category;
  affiliate: boolean;
  commissionRate?: number;
}

/** publish_post RPC의 객체 페이로드 */
export interface PublishObjectPayload {
  label: string;
  canonical_class: string | null;
  bbox: { x: number; y: number; w: number; h: number };
  polygon: [number, number][] | null;
  polygons: [number, number][][] | null;
  confidence: number;
  pipeline_version: string;
  link: {
    product_id: string;
    relationship: Exactness;
    model_confidence: number;
    product_snapshot: ProductSnapshot | null;
  } | null;
}
