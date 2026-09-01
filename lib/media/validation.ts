import { createHash } from "node:crypto";
import type { MediaDimensions, MediaKind, MediaUploadMimeType, RejectedUpload, UploadRequest } from "./types";
import { MEDIA_UPLOAD_MIME_TYPES } from "./types";

export const MEDIA_LIMITS = {
  imageMaxBytes: 8 * 1024 * 1024,
  videoMaxBytes: 200 * 1024 * 1024,
  maxPixels: 24_000_000,
  maxDurationMs: 120_000,
} as const;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SHA256_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

type AcceptedValidation = {
  readonly kind: "accepted";
  readonly mediaKind: MediaKind;
  readonly mimeType: MediaUploadMimeType;
  readonly contentHash: string | null;
  readonly uploadFingerprint: string;
  readonly dimensions: MediaDimensions | null;
};

export type UploadValidationResult = AcceptedValidation | RejectedUpload;

export function validateUploadRequest(request: UploadRequest): UploadValidationResult {
  const mimeType = parseMimeType(request.mimeType);
  if (!mimeType) return reject("unsupported_mime", 415, "unsupported media MIME type");
  const mediaKind = mimeType.startsWith("image/") ? "image" : "video";
  const byteLimit = mediaKind === "image" ? MEDIA_LIMITS.imageMaxBytes : MEDIA_LIMITS.videoMaxBytes;
  if (!Number.isInteger(request.sizeBytes) || request.sizeBytes <= 0) return reject("invalid_size", 400, "invalid media size");
  if (request.sizeBytes > byteLimit) return reject("too_large", 413, "media payload exceeds safety limits");
  if (request.durationMs !== undefined && request.durationMs > MEDIA_LIMITS.maxDurationMs) {
    return reject("duration_too_long", 413, "video duration exceeds safety limits");
  }

  const declaredDimensionsResult = validateDimensions(request.dimensions);
  if (declaredDimensionsResult.kind === "rejected") return declaredDimensionsResult;

  const bytes = request.contentBytes ? Buffer.from(request.contentBytes) : null;
  if (!bytes) {
    const normalizedHash = normalizeHash(request.contentHash);
    if (!normalizedHash) return reject("invalid_hash", 400, "content hash must be a sha256 hex digest");
    return {
      kind: "accepted",
      mediaKind,
      mimeType,
      contentHash: null,
      uploadFingerprint: normalizedHash,
      dimensions: request.dimensions ?? null,
    };
  }

  if (bytes.byteLength !== request.sizeBytes) return reject("invalid_size", 400, "declared media size did not match payload");
  if (!signatureMatches(bytes, mimeType)) return reject("corrupt_media", 400, "media signature did not match MIME type");
  const computedHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const declaredHash = request.contentHash === undefined ? null : normalizeHash(request.contentHash);
  if (request.contentHash !== undefined && !declaredHash) return reject("invalid_hash", 400, "content hash must be a sha256 hex digest");
  if (declaredHash && declaredHash !== computedHash) return reject("hash_mismatch", 400, "content hash did not match uploaded bytes");
  const parsedDimensions = mediaKind === "image" ? imageDimensions(bytes, mimeType) : null;
  if (mediaKind === "image" && !parsedDimensions) return reject("corrupt_media", 400, "image dimensions could not be parsed");
  const parsedDimensionsResult = validateDimensions(parsedDimensions ?? undefined);
  if (parsedDimensionsResult.kind === "rejected") return parsedDimensionsResult;

  return {
    kind: "accepted",
    mediaKind,
    mimeType,
    contentHash: computedHash,
    uploadFingerprint: computedHash,
    dimensions: parsedDimensions ?? request.dimensions ?? null,
  };
}

function parseMimeType(value: string): MediaUploadMimeType | null {
  const normalized = value.split(";")[0]?.trim().toLowerCase();
  return MEDIA_UPLOAD_MIME_TYPES.find((mimeType) => mimeType === normalized) ?? null;
}

function validateDimensions(dimensions: MediaDimensions | undefined): { readonly kind: "accepted" } | RejectedUpload {
  if (!dimensions) return { kind: "accepted" };
  if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    return reject("invalid_dimensions", 400, "invalid media dimensions");
  }
  if (dimensions.width * dimensions.height > MEDIA_LIMITS.maxPixels) {
    return reject("too_many_pixels", 413, "media dimensions exceed safety limits");
  }
  return { kind: "accepted" };
}

function signatureMatches(bytes: Buffer, mimeType: MediaUploadMimeType): boolean {
  switch (mimeType) {
    case "image/png":
      return bytes.length >= 24 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
    case "image/jpeg":
      return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
    case "image/webp":
      return bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp";
    case "video/webm":
      return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    default:
      return false;
  }
}

function imageDimensions(bytes: Buffer, mimeType: MediaUploadMimeType): MediaDimensions | null {
  switch (mimeType) {
    case "image/png":
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    case "image/jpeg":
      return jpegDimensions(bytes);
    case "image/webp":
      return webpDimensions(bytes);
    default:
      return null;
  }
}

function jpegDimensions(bytes: Buffer): MediaDimensions | null {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes: Buffer): MediaDimensions | null {
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk !== "VP8L" || bytes.length < 27 || bytes[21] !== 0x2f) return null;
  return {
    width: 1 + (bytes[22] | (bytes[23] << 8) | ((bytes[24] & 0x3f) << 16)),
    height: 1 + ((bytes[24] >> 6) | (bytes[25] << 2) | ((bytes[26] & 0xf) << 10)),
  };
}

function normalizeHash(hash: string | undefined): string | null {
  if (hash === undefined) return null;
  return SHA256_HASH_PATTERN.test(hash) ? hash : null;
}

function reject(code: string, status: number, message: string): RejectedUpload {
  return { kind: "rejected", code, status, message };
}
