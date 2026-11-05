import lighthouse from "../output/beauty-qa-tools/node_modules/lighthouse/core/index.js";
import desktop from "../output/beauty-qa-tools/node_modules/lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const output = "output/beauty-commerce-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--remote-debugging-port=9235"] });
const summary = {};
try {
  for (const mode of ["desktop", "mobile"]) {
    const samples = [];
    for (let run = 1; run <= 3; run++) {
    const result = await lighthouse(process.env.BEAUTY_QA_URL ?? "http://127.0.0.1:3201/", {
      port: 9235, output: "json", onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    }, mode === "desktop" ? desktop : undefined);
      await writeFile(`${output}/lighthouse-${mode}-${run}.json`, JSON.stringify(result.lhr));
      samples.push(Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, value.score * 100])));
      console.log(mode, run, JSON.stringify(samples.at(-1)));
    }
    summary[mode] = Object.fromEntries(Object.keys(samples[0]).map((key) => [key, samples.map((sample) => sample[key]).sort((a, b) => a - b)[1]]));
  }
  await writeFile(`${output}/lighthouse-summary.json`, JSON.stringify({ runsPerMode: 3, median: summary }, null, 2));
} finally {
  await browser.close();
}
