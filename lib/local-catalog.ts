import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

export interface LocalCatalogAsset {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly fileName: string;
  readonly imageUrl: string;
  readonly sizeBytes: number;
  readonly modifiedAt: string;
}

export interface LocalCatalogInventory {
  readonly configured: boolean;
  readonly count: number;
  readonly items: readonly LocalCatalogAsset[];
}

function catalogDirectory(): string {
  return path.resolve(process.env.STS_LOCAL_IMAGE_DIR?.trim() || path.join("..", "STS image", "assets"));
}

export async function listLocalCatalog(limit = 200): Promise<LocalCatalogInventory> {
  const directory = catalogDirectory();
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, Math.max(1, Math.min(limit, 1000)));
    const items = await Promise.all(files.map((entry) => describeAsset(directory, entry.name)));
    return { configured: true, count: items.length, items };
  } catch (error) {
    if (isMissingPath(error)) return { configured: false, count: 0, items: [] };
    throw error;
  }
}

export async function readLocalCatalogAsset(fileName: string): Promise<{ readonly body: ArrayBuffer; readonly contentType: string } | null> {
  if (!isSafeFileName(fileName)) return null;
  const directory = catalogDirectory();
  const target = path.resolve(directory, fileName);
  if (path.dirname(target) !== path.resolve(directory)) return null;
  try {
    const body = await readFile(target);
    const copy = new ArrayBuffer(body.byteLength);
    new Uint8Array(copy).set(body);
    return { body: copy, contentType: contentTypeFor(fileName) };
  } catch (error) {
    if (isMissingPath(error)) return null;
    throw error;
  }
}

async function describeAsset(directory: string, fileName: string): Promise<LocalCatalogAsset> {
  const file = await stat(path.join(directory, fileName));
  const id = path.basename(fileName, path.extname(fileName)).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id,
    name: humanizeFileName(fileName),
    category: categoryFor(fileName),
    fileName,
    imageUrl: `/api/local-catalog?name=${encodeURIComponent(fileName)}`,
    sizeBytes: file.size,
    modifiedAt: file.mtime.toISOString(),
  };
}

function humanizeFileName(fileName: string): string {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryFor(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("fashion") || normalized.includes("ootd")) return "fashion";
  if (normalized.includes("dining")) return "dining";
  if (normalized.includes("desk")) return "deskterior";
  if (normalized.includes("fitness")) return "fitness";
  if (normalized.includes("travel")) return "travel";
  return "uncategorized";
}

function isSafeFileName(fileName: string): boolean {
  return Boolean(fileName) && path.basename(fileName) === fileName && IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function contentTypeFor(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".heic") return "image/heic";
  return "image/jpeg";
}

function isMissingPath(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return typeof error.code === "string" && error.code === "ENOENT";
}
