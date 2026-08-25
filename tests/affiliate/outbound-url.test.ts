import { describe, expect, it } from "vitest";
import { buildTrackedOutboundPath } from "../../lib/affiliate/outbound-url";

describe("tracked outbound paths", () => {
  it("encodes the product and preserves attribution context", () => {
    expect(buildTrackedOutboundPath("brand/product", { postId: "post 1", creatorId: "creator-1" }))
      .toBe("/go/brand%2Fproduct?postId=post+1&creatorId=creator-1");
  });

  it("omits empty optional context", () => {
    expect(buildTrackedOutboundPath("pl-samba", { postId: "", objectId: undefined })).toBe("/go/pl-samba");
  });
});
