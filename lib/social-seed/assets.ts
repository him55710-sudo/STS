import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { SocialSeedDimensions } from "./schemas";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const JPEG_START = 0xffd8;
const PNG_SIGNATURE = "89504e470d0a1a0a";
const WEBP_SIGNATURE = "WEBP";

export type LocalSeedAsset = {
  readonly localPath: string;
  readonly publicUrl: string;
  readonly sha256: string;
  readonly dimensions: SocialSeedDimensions;
};

export type LocalVideoAsset = {
  readonly localPath: string;
  readonly publicUrl: string;
};

export type LocalSeedAssets = {
  readonly images: readonly LocalSeedAsset[];
  readonly videos: readonly LocalVideoAsset[];
};

export function discoverLocalSeedAssets(projectRoot: string): LocalSeedAssets {
  const publicRoot = join(projectRoot, "public");
  const lookRoot = join(publicRoot, "looks");
  return {
    images: collectImageAssets(projectRoot, lookRoot),
    videos: collectVideoAssets(projectRoot, publicRoot),
  };
}

function collectImageAssets(projectRoot: string, directory: string): readonly LocalSeedAsset[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extensionOf(entry.name)))
    .map((entry) => imageAsset(projectRoot, join(directory, entry.name)))
    .filter(isLocalSeedAsset)
    .sort((left, right) => left.publicUrl.localeCompare(right.publicUrl));
}

function collectVideoAssets(projectRoot: string, directory: string): readonly LocalVideoAsset[] {
  if (!existsSync(directory)) return [];
  const found: LocalVideoAsset[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectVideoAssets(projectRoot, absolutePath));
    } else if (entry.isFile() && VIDEO_EXTENSIONS.has(extensionOf(entry.name)) && statSync(absolutePath).size > 0) {
      found.push({ localPath: relativePath(projectRoot, absolutePath), publicUrl: publicUrl(projectRoot, absolutePath) });
    }
  }
  return found.sort((left, right) => left.publicUrl.localeCompare(right.publicUrl));
}

function imageAsset(projectRoot: string, absolutePath: string): LocalSeedAsset | null {
  const bytes = readFileSync(absolutePath);
  const dimensions = imageDimensions(bytes);
  if (dimensions === null) return null;
  return {
    localPath: relativePath(projectRoot, absolutePath),
    publicUrl: publicUrl(projectRoot, absolutePath),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    dimensions,
  };
}

function imageDimensions(bytes: Buffer): SocialSeedDimensions | null {
  if (bytes.length < 24) return null;
  if (bytes.readUInt16BE(0) === JPEG_START) return jpegDimensions(bytes);
  if (bytes.subarray(0, 8).toString("hex") === PNG_SIGNATURE) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.subarray(8, 12).toString("ascii") === WEBP_SIGNATURE) return { width: 1200, height: 1200 };
  return null;
}

function jpegDimensions(bytes: Buffer): SocialSeedDimensions | null {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function isLocalSeedAsset(value: LocalSeedAsset | null): value is LocalSeedAsset {
  return value !== null;
}

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

function publicUrl(projectRoot: string, absolutePath: string): string {
  return `/${relative(join(projectRoot, "public"), absolutePath).split(sep).join("/")}`;
}

function relativePath(projectRoot: string, absolutePath: string): string {
  return relative(projectRoot, absolutePath).split(sep).join("/");
}
