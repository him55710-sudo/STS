import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

const manifestPath = resolve(process.cwd(), "tests/fixtures/catalog/manifest.json");
const bluePath = resolve(process.cwd(), "tests/fixtures/catalog/blue-oxford-reference.jpg");
const greyPath = resolve(process.cwd(), "tests/fixtures/catalog/grey-blazer-hard-negative.jpg");

const manifestHash = "3FA6B3B9F19CBF17A618DF6D9368046A7799F776B584505D36780658649F07EB";

test("deterministic catalog link flow", async ({ page, request }) => {
  const manifestBytes = await readFile(manifestPath);
  expect(createHash("sha256").update(manifestBytes).digest("hex").toUpperCase()).toBe(manifestHash);

  let detectMode: "blue" | "grey" = "blue";
  await page.route("**/api/detect", async (route, request) => {
    await request.postDataJSON();
    const payload = detectMode === "grey"
      ? {
          objects: [
            {
              label: "blazer",
              labelKo: "grey blazer",
              category: "fashion",
              x: 0.27,
              y: 0.14,
              w: 0.46,
              h: 0.34,
              confidence: 0.91,
              tone: "#8a8c90",
              attributes: {
                brandCandidates: [],
                distinctiveFeatures: ["single-breasted blazer"],
              },
            },
          ],
          source: "gemini",
          provider: "test-stub",
          pipelineVersion: "fashion_v3",
        }
      : {
          objects: [
            {
              label: "garment",
              labelKo: "blue fashion item",
              category: "fashion",
              x: 0.24,
              y: 0.16,
              w: 0.48,
              h: 0.36,
              confidence: 0.97,
              tone: "#8ab8e8",
              attributes: {
                brandCandidates: [{ brand: "Polo Ralph Lauren", confidence: 0.98, evidence: ["button-down collar"] }],
                distinctiveFeatures: ["button-down collar", "Oxford weave"],
              },
            },
          ],
          source: "gemini",
          provider: "test-stub",
          pipelineVersion: "fashion_v3",
        };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });

  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "새 콘텐츠" })).toBeVisible();

  detectMode = "blue";
  await page.locator('input[type="file"]').setInputFiles(bluePath);
  await expect(page.getByText("상품 후보 보기 →").first()).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /blue fashion item/i }).click();
  const exactCandidate = page.getByRole("button", { name: /Polo Ralph Lauren/i }).filter({ hasText: "클래식 핏 옥스포드 셔츠 스카이 블루" });
  await expect(exactCandidate).toBeEnabled();
  await exactCandidate.click();
  await page.getByRole("button", { name: /발행하기 · 상품 1개 연결됨/ }).click();
  await expect(page.getByRole("button", { name: /게시물 보기/i })).toBeVisible();
  await page.getByRole("button", { name: /게시물 보기/i }).click();
  await expect(page.getByText("클래식 핏 옥스포드 셔츠 스카이 블루")).toHaveCount(0);
  await page.locator("main img").first().click();
  await expect(page.getByRole("heading", { name: "클래식 핏 옥스포드 셔츠 스카이 블루" })).toBeVisible();
  await expect(page.getByRole("button", { name: "검증된 판매처에서 구매하기" })).toBeVisible();
  await expect(page.getByText(/^제휴 \d+%$/)).toBeVisible();

  const offerResponse = await request.get("/go/offer/offer%3Acatalog%3Aplw-polo-oxford", {
    maxRedirects: 0,
  });
  expect([302, 307]).toContain(offerResponse.status());
  expect(offerResponse.headers()["location"]).toContain("/go/test-affiliate?offerId=offer%3Acatalog%3Aplw-polo-oxford");

  const affiliatePopupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "검증된 판매처에서 구매하기" }).click();
  const affiliatePopup = await affiliatePopupPromise;
  await affiliatePopup.waitForLoadState("domcontentloaded");
  const affiliatePopupUrl = new URL(affiliatePopup.url());
  expect(affiliatePopupUrl.pathname).toBe("/go/test-affiliate");
  expect(affiliatePopupUrl.searchParams.get("offerId")).toBe("offer:catalog:plw-polo-oxford");
  expect(affiliatePopupUrl.searchParams.get("destination")).toMatch(/^https:\/\//);
  await expect(affiliatePopup.locator("body")).toContainText('"kind":"test-affiliate"');

  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "새 콘텐츠" })).toBeVisible();

  detectMode = "grey";
  await page.locator('input[type="file"]').setInputFiles(greyPath);
  await expect(page.getByText("상품 후보 보기 →").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "검증된 판매처에서 구매하기" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /리뷰\/유사 상품만 보기/ })).toHaveCount(0);
});
