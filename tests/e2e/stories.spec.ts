import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const evidenceDir = resolve(process.cwd(), ".omo/evidence/task-7-social-community");
const hideDiagnosticOverlayCss = `
  [class*="react-scan"],
  [class*="react-grab"],
  [id*="react-scan"],
  [id*="react-grab"],
  [data-react-scan],
  [data-react-grab],
  [data-nextjs-dev-tools-button],
  [data-nextjs-toast],
  [style*="position: fixed"],
  [style*="z-index: 214748"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }
`;

async function hideDiagnosticOverlays(page: Page): Promise<void> {
  await page.addStyleTag({ content: hideDiagnosticOverlayCss });
  await page.evaluate(() => {
    const clean = (root: ParentNode): void => {
      for (const element of Array.from(root.querySelectorAll("*"))) {
      const text = element.textContent ?? "";
      const className = typeof element.className === "string" ? element.className : "";
      const style = window.getComputedStyle(element);
      const zIndex = Number.parseInt(style.zIndex, 10);
      const diagnosticText = text.includes("FPS") || text.includes("StoryViewer") || text.includes("StoryRail");
      const diagnosticBadge = text.trim() === "N";
      const diagnosticName = element.id.includes("react-scan") || element.id.includes("react-grab") || className.includes("react-scan") || className.includes("react-grab");
      if (diagnosticName || diagnosticBadge || Number.isFinite(zIndex) && zIndex >= 2_147_000_000 || diagnosticText && style.position === "fixed") element.remove();
      if (element.shadowRoot) clean(element.shadowRoot);
    }
    };
    clean(document.body);
  });
}

test("story viewer supports timed keyboard tap swipe pause and reduced motion", async ({ page }) => {
  // Given
  await mkdir(evidenceDir, { recursive: true });
  await page.route("https://unpkg.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  // When
  await page.goto("/feed");
  await page.getByRole("button", { name: /@sts_seed_03 스토리 열기/ }).click();

  // Then
  const viewer = page.getByTestId("story-viewer");
  await expect(viewer).toHaveAttribute("data-reduced-motion", "true");
  await expect(viewer).toHaveAttribute("data-story-id", "social-seed-interior-003");
  await page.waitForTimeout(5_500);
  await expect(viewer).toHaveAttribute("data-story-id", "social-seed-interior-003");
  await expect(page.getByText(/Demo fixture · sts-local-social-seed/)).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(viewer).toHaveAttribute("data-story-id", "social-seed-beauty-007");

  await page.keyboard.press("ArrowLeft");
  await expect(viewer).toHaveAttribute("data-story-id", "social-seed-interior-003");

  await page.getByRole("button", { name: "다음 스토리" }).click();
  await expect(viewer).toHaveAttribute("data-story-id", "social-seed-beauty-007");

  const progressBeforePause = await page.getByTestId("story-progress-active").getAttribute("style");
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  await expect(page.getByTestId("story-progress-active")).toHaveAttribute("style", progressBeforePause ?? "");
  await page.keyboard.press("Space");

  await page.getByRole("button", { name: "beauty" }).click();
  await expect(page.getByText("Media rights")).toBeVisible();
  await page.getByRole("button", { name: "태그 시트 닫기" }).click();

  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await page.mouse.up();
  }
  await expect(viewer).toHaveAttribute("data-story-id", "social-seed-fashion-011");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await hideDiagnosticOverlays(page);
  await page.screenshot({ path: resolve(evidenceDir, "stories-mobile.png"), fullPage: false });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: resolve(evidenceDir, "stories-tablet.png"), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: resolve(evidenceDir, "stories-desktop.png"), fullPage: false });

  await page.getByRole("button", { name: "스토리 닫기" }).click();
  await expect(page.getByRole("button", { name: /@sts_seed_03 스토리 열기 · 본 스토리/ })).toBeVisible();
});
