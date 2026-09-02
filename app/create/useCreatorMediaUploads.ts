"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { z } from "zod";
import type { MediaAssetKind } from "@/lib/types";
import type { ProductCandidate } from "@/lib/retrieval";
import type { CreatorUploadedAsset, CreatorMediaAssetState, CreatorModerationState } from "./creator-publishing";

const mediaAssetRowSchema = z.object({
  id: z.string(),
  public_url: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  duration_ms: z.number().nullable().optional(),
  processing_state: z.string(),
  processing_error: z.string().nullable().optional(),
  moderation_status: z.string().nullable().optional(),
});

const initiateResponseSchema = z.object({
  asset: mediaAssetRowSchema,
  upload: z.object({
    uploadUrl: z.string(),
    publicUrl: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
});

const completeResponseSchema = z.object({
  asset: mediaAssetRowSchema,
  status: z.string(),
});

type UploadDraft = {
  readonly localId: string;
  readonly file: File;
  readonly kind: MediaAssetKind;
  readonly previewUrl: string;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number | null;
};

const REQUEST_TIMEOUT_MS = 30_000;

export function useCreatorMediaUploads() {
  const [assets, setAssets] = useState<readonly CreatorUploadedAsset[]>([]);
  const previewUrlsRef = useRef<readonly string[]>([]);

  const resetUploads = useCallback(() => {
    for (const previewUrl of previewUrlsRef.current) URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current = [];
    setAssets([]);
  }, []);

  useEffect(() => resetUploads, [resetUploads]);

  const uploadFiles = useCallback(async (files: readonly File[], postId: string): Promise<void> => {
    const drafts = await Promise.all(files.map(createUploadDraft));
    previewUrlsRef.current = [...previewUrlsRef.current, ...drafts.map((draft) => draft.previewUrl)];
    setAssets((current) => [...current, ...drafts.map(toQueuedAsset)]);
    await Promise.all(drafts.map((draft) => uploadDraft({ draft, postId, updateAsset: setAssets })));
  }, []);

  const setAssetAltText = useCallback((localId: string, altText: string) => {
    setAssets((current) => current.map((asset) => (asset.localId === localId ? { ...asset, altText } : asset)));
  }, []);

  const setAssetDisplayApproved = useCallback((localId: string, displayApproved: boolean) => {
    setAssets((current) =>
      current.map((asset) => asset.localId === localId ? { ...asset, displayApproved, reviewState: displayApproved ? "approved" : "review" } : asset)
    );
  }, []);

  const setPrimaryAssetCandidates = useCallback((candidates: readonly ProductCandidate[]) => {
    setAssets((current) => {
      const primary = current[0];
      if (!primary) return current;
      return current.map((asset) => (asset.localId === primary.localId ? { ...asset, candidates, reviewState: candidates.length > 0 ? "review" : "unverified" } : asset));
    });
  }, []);

  return {
    assets,
    uploadFiles,
    resetUploads,
    setAssetAltText,
    setAssetDisplayApproved,
    setPrimaryAssetCandidates,
  };
}

async function uploadDraft(options: { readonly draft: UploadDraft; readonly postId: string; readonly updateAsset: Dispatch<SetStateAction<readonly CreatorUploadedAsset[]>> }): Promise<void> {
  updateAssetState(options.updateAsset, options.draft.localId, { uploadState: "uploading" });
  try {
    const initiated = initiateResponseSchema.parse(
      await requestJson({
        url: "/api/media/initiate",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: options.postId,
            fileName: options.draft.file.name,
            mimeType: options.draft.file.type,
            sizeBytes: options.draft.file.size,
            dimensions: { width: options.draft.width, height: options.draft.height },
            durationMs: options.draft.durationMs ?? undefined,
          }),
        },
      })
    );

    await uploadToSignedUrl({ file: options.draft.file, uploadUrl: initiated.upload.uploadUrl, headers: initiated.upload.headers ?? {} });

    const completed = completeResponseSchema.parse(
      await requestJson({
        url: "/api/media/complete",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: initiated.asset.id }),
        },
      })
    );
    const uploadState = mapProcessingState(completed.asset.processing_state || completed.status);
    const moderationState = mapModerationState(completed.asset.moderation_status, uploadState);
    updateAssetState(options.updateAsset, options.draft.localId, {
      assetId: completed.asset.id,
      publicUrl: completed.asset.public_url || initiated.upload.publicUrl,
      width: completed.asset.width ?? options.draft.width,
      height: completed.asset.height ?? options.draft.height,
      durationMs: completed.asset.duration_ms ?? options.draft.durationMs,
      uploadState,
      moderationState,
      reviewState: uploadState === "ready" && moderationState === "approved" ? "approved" : "review",
      displayApproved: uploadState === "ready" && moderationState === "approved",
      error: completed.asset.processing_error ?? null,
    });
  } catch (error) {
    if (error instanceof Error) {
      updateAssetState(options.updateAsset, options.draft.localId, {
        uploadState: "failed",
        moderationState: "rejected",
        reviewState: "unverified",
        displayApproved: false,
        error: error.message,
      });
      return;
    }
    throw error;
  }
}

async function requestJson(options: { readonly url: string; readonly init: RequestInit }): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(options.url, { ...options.init, signal: controller.signal });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(readErrorMessage(body));
    return body;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function uploadToSignedUrl(options: { readonly file: File; readonly uploadUrl: string; readonly headers: Readonly<Record<string, string>> }): Promise<void> {
  const response = await fetch(options.uploadUrl, {
    method: "PUT",
    headers: options.headers,
    body: options.file,
  });
  if (!response.ok) throw new Error("signed media upload failed");
}

async function createUploadDraft(file: File): Promise<UploadDraft> {
  const previewUrl = URL.createObjectURL(file);
  const kind = file.type.startsWith("video/") ? "video" : "image";
  const dimensions = kind === "image" ? await readImageDimensions(previewUrl) : { width: 1080, height: 1920 };
  return {
    localId: `asset-${crypto.randomUUID()}`,
    file,
    kind,
    previewUrl,
    width: dimensions.width,
    height: dimensions.height,
    durationMs: null,
  };
}

function toQueuedAsset(draft: UploadDraft): CreatorUploadedAsset {
  return {
    localId: draft.localId,
    assetId: null,
    fileName: draft.file.name,
    kind: draft.kind,
    previewUrl: draft.previewUrl,
    publicUrl: null,
    width: draft.width,
    height: draft.height,
    durationMs: draft.durationMs,
    uploadState: "queued",
    moderationState: "pending",
    reviewState: "review",
    displayApproved: false,
    altText: "",
    candidates: [],
    error: null,
  };
}

function readImageDimensions(previewUrl: string): Promise<{ readonly width: number; readonly height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("image dimensions could not be read"));
    image.src = previewUrl;
  });
}

function updateAssetState(
  updateAsset: Dispatch<SetStateAction<readonly CreatorUploadedAsset[]>>,
  localId: string,
  patch: Partial<CreatorUploadedAsset>
): void {
  updateAsset((current) => current.map((asset) => (asset.localId === localId ? { ...asset, ...patch } : asset)));
}

function mapProcessingState(value: string): CreatorMediaAssetState {
  switch (value) {
    case "uploaded":
      return "uploading";
    case "processing":
      return "processing";
    case "ready":
      return "ready";
    case "blocked":
      return "blocked";
    case "failed":
      return "failed";
    default:
      return "processing";
  }
}

function mapModerationState(value: string | null | undefined, uploadState: CreatorMediaAssetState): CreatorModerationState {
  switch (value) {
    case "approved":
      return "approved";
    case "rejected":
    case "blocked":
      return "rejected";
    case "pending":
      return "pending";
    case null:
    case undefined:
      return uploadState === "ready" ? "approved" : "pending";
    default:
      return "pending";
  }
}

function readErrorMessage(body: unknown): string {
  const parsed = z.object({ message: z.string().optional(), error: z.string().optional() }).safeParse(body);
  if (!parsed.success) return "media request failed";
  return parsed.data.message ?? parsed.data.error ?? "media request failed";
}
