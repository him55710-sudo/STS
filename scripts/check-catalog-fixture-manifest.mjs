import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../tests/fixtures/catalog/", import.meta.url);
const manifestPath = new URL("./manifest.json", root);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = (await readdir(root)).filter((name) => name.endsWith(".jpg"));

let failed = false;
for (const file of files) {
  const bytes = await readFile(new URL(file, root));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (manifest[file] !== hash) {
    console.error(`${file}: expected ${manifest[file]} got ${hash}`);
    failed = true;
  }
}

if (failed) process.exit(1);
