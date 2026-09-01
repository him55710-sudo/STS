import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTrackedCustomOutboundPath,
  buildTrackedOutboundPath,
  buildTrackedProductOfferPath,
} from "../../lib/affiliate/outbound-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tracked outbound paths", () => {
  it("encodes the product and preserves attribution context", () => {
    expect(buildTrackedOutboundPath("brand/product", { postId: "post 1", creatorId: "creator-1" }))
      .toBe("/go/brand%2Fproduct?postId=post+1&creatorId=creator-1");
  });

  it("omits empty optional context", () => {
    expect(buildTrackedOutboundPath("pl-samba", { postId: "", objectId: undefined })).toBe("/go/pl-samba");
  });

  it("routes a catalog product to its verified canonical offer", () => {
    vi.stubEnv("CATALOG_E2E_FIXTURES", "1");

    expect(buildTrackedProductOfferPath("pl-polo-oxford", { creatorId: "creator-1" }))
      .toBe("/go/offer/offer%3Acatalog%3Aplw-polo-oxford?creatorId=creator-1");
    expect(buildTrackedProductOfferPath("pl-samba")).toBeNull();
  });

  it("keeps a custom affiliate destination inside the tracked redirect", () => {
    const path = buildTrackedCustomOutboundPath(
      "custom-aliexpress-1",
      "https://s.click.aliexpress.com/e/example?sku=1",
      { postId: "post-1", objectId: "object-1" }
    );
    const url = new URL(path, "https://sts.example");

    expect(url.pathname).toBe("/go/custom-aliexpress-1");
    expect(url.searchParams.get("destinationUrl")).toBe("https://s.click.aliexpress.com/e/example?sku=1");
    expect(url.searchParams.get("postId")).toBe("post-1");
    expect(url.searchParams.get("objectId")).toBe("object-1");
  });
});
