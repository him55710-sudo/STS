import { describe, expect, it } from "vitest";
import {
  buildPublicContentSelect,
  canSelectPublicSocialChild,
  canReadSocialContent,
  canUseSocialContentForCommerceMatching,
  filterReadableSocialContent,
  isPublicDisplayableContent,
  type SocialActor,
  type SocialContentRow,
  type SocialPublicChildTarget,
} from "../../lib/social-repository/content-repository";

type LabeledPublicChildTarget = {
  readonly label: string;
  readonly target: SocialPublicChildTarget;
};

describe("social content repository", () => {
  const now = new Date("2026-09-01T00:00:00.000Z");
  const anonymousActor: SocialActor = { kind: "anonymous" };
  const wrongOwnerActor: SocialActor = { kind: "user", userId: "user-wrong" };
  const ownerActor: SocialActor = { kind: "user", userId: "user-owner" };
  const adminActor: SocialActor = { kind: "admin", userId: "user-admin" };
  const serviceActor: SocialActor = { kind: "service_role" };

  const publishedRow: SocialContentRow = {
    id: "post-public",
    creatorId: "user-owner",
    visibility: "public",
    publishState: "published",
    displayState: "approved",
    publishedAt: "2026-08-31T00:00:00.000Z",
    expiresAt: null,
    rightsStatus: "approved",
    rightsExpiresAt: null,
    canDisplay: true,
    canUseForCommerceMatching: false,
    takedownAt: null,
  };

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

  it("hides public child surfaces when their parent rights expire or are taken down", () => {
    const expiredRightsRow: SocialContentRow = {
      ...publishedRow,
      id: "rights-expired-parent",
      rightsExpiresAt: "2026-08-31T23:59:59.000Z",
    };
    const takenDownRow: SocialContentRow = {
      ...publishedRow,
      id: "taken-down-parent",
      takedownAt: "2026-08-31T12:00:00.000Z",
    };

    const targetsWithExpiredRights: readonly LabeledPublicChildTarget[] = [
      {
        label: "story_group",
        target: {
          kind: "story_group",
          visibility: "public",
          publishState: "published",
          displayState: "approved",
          startsAt: "2026-08-31T00:00:00.000Z",
          expiresAt: "2026-09-02T00:00:00.000Z",
          storyItemParents: [expiredRightsRow],
        },
      },
      {
        label: "comment",
        target: { kind: "comment", parent: expiredRightsRow, moderationState: "approved", deletedAt: null },
      },
      { label: "post_object", target: { kind: "post_object", parent: expiredRightsRow } },
      {
        label: "repost",
        target: { kind: "repost", original: expiredRightsRow, repost: publishedRow, permissionState: "approved" },
      },
      { label: "media_asset", target: { kind: "media_asset", parent: expiredRightsRow, processingState: "ready" } },
      {
        label: "media_variant",
        target: {
          kind: "media_variant",
          parent: expiredRightsRow,
          mediaAssetProcessingState: "ready",
          variantProcessingState: "ready",
        },
      },
    ];

    const targetsWithTakedown: readonly LabeledPublicChildTarget[] = [
      {
        label: "story_group",
        target: {
          kind: "story_group",
          visibility: "public",
          publishState: "published",
          displayState: "approved",
          startsAt: "2026-08-31T00:00:00.000Z",
          expiresAt: "2026-09-02T00:00:00.000Z",
          storyItemParents: [takenDownRow],
        },
      },
      {
        label: "comment",
        target: { kind: "comment", parent: takenDownRow, moderationState: "approved", deletedAt: null },
      },
      { label: "post_object", target: { kind: "post_object", parent: takenDownRow } },
      {
        label: "repost",
        target: { kind: "repost", original: publishedRow, repost: takenDownRow, permissionState: "approved" },
      },
      { label: "media_asset", target: { kind: "media_asset", parent: takenDownRow, processingState: "ready" } },
      {
        label: "media_variant",
        target: {
          kind: "media_variant",
          parent: takenDownRow,
          mediaAssetProcessingState: "ready",
          variantProcessingState: "ready",
        },
      },
    ];

    const expiredRightsResults = Object.fromEntries(
      targetsWithExpiredRights.map(({ label, target }) => [label, canSelectPublicSocialChild(target, now)]),
    );
    const takenDownResults = Object.fromEntries(
      targetsWithTakedown.map(({ label, target }) => [label, canSelectPublicSocialChild(target, now)]),
    );

    expect(expiredRightsResults).toEqual({
      story_group: false,
      comment: false,
      post_object: false,
      repost: false,
      media_asset: false,
      media_variant: false,
    });
    expect(takenDownResults).toEqual({
      story_group: false,
      comment: false,
      post_object: false,
      repost: false,
      media_asset: false,
      media_variant: false,
    });
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
