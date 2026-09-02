import { describe, expect, it } from "vitest";
import { canWriteSocialChild, type SocialWriteChildTarget, type SocialContentRow } from "../../lib/social-repository/content-repository";
import { buildChildWriteRejectionResults } from "./social-write-policy-fixtures";
import { now, ownerActor, publishedRow, wrongOwnerActor } from "./content-repository-fixtures";

describe("social content repository child writes", () => {
  it("blocks child writes when referenced parents fail ownership, display, rights, or takedown checks", () => {
    const results = buildChildWriteRejectionResults({ ownerActor, wrongOwnerActor }, publishedRow, now);

    expect(results).toEqual({
      commentOnTakedown: false,
      reactionOnTakedown: false,
      repostFromTakedown: false,
      repostToExpiredDraft: false,
      repostToRejectedRightsDraft: false,
      storyItemFromWrongOwnerMedia: false,
      storyItemFromExpiredMedia: false,
      storyItemFromRejectedRightsMedia: false,
      officialEmbedObject: false,
    });
  });

  it("requires a fully displayable media parent when authoring a story item", () => {
    const pendingDisplayParent: SocialContentRow = {
      ...publishedRow,
      id: "pending-display-parent",
      displayState: "pending",
    };

    const result = canWriteSocialChild(
      ownerActor,
      {
        kind: "story_item",
        storyGroupCreatorId: ownerActor.userId,
        storyGroupDisplayState: "pending",
        mediaParent: pendingDisplayParent,
        postParent: null,
      },
      now,
    );

    expect(result).toBe(false);
  });

  it("allows story view writes only for the authenticated viewer and public active approved stories", () => {
    type StoryViewWriteTarget = Extract<SocialWriteChildTarget, { readonly kind: "story_view" }>;
    const storyViewTarget = (overrides: Partial<StoryViewWriteTarget> = {}): StoryViewWriteTarget => ({
      kind: "story_view",
      viewerId: ownerActor.userId,
      storyGroupVisibility: "public",
      storyGroupPublishState: "published",
      storyGroupDisplayState: "approved",
      storyGroupStartsAt: "2026-08-31T00:00:00.000Z",
      storyGroupExpiresAt: "2026-09-02T00:00:00.000Z",
      mediaAssetProcessingState: "ready",
      mediaParent: publishedRow,
      ...overrides,
    });
    const activeStoryView = storyViewTarget();
    const blockedTargets: readonly (readonly [string, StoryViewWriteTarget])[] = [
      ["wrongViewer", storyViewTarget({ viewerId: wrongOwnerActor.userId })],
      ["privateGroup", storyViewTarget({ storyGroupVisibility: "private" })],
      ["draftGroup", storyViewTarget({ storyGroupPublishState: "draft" })],
      ["pendingGroup", storyViewTarget({ storyGroupDisplayState: "pending" })],
      ["futureGroup", storyViewTarget({ storyGroupStartsAt: "2026-09-02T00:00:00.000Z" })],
      ["expiredGroup", storyViewTarget({ storyGroupExpiresAt: "2026-08-31T23:59:59.000Z" })],
      ["processingMedia", storyViewTarget({ mediaAssetProcessingState: "processing" })],
      ["privateParent", storyViewTarget({ mediaParent: { ...publishedRow, visibility: "private" } })],
      ["draftParent", storyViewTarget({ mediaParent: { ...publishedRow, publishState: "draft" } })],
      ["pendingParent", storyViewTarget({ mediaParent: { ...publishedRow, displayState: "pending" } })],
      ["expiredParent", storyViewTarget({ mediaParent: { ...publishedRow, expiresAt: "2026-08-31T23:59:59.000Z" } })],
      ["pendingRights", storyViewTarget({ mediaParent: { ...publishedRow, rightsStatus: "pending" } })],
      [
        "expiredRights",
        storyViewTarget({ mediaParent: { ...publishedRow, rightsExpiresAt: "2026-08-31T23:59:59.000Z" } }),
      ],
      ["hiddenRights", storyViewTarget({ mediaParent: { ...publishedRow, canDisplay: false } })],
      ["takedown", storyViewTarget({ mediaParent: { ...publishedRow, takedownAt: "2026-08-31T12:00:00.000Z" } })],
    ];

    const allowedResult = canWriteSocialChild(ownerActor, activeStoryView, now);
    const blockedResults = Object.fromEntries(
      blockedTargets.map(([label, target]) => [label, canWriteSocialChild(ownerActor, target, now)]),
    );

    expect(allowedResult).toBe(true);
    expect(blockedResults).toEqual({
      wrongViewer: false,
      privateGroup: false,
      draftGroup: false,
      pendingGroup: false,
      futureGroup: false,
      expiredGroup: false,
      processingMedia: false,
      privateParent: false,
      draftParent: false,
      pendingParent: false,
      expiredParent: false,
      pendingRights: false,
      expiredRights: false,
      hiddenRights: false,
      takedown: false,
    });
  });
});
