import { describe, expect, it } from "vitest";
import { canSelectPublicSocialChild, type SocialPublicChildTarget, type SocialContentRow } from "../../lib/social-repository/content-repository";
import { now, publishedRow } from "./content-repository-fixtures";

type LabeledPublicChildTarget = {
  readonly label: string;
  readonly target: SocialPublicChildTarget;
};

describe("social content repository child selection", () => {
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
});
