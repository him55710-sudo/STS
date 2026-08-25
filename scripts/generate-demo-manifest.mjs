import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const IMAGE_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

const options = parseArgs(process.argv.slice(2));
const projectRoot = process.cwd();
const sourceDirectories = options.sources.length > 0
  ? options.sources
  : [path.join(projectRoot, "public", "looks"), path.join(projectRoot, "..", "STS image", "assets")];
const files = (await Promise.all(sourceDirectories.map((directory) => collectImages(path.resolve(projectRoot, directory))))).flat();
const assets = [];
const seenHashes = new Set();

for (const file of files.sort((left, right) => left.localeCompare(right))) {
  const bytes = await readFile(file);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (seenHashes.has(hash)) continue;
  seenHashes.add(hash);
  const id = `asset_${hash.slice(0, 16)}`;
  const relativeSource = path.relative(projectRoot, file).replaceAll(path.sep, "/");
  const publicRoot = path.join(projectRoot, "public") + path.sep;
  const publicUrl = file.startsWith(publicRoot)
    ? `/${path.relative(path.join(projectRoot, "public"), file).replaceAll(path.sep, "/")}`
    : null;
  let importedUrl = null;
  if (options.copyTo) {
    const destinationDirectory = path.resolve(projectRoot, options.copyTo);
    await mkdir(destinationDirectory, { recursive: true });
    const destinationName = `${id}-${path.basename(file)}`;
    const destination = path.join(destinationDirectory, destinationName);
    await copyFile(file, destination);
    importedUrl = `/${path.relative(path.join(projectRoot, "public"), destination).replaceAll(path.sep, "/")}`;
  }
  assets.push({ id, source: relativeSource, publicUrl, importedUrl, sha256: hash, isDemo: true });
}

const manifest = {
  version: 1,
  generatedAt: "deterministic",
  isDemo: true,
  assets,
  counts: { discovered: files.length, unique: assets.length },
};

if (options.writePath) {
  const outputPath = path.resolve(projectRoot, options.writePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`wrote ${assets.length} unique demo assets to ${path.relative(projectRoot, outputPath)}`);
} else {
  console.log(JSON.stringify(manifest, null, 2));
}

async function collectImages(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectImages(entryPath);
      return IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [entryPath] : [];
    }));
    return nested.flat();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

function parseArgs(args) {
  const sources = [];
  let copyTo = null;
  let writePath = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if (arg === "--source" && value) {
      sources.push(value);
      index += 1;
    } else if (arg === "--copy-to" && value) {
      copyTo = value;
      index += 1;
    } else if (arg === "--write" && value) {
      writePath = value;
      index += 1;
    } else if (arg === "--help") {
      console.log("Usage: node scripts/generate-demo-manifest.mjs [--source DIR] [--copy-to public/DIR] [--write FILE]");
      process.exit(0);
    }
  }
  return { sources, copyTo, writePath };
}
