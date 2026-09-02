import { describe, expect, it } from "vitest";
import type { MediaObjectTag, SocialRights, SocialSourceRecord } from "../../lib/types";
import {
  demoSource,
  exactTag,
  expectReviewOnly,
  licensedRights,
  officialEmbedSource,
  resolveTagGate,
} from "./content-tag-gate-fixtures";

function rights(overrides: Partial<SocialRights>): SocialRights {
  return { ...licensedRights, ...overrides };
}

describe("social content tag rights eligibility", () => {
  it.each([
    {
      name: "display is not permitted",
      rights: rights({ canDisplay: false }),
      reason: "do not permit display",
    },
    {
      name: "rights are pending",
      rights: rights({ status: "pending" }),
      reason: "media rights are pending",
    },
    {
      name: "rights are revoked",
      rights: rights({ status: "revoked" }),
      reason: "media rights are revoked",
    },
    {
      name: "rights are under takedown",
      rights: rights({ status: "takedown" }),
      reason: "media rights are takedown",
    },
    {
      name: "rights are blocked",
      rights: rights({ status: "blocked" }),
      reason: "media rights are blocked",
    },
    {
      name: "approved rights have passed their expiry",
      rights: rights({ expiresAt: "2020-01-01T00:00:00.000Z" }),
      reason: "media rights are expired",
    },
    {
      name: "commerce matching is not licensed",
      rights: rights({ canUseForCommerceMatching: false }),
      reason: "canUseForCommerceMatching",
    },
  ] satisfies readonly {
    readonly name: string;
    readonly rights: SocialRights;
    readonly reason: string;
  }[])("keeps a verified exact offer review-only when $name", ({ rights: socialRights, reason }) => {
    // Given
    const approvedExactOffer = resolveTagGate();

    // When
    const result = resolveTagGate({ rights: socialRights });

    // Then
    expect(approvedExactOffer.purchaseEligible).toBe(true);
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
    expect(result.reason).toContain(reason);
  });

  it.each([
    {
      name: "official embed source",
      rights: licensedRights,
      sourceRecord: officialEmbedSource,
      reason: "display-only",
    },
    {
      name: "official embed rights",
      rights: rights({ kind: "official_embed" }),
      sourceRecord: officialEmbedSource,
      reason: "display-only",
    },
    {
      name: "demo source",
      rights: licensedRights,
      sourceRecord: demoSource,
      reason: "display-only",
    },
    {
      name: "demo rights",
      rights: rights({ kind: "demo" }),
      sourceRecord: demoSource,
      reason: "display-only",
    },
  ] satisfies readonly {
    readonly name: string;
    readonly rights: SocialRights;
    readonly sourceRecord: SocialSourceRecord;
    readonly reason: string;
  }[])("blocks purchase CTAs for $name even with commerce matching true", ({ rights: socialRights, sourceRecord, reason }) => {
    // When
    const result = resolveTagGate({ rights: socialRights, sourceRecord });

    // Then
    expectReviewOnly(result);
    expect(result.reason).toContain(reason);
  });

  it.each([
    {
      name: "belongs to another asset",
      tag: { ...exactTag, ownerAssetId: "asset-other" },
      reason: "not owned",
    },
    {
      name: "has negative normalized geometry",
      tag: { ...exactTag, x: -0.01 },
      reason: "geometry",
    },
    {
      name: "extends past the asset boundary",
      tag: { ...exactTag, x: 0.72, w: 0.4 },
      reason: "geometry",
    },
  ] satisfies readonly {
    readonly name: string;
    readonly tag: MediaObjectTag;
    readonly reason: string;
  }[])("blocks purchase CTAs when the tag $name", ({ tag, reason }) => {
    // When
    const result = resolveTagGate({ tag });

    // Then
    expectReviewOnly(result);
    expect(result.matchState).toBe("exact");
    expect(result.reason).toContain(reason);
  });
});
