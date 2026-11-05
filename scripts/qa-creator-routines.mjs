import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BEAUTY_QA_URL ?? "http://127.0.0.1:3201";
const output = path.resolve("output/beauty-commerce-qa/creator-revision");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
const checks = [];
const external = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  const url = new URL(response.url());
  if (url.origin === "https://www.tiktok.com" && /^\/player\/v1\/\d+$/.test(url.pathname)) external.push({ url: url.origin + url.pathname, status: response.status() });
});
async function check(name, action) { await action(); checks.push({ name, status: "passed" }); }
async function capture(name) {
  for (const img of await page.locator("main img").all()) {
    if (!(await img.isVisible())) continue;
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element) => element.decode().catch(() => undefined));
  }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: "disabled" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflows`);
}
async function editNotes() { const details = page.locator("details").filter({ has: page.locator("#creator-caption") }); if (!(await details.evaluate((element) => element.open))) await details.locator("summary").click(); }
try {
  await check("English default uses replacement footage and exposes original creator journey", async () => {
    await page.goto(base);
    await page.getByRole("heading", { name: "See the look. Learn the steps. Make it yours." }).waitFor();
    assert.equal(await page.locator(".bc-feature-video video").getAttribute("src"), "/beauty-media/modern-lip.mp4");
    assert.equal(await page.getByRole("combobox", { name: "Language", exact: true }).inputValue(), "en");
    assert.equal(await page.locator('a[href="/creators?video=7518741157669653790"]').count(), 1);
  });
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await capture(`home-${width}-en`); }
  await check("Personal preferences update sourced explanations and survive reload", async () => {
    await page.goto(`${base}/look/glow-lip`);
    await page.locator('.beauty-commerce[data-hydrated="true"]').waitFor();
    const fit = page.getByTestId("product-fit");
    await fit.getByText("Make it personal", { exact: true }).click();
    await fit.getByRole("combobox", { name: "Preferred finish", exact: true }).selectOption("glossy");
    await fit.getByText("Matches some preferences", { exact: true }).waitFor();
    await fit.getByRole("combobox", { name: "Fragrance preference", exact: true }).selectOption("avoid");
    await fit.getByText("A tradeoff to consider", { exact: true }).waitFor();
    await page.reload();
    await fit.getByText("A tradeoff to consider", { exact: true }).waitFor();
    assert.match(await fit.innerText(), /prefer to avoid fragrance/);
    assert.equal(await fit.getByRole("link", { name: "Read the brand's product information" }).getAttribute("href"), "https://romandbeauty.com/products/juicy-lasting-tint");
  });
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await capture(`look-${width}-en`); }
  await check("Deep-linked native segment restores even when metadata loads before hydration", async () => {
    const delayed = await browser.newContext();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await delayed.route("**/_next/static/**/*.js", async (route) => { await gate; await route.continue(); });
    const isolated = await delayed.newPage();
    try {
      await isolated.goto(`${base}/look/glow-lip?step=mirror-check`, { waitUntil: "commit" });
      await isolated.waitForFunction(() => document.querySelector("video")?.readyState >= 1);
      release();
      await isolated.locator('.beauty-commerce[data-hydrated="true"]').waitFor();
      await isolated.waitForFunction(() => Math.abs(document.querySelector("video").currentTime - 5.5) < 0.1);
    } finally { release(); await delayed.close(); }
  });
  await check("Original routine deep links show full selectable product stacks", async () => {
    await page.goto(`${base}/creators?video=7518741157669653790`);
    const layers = page.getByTestId("creator-product-layers");
    await layers.waitFor();
    assert.equal(await layers.locator('button small').count(), 9);
    assert.match(await page.locator("iframe").getAttribute("src"), /player\/v1\/7518741157669653790/);
    await layers.getByRole("button", { name: "Lips", exact: true }).click();
    await layers.getByRole("button", { name: "Peripera Ink Mood Glowy Tint", exact: true }).click();
    assert.match(await page.getByTestId("creator-layer-detail").innerText(), /coral influencer/);
    const search = await layers.getByRole("link", { name: "Search this product in Vietnam" }).getAttribute("href");
    assert.match(new URL(search).searchParams.get("q"), /Peripera Ink Mood Glowy Tint coral influencer/);
    await page.goto(`${base}/creators?video=7310866363613039874`);
    await page.getByRole("heading", { name: "@iam.chae", exact: true }).waitFor();
    assert.equal(await layers.locator('button small').count(), 9);
  });
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await capture(`creators-${width}-en`); }
  await check("Caption-named catalog product has honest evidence and personal comparison", async () => {
    await page.goto(`${base}/creators?video=7292952659240209672`);
    await page.getByText("Named in creator caption", { exact: true }).waitFor();
    await page.getByTestId("product-fit").getByText("A tradeoff to consider", { exact: true }).waitFor();
    await page.getByTestId("creator-product-layers").getByRole("button", { name: "AMUSE Dew Tint", exact: true }).click();
    assert.match(await page.getByTestId("creator-layer-detail").innerText(), /Exact shade.*not stated/);
    assert.equal(await page.getByTestId("product-fit").count(), 0);
  });
  await check("Batch import rejects unsafe sources and deduplicates original links", async () => {
    await page.locator("#creator-urls").fill("https://evil.example/@creator/video/7518741157669653790");
    await page.getByRole("button", { name: "Add to library", exact: true }).click();
    await page.locator("#import-videos").getByRole("alert").waitFor();
    await page.locator("#creator-urls").fill("https://www.tiktok.com/@jooshica/video/7518741157669653790\nhttps://www.tiktok.com/@sarahkchey/video/7292952659240209672");
    await page.getByRole("button", { name: "Add to library", exact: true }).click();
    assert.equal(await page.locator('[aria-label="Saved creator videos"]>button').count(), 4);
  });
  await check("Source notes distinguish brand-only evidence and validate step order", async () => {
    await editNotes();
    await page.locator("#creator-caption").fill("rom&nd Juicy Lasting Tint\nCLIO");
    await page.locator("#creator-timestamps").fill("00:10 Lips\n00:05 Base");
    assert.equal(await page.getByRole("button", { name: "Save and analyze text", exact: true }).isDisabled(), true);
    await page.locator("#creator-timestamps").fill("00:00 Base\n00:10 Lips");
    await page.getByRole("button", { name: "Save and analyze text", exact: true }).click();
    await page.getByText("Product name mentioned", { exact: true }).waitFor();
    await page.getByText("Brand mentioned · product unconfirmed", { exact: true }).waitFor();
    await page.reload();
    await editNotes();
    assert.equal(await page.locator("#creator-timestamps").inputValue(), "00:00 Base\n00:10 Lips");
  });
  await check("Metadata response preserves notes saved while its request is pending", async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route("**/api/beauty/tiktok", async (route) => { await gate; await route.fulfill({ json: { status: "available", source: "https://www.tiktok.com/@jooshica/video/7518741157669653790", title: "Public metadata test", author: "@jooshica" } }); });
    await page.getByRole("button", { name: "Fetch public TikTok metadata", exact: true }).click();
    await page.locator("#creator-caption").fill("Torriden DIVE IN Serum\nFreshly saved notes");
    await page.getByRole("button", { name: "Save and analyze text", exact: true }).click();
    release();
    await page.locator("blockquote").filter({ hasText: "Public metadata test" }).waitFor();
    await page.reload();
    await editNotes();
    assert.match(await page.locator("#creator-caption").inputValue(), /Freshly saved notes/);
    await page.unroute("**/api/beauty/tiktok");
  });
  await check("Blocked device storage still shows all initial creator sources", async () => {
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => { Object.defineProperty(Storage.prototype, "getItem", { value() { throw new DOMException("Storage blocked", "SecurityError"); } }); });
    const isolated = await blocked.newPage();
    await isolated.goto(`${base}/creators`);
    await isolated.locator('[aria-label="Saved creator videos"]>button').first().waitFor();
    assert.equal(await isolated.locator('[aria-label="Saved creator videos"]>button').count(), 4);
    await isolated.getByText("Device storage is unavailable. Your library works for this visit only.", { exact: true }).waitFor();
    await blocked.close();
  });
  await check("Unavailable external player retains source links and product information", async () => {
    const unavailable = await browser.newContext();
    await unavailable.route("https://www.tiktok.com/player/**", (route) => route.abort());
    const isolated = await unavailable.newPage();
    await isolated.goto(`${base}/creators`);
    await isolated.getByRole("button", { name: "Reload player", exact: true }).waitFor({ timeout: 16000 });
    assert.equal(await isolated.getByTestId("creator-product-layers").count(), 1);
    assert(await isolated.locator('a[href="https://www.tiktok.com/@jooshica/video/7518741157669653790"]').count() > 0);
    await unavailable.close();
  });
  await check("Official player protocol seeks, pauses and synchronizes reviewed product areas in an isolated harness", async () => {
    const harness = await browser.newContext();
    await harness.route("https://www.tiktok.com/player/**", (route) => route.fulfill({ contentType: "text/html", body: `<html><body>Protocol harness<script>window.commands=[];window.targetAcknowledged=true;window.prematurePause=false;addEventListener('message',event=>{commands.push(event.data);if(event.data.type==='pause'&&!targetAcknowledged)prematurePause=true;if(event.data.type==='seekTo'){targetAcknowledged=false;parent.postMessage({'x-tiktok-player':true,type:'onCurrentTime',value:{currentTime:event.data.value===63?65:70,duration:80}},'*');if(!window.dropAck)setTimeout(()=>{targetAcknowledged=true;parent.postMessage({'x-tiktok-player':true,type:'onCurrentTime',value:{currentTime:event.data.value,duration:80}},'*')},400)}});parent.postMessage({'x-tiktok-player':true,type:'onPlayerReady'},'*');setInterval(()=>parent.postMessage({'x-tiktok-player':true,type:'onCurrentTime',value:{currentTime:12,duration:80}},'*'),1000);</script></body></html>` }));
    const isolated = await harness.newPage();
    await isolated.goto(`${base}/creators`);
    const notes = isolated.locator("details").filter({ has: isolated.locator("#creator-caption") });
    await notes.locator("summary").click();
    await isolated.locator("#creator-timestamps").fill("00:00 Base\n00:10 Lips");
    await isolated.getByRole("button", { name: "Save and analyze text", exact: true }).click();
    await isolated.getByRole("button", { name: "0:00 Base", exact: true }).click();
    const frame = isolated.frames().find((item) => item.url().includes("tiktok.com/player/"));
    assert(frame);
    await frame.waitForFunction(() => window.commands.some((item) => item.type === "pause"), undefined, { timeout: 6000 });
    const commands = await frame.evaluate(() => window.commands);
    assert(commands.some((item) => item.type === "seekTo" && item.value === 0));
    assert(commands.some((item) => item.type === "play"));
    assert.equal(await frame.evaluate(() => window.prematurePause), false);
    await frame.evaluate(() => { window.dropAck = true; window.commands = []; });
    const recoveryStarted = Date.now();
    await isolated.getByRole("button", { name: "0:00 Base", exact: true }).click();
    await frame.waitForFunction(() => window.commands.some((item) => item.type === "pause"), undefined, { timeout: 5000 });
    assert(Date.now() - recoveryStarted >= 1400, "Ignore pre-seek samples during the settle window");
    await isolated.goto(`${base}/creators?video=7310866363613039874`);
    await isolated.locator('iframe[src*="7310866363613039874"]').waitFor();
    const reviewed = isolated.getByRole("region", { name: "Reviewed application steps", exact: true });
    await reviewed.getByRole("button", { name: "1:04 Lip application", exact: true }).click();
    const reviewedFrame = isolated.frames().find((item) => item.url().includes("tiktok.com/player/"));
    assert(reviewedFrame);
    await reviewedFrame.waitForFunction(() => window.commands.some((item) => item.type === "seekTo" && item.value === 64));
    const layers = isolated.getByTestId("creator-product-layers");
    await layers.getByRole("button", { name: "Lips", exact: true }).waitFor();
    assert.equal(await layers.getByRole("button", { name: "Lips", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await layers.locator("button small").count(), 2);
    assert.match(await isolated.getByTestId("creator-layer-detail").innerText(), /NUDESTIX.*Hydra Peptide Lip Butter/);
    await layers.getByRole("button", { name: "NUDESTIX Hydra Peptide Lip Butter", exact: true }).click();
    await reviewedFrame.waitForFunction(() => window.commands.some((item) => item.type === "seekTo" && item.value === 63));
    await reviewedFrame.waitForFunction(() => window.targetAcknowledged === true);
    assert.equal(await reviewedFrame.evaluate(() => window.prematurePause), false);
    const secondTab = await harness.newPage();
    await secondTab.goto(`${base}/creators?video=7310866363613039874`);
    await secondTab.getByRole("heading", { name: "@iam.chae", exact: true }).waitFor();
    await secondTab.getByRole("button", { name: "Remove video", exact: true }).click();
    await isolated.locator('iframe[src*="7518741157669653790"]').waitFor();
    const fallback = isolated.frames().find((item) => item.url().includes("7518741157669653790")) ?? await isolated.waitForEvent("framenavigated", { predicate: (item) => item.url().includes("7518741157669653790") });
    assert(fallback);
    await fallback.waitForFunction(() => Array.isArray(window.commands));
    await isolated.waitForTimeout(300);
    assert.equal(await fallback.evaluate(() => window.commands.some((item) => item.type === "seekTo")), false);
    await harness.close();
  });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "results.json"), JSON.stringify({ base, checks, errors, external, limitation: "Protocol harness validates controls only; actual TikTok playback depends on platform availability." }, null, 2));
  console.log(JSON.stringify({ status: "passed", checks: checks.length, external, output }));
} catch (error) {
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => undefined);
  await writeFile(path.join(output, "results.json"), JSON.stringify({ base, checks, errors, status: "failed", failure: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
