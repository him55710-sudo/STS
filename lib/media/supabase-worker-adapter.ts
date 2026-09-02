import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseMediaAdminClient } from "./admin-client";
import type { MediaAssetRecord, MediaProcessingJob, MediaProcessingJobStatus, MediaProcessingStatus, MediaUploadMimeType } from "./types";
import { MEDIA_PROCESSING_MAX_ATTEMPTS } from "./types";
import { backoffMs } from "./queue";
import type { MediaProcessingOutput, ModerationRiskDecision } from "./processor-adapter";

const MEDIA_BUCKET = "post-media";
const ASSET_COLUMNS = "id, post_id, storage_path, public_url, media_kind, mime_type, byte_size, width, height, duration_ms, content_hash, poster_url, hls_url, processing_state, processing_error, posts!inner(creator_id)";

type SupabaseError = { readonly code?: string; readonly message?: string };
type SupabaseResult<T> = { readonly data: T | null; readonly error: SupabaseError | null };
type ProcessingJobRpcRow = { readonly id: string; readonly media_asset_id: string; readonly owner_id: string; readonly post_id: string; readonly status: MediaProcessingJobStatus; readonly attempts: number | null; readonly error_code: string | null; readonly available_at: string };
type ProcessingJobRpcData = ProcessingJobRpcRow | readonly ProcessingJobRpcRow[] | null;
type MediaAssetRow = { readonly id: string; readonly post_id: string; readonly storage_path: string | null; readonly public_url: string; readonly media_kind: "photo" | "video" | "embed" | "poster" | "thumbnail"; readonly mime_type: MediaUploadMimeType | null; readonly byte_size: number | null; readonly width: number | null; readonly height: number | null; readonly duration_ms: number | null; readonly content_hash: string | null; readonly poster_url: string | null; readonly hls_url: string | null; readonly processing_state: MediaProcessingStatus; readonly processing_error: string | null; readonly posts: { readonly creator_id: string } };
type StoredVariantRow = { readonly storage_path: string | null; readonly variant_kind: MediaVariantKind };
type StoredVariantWithPath = StoredVariantRow & { readonly storage_path: string };
type MediaVariantKind = "original" | "poster" | "thumbnail" | "hls_1080p" | "hls_720p" | "hls_480p";
type MediaVariantInsert = { readonly media_asset_id: string; readonly variant_kind: MediaVariantKind; readonly storage_path: string | null; readonly public_url: string; readonly mime_type: string | null; readonly width: number | null; readonly height: number | null; readonly duration_ms: number | null; readonly byte_size: number | null; readonly content_hash: string | null; readonly processing_state: "ready" };
type RunningJobRow = { readonly attempts: number | null };
type StateUpdate = { readonly processingState: MediaProcessingStatus; readonly processingError: string | null; readonly jobStatus: MediaProcessingJobStatus; readonly jobError: string | null; readonly jobAvailableAt?: string };

export type MediaProcessingFailureDisposition = "retrying" | "failed";

export interface SupabaseWorkerStore { claimJob(): Promise<MediaProcessingJob | null>; loadAsset(assetId: string): Promise<MediaAssetRecord | null>; persistVariants(assetId: string, output: MediaProcessingOutput): Promise<void>; persistModeration(assetId: string, moderation: ModerationRiskDecision): Promise<void>; markReady(assetId: string): Promise<void>; markFailed(assetId: string, code: string): Promise<MediaProcessingFailureDisposition | void>; markBlocked(assetId: string, code: string): Promise<void>; cleanupOutputs(assetId: string): Promise<void> }

export class SupabaseWorkerStoreError extends Error { readonly name = "SupabaseWorkerStoreError"; constructor(message: string, readonly cause?: unknown) { super(message, { cause }); } }

export function createSupabaseWorkerStore(client: SupabaseClient): SupabaseWorkerStore;
export function createSupabaseWorkerStore(): SupabaseWorkerStore | null;
export function createSupabaseWorkerStore(client?: SupabaseClient): SupabaseWorkerStore | null {
  const serviceClient = client ?? createSupabaseMediaAdminClient();
  if (!serviceClient) return null;

  return {
    async claimJob(): Promise<MediaProcessingJob | null> { const result: SupabaseResult<ProcessingJobRpcData> = await serviceClient.rpc("claim_media_processing_job"); ensureSuccess(result, "claim media processing job"); const row = firstRow(result.data); return row ? toProcessingJob(row) : null; },
    async loadAsset(assetId): Promise<MediaAssetRecord | null> { const result: SupabaseResult<MediaAssetRow> = await serviceClient.from("media_assets").select(ASSET_COLUMNS).eq("id", assetId).maybeSingle(); ensureSuccess(result, "load media asset"); return result.data ? toMediaAssetRecord(result.data) : null; },
    async persistVariants(assetId, output): Promise<void> {
      const variants = [...toVariantRows(assetId, output)];
      const variantsResult: SupabaseResult<null> = await serviceClient
        .from("media_variants")
        .upsert(variants, { onConflict: "media_asset_id,variant_kind,public_url" });
      ensureSuccess(variantsResult, "persist media variants");

      const assetResult: SupabaseResult<null> = await serviceClient
        .from("media_assets")
        .update({
          public_url: output.original.url,
          storage_path: output.original.storagePath,
          mime_type: output.original.mimeType,
          byte_size: output.original.bytes,
          width: output.original.dimensions.width,
          height: output.original.dimensions.height,
          duration_ms: output.original.durationMs,
          poster_url: output.poster?.url ?? null,
          hls_url: output.hls?.url ?? null,
          processing_error: null,
        })
        .eq("id", assetId);
      ensureSuccess(assetResult, "persist media asset variants");
    },
    async persistModeration(assetId, moderation): Promise<void> {
      const processingError = moderation.kind === "approved"
        ? null
        : moderation.kind === "review"
          ? `moderation_review:${moderation.reason}`
          : moderation.reason;
      const result: SupabaseResult<null> = await serviceClient
        .from("media_assets")
        .update({ processing_error: processingError })
        .eq("id", assetId);
      ensureSuccess(result, "persist media moderation");
    },
    async markReady(assetId): Promise<void> { await updateState(serviceClient, assetId, { processingState: "ready", processingError: null, jobStatus: "succeeded", jobError: null }); },
    async markFailed(assetId, code): Promise<MediaProcessingFailureDisposition> {
      const jobResult: SupabaseResult<RunningJobRow> = await serviceClient
        .from("processing_jobs")
        .select("attempts")
        .eq("media_asset_id", assetId)
        .eq("status", "running")
        .maybeSingle();
      ensureSuccess(jobResult, "load media processing attempt");

      const attempts = jobResult.data?.attempts ?? MEDIA_PROCESSING_MAX_ATTEMPTS;
      const retrying = code !== "media_asset_missing" && attempts < MEDIA_PROCESSING_MAX_ATTEMPTS;
      await updateState(serviceClient, assetId, {
        processingState: retrying ? "processing" : "failed",
        processingError: code,
        jobStatus: retrying ? "queued" : "failed",
        jobError: code,
        ...(retrying ? { jobAvailableAt: new Date(Date.now() + backoffMs(attempts)).toISOString() } : {}),
      });
      return retrying ? "retrying" : "failed";
    },
    async markBlocked(assetId, code): Promise<void> { await updateState(serviceClient, assetId, { processingState: "blocked", processingError: code, jobStatus: "blocked", jobError: code }); },
    async cleanupOutputs(assetId): Promise<void> {
      const variantsResult: SupabaseResult<readonly StoredVariantRow[]> = await serviceClient
        .from("media_variants")
        .select("storage_path, variant_kind")
        .eq("media_asset_id", assetId);
      ensureSuccess(variantsResult, "load media output paths");

      const outputPaths = Array.from(
        new Set((variantsResult.data ?? [])
          .filter((variant): variant is StoredVariantWithPath => variant.variant_kind !== "original" && variant.storage_path !== null)
          .map((variant) => variant.storage_path))
      );
      if (outputPaths.length > 0) {
        const storageResult = await serviceClient.storage.from(MEDIA_BUCKET).remove(outputPaths);
        if (storageResult.error) throw new SupabaseWorkerStoreError("remove media outputs", storageResult.error);
      }

      const deleteResult: SupabaseResult<null> = await serviceClient
        .from("media_variants")
        .delete()
        .eq("media_asset_id", assetId)
        .neq("variant_kind", "original");
      ensureSuccess(deleteResult, "delete media output records");

      const clearResult: SupabaseResult<null> = await serviceClient
        .from("media_assets")
        .update({ poster_url: null, hls_url: null })
        .eq("id", assetId);
      ensureSuccess(clearResult, "clear media output references");
    },
  };
}

export const createSupabaseWorkerAdapter = createSupabaseWorkerStore;
export const createSupabaseMediaWorkerStore = createSupabaseWorkerStore;

async function updateState(client: SupabaseClient, assetId: string, update: StateUpdate): Promise<void> {
  const assetResult: SupabaseResult<null> = await client
    .from("media_assets")
    .update({ processing_state: update.processingState, processing_error: update.processingError })
    .eq("id", assetId);
  ensureSuccess(assetResult, "update media asset state");

  const jobResult: SupabaseResult<null> = await client
    .from("processing_jobs")
    .update({
      status: update.jobStatus,
      error_code: update.jobError,
      ...(update.jobAvailableAt ? { available_at: update.jobAvailableAt } : {}),
    })
    .eq("media_asset_id", assetId)
    .eq("status", "running");
  ensureSuccess(jobResult, "update media processing job state");
}

function firstRow(data: ProcessingJobRpcData): ProcessingJobRpcRow | null {
  if (!data) return null;
  return isProcessingJobRows(data) ? data[0] ?? null : data;
}

function isProcessingJobRows(data: ProcessingJobRpcData): data is readonly ProcessingJobRpcRow[] {
  return Array.isArray(data);
}

function toProcessingJob(row: ProcessingJobRpcRow): MediaProcessingJob {
  return {
    id: row.id,
    assetId: row.media_asset_id,
    ownerId: row.owner_id,
    postId: row.post_id,
    status: row.status,
    attempts: row.attempts ?? 0,
    errorCode: row.error_code,
    availableAt: row.available_at,
  };
}

function toMediaAssetRecord(row: MediaAssetRow): MediaAssetRecord {
  if (row.media_kind !== "photo" && row.media_kind !== "video") {
    throw new SupabaseWorkerStoreError(`unsupported media kind: ${row.media_kind}`);
  }
  if (!row.storage_path || !row.mime_type || row.byte_size === null) {
    throw new SupabaseWorkerStoreError("media asset has incomplete worker metadata");
  }

  return {
    id: row.id,
    ownerId: row.posts.creator_id,
    postId: row.post_id,
    status: row.processing_state,
    kind: row.media_kind === "photo" ? "image" : "video",
    mimeType: row.mime_type,
    sizeBytes: row.byte_size,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    contentHash: row.content_hash,
    dimensions: toDimensions(row.width, row.height),
    durationMs: row.duration_ms,
    poster: row.poster_url && row.width !== null && row.height !== null
      ? { url: row.poster_url, dimensions: { width: row.width, height: row.height } }
      : null,
    native: null,
    hls: row.hls_url ? { url: row.hls_url, variants: [] } : null,
    moderation: { status: "pending", sampledFramesMs: [] },
    audio: { hasAudio: false, license: { source: "unknown", reusable: false, note: null } },
    errorCode: row.processing_error,
  };
}

function toDimensions(width: number | null, height: number | null): MediaAssetRecord["dimensions"] {
  return width === null || height === null ? null : { width, height };
}

function toVariantRows(assetId: string, output: MediaProcessingOutput): readonly MediaVariantInsert[] {
  const original: MediaVariantInsert = {
    media_asset_id: assetId,
    variant_kind: "original",
    storage_path: output.original.storagePath,
    public_url: output.original.url,
    mime_type: output.original.mimeType,
    width: output.original.dimensions.width,
    height: output.original.dimensions.height,
    duration_ms: output.original.durationMs,
    byte_size: output.original.bytes,
    content_hash: null,
    processing_state: "ready",
  };
  const poster: MediaVariantInsert | null = output.poster
    ? {
        media_asset_id: assetId,
        variant_kind: "poster",
        storage_path: output.poster.storagePath,
        public_url: output.poster.url,
        mime_type: output.poster.mimeType,
        width: output.poster.dimensions.width,
        height: output.poster.dimensions.height,
        duration_ms: null,
        byte_size: output.poster.bytes,
        content_hash: null,
        processing_state: "ready",
      }
    : null;
  const hls = output.hls?.variants.map((variant): MediaVariantInsert => ({
    media_asset_id: assetId,
    variant_kind: hlsKind(variant.width),
    storage_path: null,
    public_url: variant.playlistUrl,
    mime_type: "application/vnd.apple.mpegurl",
    width: variant.width,
    height: variant.height,
    duration_ms: null,
    byte_size: null,
    content_hash: null,
    processing_state: "ready",
  })) ?? [];
  return [original, ...(poster ? [poster] : []), ...hls];
}

function hlsKind(width: number): Exclude<MediaVariantKind, "original" | "poster" | "thumbnail"> {
  return width >= 1080 ? "hls_1080p" : width >= 720 ? "hls_720p" : "hls_480p";
}

function ensureSuccess<T>(result: SupabaseResult<T>, operation: string): void { if (result.error) throw new SupabaseWorkerStoreError(operation, result.error); }
