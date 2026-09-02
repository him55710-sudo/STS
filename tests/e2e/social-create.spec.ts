import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { z } from "zod";

const bluePath = resolve(process.cwd(), "tests/fixtures/catalog/blue-oxford-reference.jpg");
const greyPath = resolve(process.cwd(), "tests/fixtures/catalog/grey-blazer-hard-negative.jpg");
const evidenceDir = resolve(process.cwd(), ".omo/evidence/task-8-social-community");
const initiateBodySchema = z.object({ fileName: z.string() });
const completeBodySchema = z.object({ assetId: z.string() });

test("social create publishes only ready display-approved rights-safe uploaded assets", async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  let initiateCount = 0;
  let signedUploadCount = 0;
  let completeCount = 0;

  await page.route("**/api/detect", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });
  await page.route("**/api/media/initiate", async (route, request) => {
    initiateCount += 1;
    const body = initiateBodySchema.parse(request.postDataJSON());
    const key = body.fileName.includes("grey") ? "grey-blazer" : "blue-oxford";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        asset: {
          id: `media-${key}`,
          public_url: `https://cdn.example.test/media/${key}.jpg`,
          width: 900,
          height: 1200,
          processing_state: "uploaded",
        },
        upload: {
          uploadUrl: `https://uploads.example.test/${key}`,
          publicUrl: `https://cdn.example.test/media/${key}.jpg`,
          headers: { "content-type": "image/jpeg" },
        },
      }),
    });
  });
  await page.route("https://uploads.example.test/**", async (route) => {
    signedUploadCount += 1;
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route("**/api/media/complete", async (route, request) => {
    completeCount += 1;
    const body = completeBodySchema.parse(request.postDataJSON());
    const key = body.assetId.replace("media-", "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        asset: {
          id: body.assetId,
          public_url: `https://cdn.example.test/media/${key}.jpg`,
          width: 900,
          height: 1200,
          duration_ms: null,
          processing_state: "ready",
          processing_error: null,
          moderation_status: "approved",
        },
        status: "ready",
      }),
    });
  });

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/create");
  await page.locator('input[type="file"]').setInputFiles([bluePath, greyPath]);

  await expect(page.getByText("상품 후보 보기 →").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("처리 ready · 모더레이션 approved").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "발행 준비 필요" })).toBeDisabled();
  await page.locator("#creator-content-kind").selectOption("carousel");
  await page.getByLabel("출처 식별자").fill("camera-roll-social-create-e2e");
  await page.getByLabel("권리 근거").fill("creator owns both uploaded photos");
  await page.locator('input[id^="asset-alt-"]').nth(0).fill("Blue oxford shirt product photo");
  await page.locator('input[id^="asset-alt-"]').nth(1).fill("Grey blazer secondary product photo");
  await page.getByLabel("표시 승인").nth(0).setChecked(true);
  await page.getByLabel("표시 승인").nth(1).setChecked(true);

  await page.screenshot({ path: resolve(evidenceDir, "social-create-ready.png"), fullPage: true });
  await page.getByRole("button", { name: /^발행하기/ }).click();
  await expect(page.getByRole("heading", { name: "발행 완료" })).toBeVisible();
  expect(initiateCount).toBe(2);
  expect(signedUploadCount).toBe(2);
  expect(completeCount).toBe(2);

  const stored = await page.evaluate(() => window.localStorage.getItem("objet-store-v1") ?? "");
  expect(stored).toContain("https://cdn.example.test/media/blue-oxford.jpg");
  expect(stored).toContain("https://cdn.example.test/media/grey-blazer.jpg");
  expect(stored).toContain('"contentKind":"carousel"');
  expect(stored).not.toContain("data:image");
  expect(stored).not.toContain("blob:");
});
