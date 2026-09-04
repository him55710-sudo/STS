// STS X배너 렌더 스크립트
// 사용법: node marketing/x-banner/render.mjs
// 출력: sts-x-banner-600x1800.pdf (벡터, 인쇄용), sts-x-banner-600x1800@150dpi.png, preview.png
// 요구: playwright (전역 또는 로컬), Chromium, Pretendard 폰트(시스템 설치 또는 CDN)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/node22/lib/node_modules/playwright"));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const variants = [
  { html: "sts-x-banner-600x1800.html", suffix: "" },
];
const only = process.argv[2]; // 선택: "light" | "dark"

const MM_TO_PX = 96 / 25.4; // CSS px per mm
const W_MM = 600;
const H_MM = 1800;
const W = Math.round(W_MM * MM_TO_PX); // 2268
const H = Math.round(H_MM * MM_TO_PX); // 6803

const browser = await chromium.launch();
for (const v of variants) {
  if (only && !v.html.includes(only === "dark" ? "-dark" : "1800.html")) continue;
  const url = "file://" + path.join(here, v.html);

  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  
  // 1) 인쇄용 PDF — 페이지 크기 600×1800mm, 벡터 텍스트
  await page.pdf({
    path: path.join(here, `sts-x-banner-600x1800${v.suffix}.pdf`),
    width: `${W_MM}mm`,
    height: `${H_MM}mm`,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  
  // 2) 150dpi PNG (3543 × 10630 px) — 대형 출력용 래스터
  const scale150 = 150 / 96;
  const page150 = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale150 });
  await page150.goto(url, { waitUntil: "networkidle" });
  await page150.evaluate(() => document.fonts.ready);
  await page150.waitForTimeout(300);
  await page150.screenshot({ path: path.join(here, `sts-x-banner-600x1800${v.suffix}@150dpi.png`), fullPage: false });
  
  // 3) 미리보기 PNG (세로 2400px)
  const previewScale = 2400 / H;
  const pagePrev = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: previewScale });
  await pagePrev.goto(url, { waitUntil: "networkidle" });
  await pagePrev.evaluate(() => document.fonts.ready);
  await pagePrev.waitForTimeout(300);
  await pagePrev.screenshot({ path: path.join(here, `preview${v.suffix}.png`), fullPage: false });
  
  
  for (const f of [`sts-x-banner-600x1800${v.suffix}.pdf`, `sts-x-banner-600x1800${v.suffix}@150dpi.png`, `preview${v.suffix}.png`]) {
    const st = fs.statSync(path.join(here, f));
    console.log(`${f}\t${(st.size / 1024 / 1024).toFixed(2)} MB`);
  }
}
await browser.close();