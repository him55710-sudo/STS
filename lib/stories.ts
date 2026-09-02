import seedManifestJson from "../data/social/seed-manifest.json";
import { socialSeedManifestSchema, type SocialSeedRecord } from "./social-seed/schemas";
import type { Category, Creator, MediaObjectTag, SocialDisclosure, SocialMediaAsset, SocialRights, SocialSourceRecord } from "./types";

export type StoryDirection = "previous" | "next";

export type ManualStoryNavigation = {
  readonly currentIndex: number;
  readonly direction: StoryDirection;
  readonly storyCount: number;
};

export type Story = {
  readonly id: string;
  readonly storyGroupId: string;
  readonly creatorId: string;
  readonly creator: Creator;
  readonly image: string;
  readonly contentKind: "story";
  readonly assets: readonly SocialMediaAsset[];
  readonly sourceRecord: SocialSourceRecord;
  readonly disclosure: SocialDisclosure;
  readonly rights: SocialRights;
  readonly category: Category;
  readonly title: string;
  readonly subtitle: string;
  readonly productCount: number;
  readonly postedLabel: string;
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly seenAt: string | null;
  readonly is_demo: true;
  readonly source: "demo-seed";
};

export type StoryViewRecord = {
  readonly storyId: string;
  readonly viewerSessionId: string;
  readonly viewedAt: string;
  readonly idempotent: boolean;
};

type StoryViewWrite = {
  readonly storyId: string;
  readonly viewerSessionId: string;
  readonly viewedAt: Date;
};

const REPOSITORY_STORY_DISCLOSURE = {
  kind: "none",
  label: null,
} as const satisfies SocialDisclosure;

const REPOSITORY_STORY_RIGHTS = {
  kind: "demo",
  status: "approved",
  canDisplay: true,
  canUseForCommerceMatching: false,
  canRedistribute: false,
  evidence: "STS local demo story seed; not a production commerce or rights claim.",
  expiresAt: null,
} as const satisfies SocialRights;

const manifest = socialSeedManifestSchema.parse(seedManifestJson);
const storyViews = new Map<string, StoryViewRecord>();

export function getRepositorySeedRecords(): readonly SocialSeedRecord[] {
  return manifest.records;
}

function storyAsset(record: SocialSeedRecord): SocialMediaAsset {
  const asset = record.media.assets[0];
  if (!asset) throw new Error(`Repository story ${record.id} has no media asset.`);
  return {
    id: asset.id,
    order: asset.order,
    kind: asset.kind,
    url: asset.url,
    dimensions: asset.dimensions,
    poster: asset.poster,
    durationMs: asset.durationMs,
    manifest: null,
    objectTags: objectTagsForAsset(asset.id, record.tags),
  };
}

function objectTagsForAsset(assetId: string, tags: readonly string[]): readonly MediaObjectTag[] {
  return tags.slice(0, 3).map((tag, index) => ({
    id: `${assetId}-tag-${index + 1}`,
    ownerAssetId: assetId,
    label: tag.replaceAll("-", " "),
    x: 0.18 + index * 0.18,
    y: 0.22 + index * 0.08,
    w: 0.18,
    h: 0.12,
    productId: null,
    exactness: "unverified",
    confidence: 0.6,
  }));
}

function storyWindow(index: number): Pick<Story, "startsAt" | "expiresAt"> {
  const startsAt = new Date();
  startsAt.setMinutes(0, 0, 0);
  startsAt.setHours(startsAt.getHours() - index);
  const expiresAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1_000);
  return { startsAt: startsAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

function storyCreator(record: SocialSeedRecord): Creator {
  return {
    id: record.creator.id,
    handle: record.creator.handle,
    name: record.creator.displayName,
    bio: record.creator.rightsEvidence,
    followers: 0,
    category: record.category,
    tone: "#5B556E",
    avatarImage: record.media.assets[0]?.url,
    verified: false,
    is_demo: true,
    source: "demo-seed",
  };
}

function repositoryStory(record: SocialSeedRecord, index: number): Story {
  const asset = storyAsset(record);
  const window = storyWindow(index);
  return {
    id: record.id,
    storyGroupId: `story-group-${record.creator.id}`,
    creatorId: record.creator.id,
    creator: storyCreator(record),
    image: asset.poster?.url ?? asset.url,
    contentKind: "story",
    assets: [asset],
    sourceRecord: {
      kind: record.source.kind,
      provider: record.source.provider,
      identity: record.source.identity,
      canonicalUrl: record.source.canonicalUrl,
    },
    disclosure: REPOSITORY_STORY_DISCLOSURE,
    rights: { ...REPOSITORY_STORY_RIGHTS, evidence: record.rights.evidence },
    category: record.category satisfies Category,
    title: titleForRecord(record),
    subtitle: record.caption,
    productCount: asset.objectTags.length,
    postedLabel: "Repository story",
    startsAt: window.startsAt,
    expiresAt: window.expiresAt,
    seenAt: null,
    is_demo: true,
    source: "demo-seed",
  };
}

export function getManualStoryIndex({
  currentIndex,
  direction,
  storyCount,
}: ManualStoryNavigation): number {
  if (storyCount <= 0) return 0;

  switch (direction) {
    case "previous":
      return Math.max(0, currentIndex - 1);
    case "next":
      return Math.min(storyCount - 1, currentIndex + 1);
    default:
      return assertNever(direction);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected story direction: ${value}`);
}

function titleForRecord(record: SocialSeedRecord): string {
  return `${record.category} ${record.contentKind} ${record.id.slice(-3)}`;
}

function storyViewKey(write: Pick<StoryViewWrite, "storyId" | "viewerSessionId">): string {
  return `${write.viewerSessionId}:${write.storyId}`;
}

export function recordStoryViewOnce(write: StoryViewWrite): StoryViewRecord {
  const key = storyViewKey(write);
  const existing = storyViews.get(key);
  if (existing) return { ...existing, idempotent: true };

  const record = {
    storyId: write.storyId,
    viewerSessionId: write.viewerSessionId,
    viewedAt: write.viewedAt.toISOString(),
    idempotent: false,
  } satisfies StoryViewRecord;
  storyViews.set(key, record);
  return record;
}

export function resetStoryViewRecordsForTests(): void {
  storyViews.clear();
}

export const REPOSITORY_STORIES: readonly Story[] = manifest.records
  .filter((record) => record.contentKind === "story")
  .slice(0, 8)
  .map(repositoryStory);
