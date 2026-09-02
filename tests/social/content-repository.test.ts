import { describe, expect, it } from "vitest";
import {
  buildPublicContentSelect,
  canReadSocialContent,
  canUseSocialContentForCommerceMatching,
  filterReadableSocialContent,
  isPublicDisplayableContent,
  type SocialActor,
  type SocialContentRow,
} from "../../lib/social-repository/content-repository";
import { adminActor, anonymousActor, now, ownerActor, publishedRow, serviceActor, wrongOwnerActor } from "./content-repository-fixtures";

describe("social content repository", () => {
  it("returns true when published content is display-approved and non-expired", () => {
    const result = isPublicDisplayableContent(publishedRow, now);

    expect(result).toBe(true);
  });

  it("returns false when public content is private, pending, expired, or taken down", () => {
    const cases: readonly SocialContentRow[] = [
      { ...publishedRow, id: "private", visibility: "private" },
      { ...publishedRow, id: "draft", publishState: "draft", publishedAt: null },
      { ...publishedRow, id: "pending-display", displayState: "pending" },
      { ...publishedRow, id: "expired", expiresAt: "2026-08-31T23:59:59.000Z" },
      { ...publishedRow, id: "rights-pending", rightsStatus: "pending" },
      { ...publishedRow, id: "rights-expired", rightsExpiresAt: "2026-08-31T23:59:59.000Z" },
      { ...publishedRow, id: "cannot-display", canDisplay: false },
      { ...publishedRow, id: "taken-down", takedownAt: "2026-08-31T12:00:00.000Z" },
    ];

    const results = cases.map((row) => isPublicDisplayableContent(row, now));

    expect(results).toEqual([false, false, false, false, false, false, false, false]);
  });

  it("evaluates actor reads against anonymous, wrong owner, owner, admin, and service role", () => {
    const privateDraft: SocialContentRow = {
      ...publishedRow,
      id: "owner-draft",
      visibility: "private",
      publishState: "draft",
      displayState: "pending",
      publishedAt: null,
      canDisplay: false,
    };

    const actors: readonly SocialActor[] = [anonymousActor, wrongOwnerActor, ownerActor, adminActor, serviceActor];
    const publicReadResults = actors.map((actor) => canReadSocialContent(actor, publishedRow, now));
    const privateDraftResults = actors.map((actor) => canReadSocialContent(actor, privateDraft, now));

    expect(publicReadResults).toEqual([true, true, true, true, true]);
    expect(privateDraftResults).toEqual([false, false, true, true, true]);
  });

  it("filters repository rows through the actor-aware read policy", () => {
    const rows: readonly SocialContentRow[] = [
      publishedRow,
      {
        ...publishedRow,
        id: "blocked-post",
        displayState: "blocked",
      },
      {
        ...publishedRow,
        id: "owner-private",
        visibility: "private",
      },
    ];

    const anonymousRows = filterReadableSocialContent(anonymousActor, rows, now);
    const ownerRows = filterReadableSocialContent(ownerActor, rows, now);

    expect(anonymousRows.map((row) => row.id)).toEqual(["post-public"]);
    expect(ownerRows.map((row) => row.id)).toEqual(["post-public", "blocked-post", "owner-private"]);
  });

  it("allows commerce matching only for admin or service actors when rights permit it", () => {
    const matchableRow: SocialContentRow = {
      ...publishedRow,
      id: "matchable",
      canUseForCommerceMatching: true,
    };
    const actors: readonly SocialActor[] = [anonymousActor, wrongOwnerActor, ownerActor, adminActor, serviceActor];
    const results = actors.map((actor) => canUseSocialContentForCommerceMatching(actor, matchableRow, now));

    expect(results).toEqual([false, false, false, true, true]);
  });

  it("keeps display approval separate from commerce matching eligibility", () => {
    const officialEmbedRow: SocialContentRow = {
      ...publishedRow,
      id: "official-embed",
      sourceKind: "official_embed",
      canDisplay: true,
      canUseForCommerceMatching: true,
    };

    expect(isPublicDisplayableContent(officialEmbedRow, now)).toBe(true);
    expect(canUseSocialContentForCommerceMatching(serviceActor, officialEmbedRow, now)).toBe(false);
  });

  it("selects source, rights, and media state fields needed by public feed callers", () => {
    const select = buildPublicContentSelect();

    expect(select).toContain("content_kind");
    expect(select).toContain("content_sources");
    expect(select).toContain("content_rights");
    expect(select).toContain("media_assets");
    expect(select).toContain("media_variants");
    expect(select).toContain("can_use_for_commerce_matching");
  });
});
