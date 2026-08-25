/**
 * Vision pipeline 벤치마크 — class recall + silhouette(polygon) rate 측정.
 *
 * 사용법:
 *   1) 앱 dev 서버 실행 (기본 http://localhost:3111)
 *   2) node tests/vision/benchmark.js [--images <dir>] [--base <url>]
 *
 * fixtures/expected.json의 기대 클래스와 비교해
 * per-class recall, small-object recall, polygon rate를 출력한다.
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3111";
const IMG_DIR = process.argv.includes("--images")
  ? process.argv[process.argv.indexOf("--images") + 1]
  : path.join(__dirname, "../../public/looks");

const EXPECTED = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/expected.json"), "utf8"));
const SMALL = ["watch", "bracelet", "necklace", "earrings", "ring"];

// 라벨 → canonical (lib/vision-config FASHION_ONTOLOGY 축약판 — 벤치마크 독립 실행용)
const ONTOLOGY = {
  top: ["shirt","t-shirt","tee","blouse","sweater","knit","hoodie","sweatshirt","top","셔츠","티셔츠","니트","맨투맨","스웨트","상의"],
  outerwear: ["jacket","blazer","coat","cardigan","fleece","자켓","재킷","코트","플리스","아우터"],
  pants: ["pants","trousers","jeans","denim","joggers","바지","팬츠","청바지","데님","슬랙스","조거","하의","카고"],
  shorts: ["shorts","반바지"], skirt: ["skirt","스커트"], dress: ["dress","드레스","원피스"],
  shoes: ["shoe","sneaker","loafer","boot","heel","sandal","derby","clog","신발","스니커즈","로퍼","부츠","샌들","구두","운동화","클로그","더비","슈즈"],
  bag: ["bag","handbag","backpack","tote","crossbody","가방","백팩","크로스백","숄더백","백"],
  hat: ["hat","cap","beanie","모자","캡"], glasses: ["glasses","sunglasses","안경","선글라스"],
  belt: ["belt","벨트"], scarf: ["scarf","muffler","스카프","머플러","목도리"],
  watch: ["watch","시계","워치"], bracelet: ["bracelet","팔찌"], necklace: ["necklace","목걸이"],
  earrings: ["earring","귀걸이"], ring: ["ring","반지"],
};
function canonical(label) {
  const l = label.toLowerCase();
  const order = ["watch","bracelet","necklace","earrings","ring","glasses","belt","hat","scarf","shoes","bag","dress","skirt","shorts","outerwear","pants","top"];
  for (const c of order) if (ONTOLOGY[c].some((k) => l.includes(k))) return c;
  return "object";
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium",
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const results = {};
  for (const name of Object.keys(EXPECTED).filter((k) => !k.startsWith("_"))) {
    const file = path.join(IMG_DIR, `${name}.jpg`);
    if (!fs.existsSync(file)) { console.log(`skip ${name} (no image)`); continue; }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
    const t0 = Date.now();
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.waitForSelector("text=/오브젝트 \\d+개를 찾았어요|물건을 탭해서 직접/", { timeout: 150000 });
    const secs = (Date.now() - t0) / 1000;
    const rows = page.locator("div.stagger > div");
    const n = await rows.count();
    const labels = [];
    for (let i = 0; i < n; i++) labels.push((await rows.nth(i).locator("p").first().textContent()).replace(/신뢰도.*$/, "").trim());
    const polys = await page.evaluate(() => {
      const svg = document.querySelector("div.cursor-crosshair svg");
      return svg ? [...svg.children].map((el) => el.tagName).filter((t) => t === "path").length : 0;
    });
    const detected = labels.map(canonical);
    results[name] = { labels, detected, polygons: polys, objects: n, secs: +secs.toFixed(1) };
    console.log(`${name}: ${n} objects (${polys} silhouettes) in ${secs.toFixed(1)}s → [${labels.join(", ")}]`);
    await page.close();
  }
  await browser.close();

  // ── recall 집계 ──
  let hitAll = 0, expAll = 0, hitSmall = 0, expSmall = 0, polySum = 0, objSum = 0;
  const perClass = {};
  for (const [name, exp] of Object.entries(EXPECTED)) {
    if (name.startsWith("_") || !results[name]) continue;
    const det = results[name].detected;
    for (const cls of exp) {
      perClass[cls] = perClass[cls] || { hit: 0, total: 0 };
      perClass[cls].total++;
      expAll++;
      if (SMALL.includes(cls)) expSmall++;
      if (det.includes(cls)) {
        perClass[cls].hit++;
        hitAll++;
        if (SMALL.includes(cls)) hitSmall++;
      }
    }
    polySum += results[name].polygons;
    objSum += results[name].objects;
  }
  console.log("\n=== CLASS RECALL ===");
  for (const [cls, s] of Object.entries(perClass))
    console.log(`  ${cls.padEnd(10)} ${s.hit}/${s.total}`);
  console.log(`overall recall     : ${(hitAll / expAll * 100).toFixed(0)}% (${hitAll}/${expAll})`);
  console.log(`small-object recall: ${expSmall ? (hitSmall / expSmall * 100).toFixed(0) + `% (${hitSmall}/${expSmall})` : "n/a"}`);
  console.log(`silhouette rate    : ${(polySum / objSum * 100).toFixed(0)}% (${polySum}/${objSum} objects have polygon)`);
})();
