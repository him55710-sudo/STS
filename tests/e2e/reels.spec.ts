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

test("reels route renders repository media as fullscreen poster-first snap feed", async ({ page }) => {
  // Given
  await mkdir(evidenceDir, { recursive: true });
  await page.route("https://unpkg.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });

  // When
  await page.goto("/reels");
  const feed = page.getByTestId("reel-feed");
  const firstPoster = page.locator("article img").first();
  const posterSrc = await firstPoster.getAttribute("src");

  // Then
  await expect(page.getByText("Reels")).toBeVisible();
  await expect(feed).toHaveCSS("scroll-snap-type", /y mandatory/);
  expect(posterSrc).toContain("/looks/");
  await expect(page.getByText(/Demo fixture · sts-local-social-seed/).first()).toBeVisible();
  await page.getByRole("button", { name: "fashion" }).first().click();
  await expect(page.getByText("Media rights")).toBeVisible();
  await page.getByRole("button", { name: "태그 시트 닫기" }).click();
  await hideDiagnosticOverlays(page);
  await page.screenshot({ path: resolve(evidenceDir, "reels-mobile.png"), fullPage: false });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: resolve(evidenceDir, "reels-tablet.png"), fullPage: false });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: resolve(evidenceDir, "reels-desktop.png"), fullPage: false });
});

test("reels navigation exposes the route from feed chrome", async ({ page }) => {
  // Given
  await mkdir(evidenceDir, { recursive: true });
  await page.route("https://unpkg.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });

  // When
  await page.goto("/feed");
  await hideDiagnosticOverlays(page);
  await page.getByRole("link", { name: "릴스" }).click();

  // Then
  await expect(page).toHaveURL(/\/reels$/);
  await expect(page.getByText("Reels")).toBeVisible();
  await hideDiagnosticOverlays(page);
  await page.screenshot({ path: resolve(evidenceDir, "reels-from-nav-mobile.png"), fullPage: false });
});
