import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BEAUTY_QA_URL ?? "http://127.0.0.1:3201";
const output = path.resolve("output/beauty-commerce-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));

async function check(name, action) {
  await action();
  checks.push({ name, status: "passed" });
}
async function capture(name) {
  for (const image of await page.locator("main img").all()) {
    if (!(await image.isVisible())) continue;
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode().catch(() => undefined));
  }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: "disabled" });
  const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(geometry.scroll <= geometry.width + 1, `${name} overflows: ${JSON.stringify(geometry)}`);
}

try {
  await check("English home includes new playable application video", async () => {
    await page.goto(base);
    await page.locator("h1").waitFor();
    await page.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
    assert(await page.locator(".bc-feature-video video").evaluate((video) => video.duration >= 8.9 && video.duration <= 9.1));
  });
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await capture(`home-${width}-en`);
  }
  await check("Korean language persists after refresh", async () => {
    await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("ko");
    await page.reload();
    await page.getByRole("combobox", { name: "언어", exact: true }).waitFor();
    assert.match(await page.locator("h1").innerText(), /마음에 든 룩/);
  });
  await page.setViewportSize({ width: 375, height: 844 });
  await capture("home-375-ko");
  await check("Process step seeks, plays and stops at the chosen boundary", async () => {
    await page.goto(`${base}/look/glow-lip`);
    await page.waitForFunction(() => document.querySelector("video")?.readyState >= 2);
    await page.getByTestId("look-step-mirror-check").click();
    assert.match(page.url(), /step=mirror-check/);
    await page.waitForFunction(() => { const video = document.querySelector("video"); return video && video.paused && video.currentTime >= 8.9 && video.currentTime < 9.2; }, undefined, { timeout: 15000 });
    assert.equal(await page.getByTestId("look-step-mirror-check").getAttribute("aria-pressed"), "true");
  });
  await check("Saved look and product survive a reload", async () => {
    await page.getByRole("button", { name: "룩 저장", exact: true }).click();
    await page.getByRole("button", { name: "제품 저장", exact: true }).click();
    await page.goto(`${base}/saved`);
    assert.equal(await page.locator(".bc-look-card").count(), 1);
    await page.reload();
    await page.locator(".bc-look-card").waitFor();
    await page.goto(`${base}/saved?view=products`);
    await page.locator(".bc-shelf-item").waitFor();
    assert.equal(await page.locator(".bc-shelf-item").count(), 1);
    await capture("saved-375-ko");
  });
  await check("Shade selection changes the explicitly labeled merchant search", async () => {
    await page.goto(`${base}/look/glow-lip?step=mirror-check`);
    await page.waitForFunction(() => { const video = document.querySelector("video"); return video && video.paused && Math.abs(video.currentTime - 5.5) < 0.1; });
    await page.getByRole("button", { name: "#22 Pomelo Skin", exact: true }).click();
    const destination = await page.getByRole("link", { name: "Lazada 베트남에서 검색" }).getAttribute("href");
    assert.match(decodeURIComponent(destination), /#22 Pomelo Skin/);
    assert.equal(new URL(destination).hostname, "www.lazada.vn");
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[aria-label="#22 Pomelo Skin"]')?.getAttribute("aria-pressed") === "true");
  });
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await capture(`look-${width}-ko`);
  }
  await check("Search empty state and product filtering work", async () => {
    await page.goto(`${base}/discover?view=products`);
    await page.getByRole("textbox", { name: "콘텐츠 검색" }).fill("no-result-xyz");
    await page.getByRole("heading", { name: "아직 맞는 결과가 없어요." }).waitFor();
    await capture("empty-1280-ko");
    await page.getByRole("button", { name: "검색어 지우기", exact: true }).first().click();
    await page.getByRole("textbox", { name: "콘텐츠 검색" }).fill("Torriden");
    assert.equal(await page.locator(".bc-product-menu>button").count(), 1);
  });
  await check("Fashion archive remains accessible", async () => {
    await page.goto(`${base}/discover?category=fashion`);
    assert((await page.locator('a[href^="/post/"]').count()) >= 10);
    await page.locator('a[href^="/post/"]').first().click();
    await page.waitForURL(/\/post\//);
    assert.match(page.url(), /\/post\//);
  });
  await check("Legacy entry routes resolve to unified experiences", async () => {
    for (const [route, destination] of [["/feed", "/"], ["/demo", "/"], ["/beauty-demo", "/look/glow-lip"], ["/reels", "/look/glow-lip"]]) {
      await page.goto(base + route);
      assert.equal(new URL(page.url()).pathname, destination);
    }
  });
  await check("Video failures offer retry without hiding product information", async () => {
    await page.route("**/beauty-media/*.mp4", (route) => route.abort());
    await page.goto(`${base}/look/glow-lip`);
    await page.getByTestId("look-detail").getByRole("alert").waitFor();
    await page.getByRole("button", { name: "다시 시도", exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Lazada 베트남에서 검색" }).count(), 1);
    await page.unroute("**/beauty-media/*.mp4");
  });
  await check("Unknown looks render an actual 404", async () => {
    const response = await page.goto(`${base}/look/unknown-look`);
    assert.equal(response.status(), 404);
  });
  assert.deepEqual(errors, [], "Unexpected browser errors");
  await writeFile(path.join(output, "results.json"), JSON.stringify({ base, checks, errors }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, status: "passed", output }));
} finally {
  await browser.close();
}
