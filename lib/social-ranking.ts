import { isPublicDisplayableContent, type SocialContentRow } from "@/lib/social-repository";

export type SocialRankMode = "for_you" | "following";
export type SocialRankEventKind = "view" | "like" | "save" | "comment" | "share" | "repost";

export type SocialRankSourceQuality = {
  readonly trustScore: number;
  readonly attributionComplete: boolean;
};

export type SocialRankPost = SocialContentRow & {
  readonly category: string;
  readonly sourceQuality: SocialRankSourceQuality;
};

export type SocialRankEvent = {
  readonly kind: SocialRankEventKind;
  readonly actorId: string;
  readonly postId: string;
  readonly occurredAt: string;
  readonly value: number;
};

export type SocialRankFollow = {
  readonly followerId: string;
  readonly creatorId: string;
};

export type SocialRankInput = {
  readonly viewerId: string;
  readonly mode: SocialRankMode;
  readonly now: Date;
  readonly posts: readonly SocialRankPost[];
  readonly events: readonly SocialRankEvent[];
  readonly follows: readonly SocialRankFollow[];
};

export type SocialRankedPost = {
  readonly post: SocialRankPost;
  readonly score: number;
};

type EligibilityRequest = {
  readonly post: SocialRankPost;
  readonly now: Date;
  readonly mode: SocialRankMode;
  readonly followedCreators: ReadonlySet<string>;
};

const EVENT_WEIGHTS = {
  view: 0.2,
  like: 1,
  save: 2,
  comment: 3,
  share: 2.4,
  repost: 2.8,
} as const satisfies Record<SocialRankEventKind, number>;

export function rankSocialFeed(input: SocialRankInput): readonly SocialRankedPost[] {
  const followedCreators = new Set(input.follows.filter((follow) => follow.followerId === input.viewerId).map((follow) => follow.creatorId));
  const eligible = input.posts.filter((post) => isEligiblePost({ post, now: input.now, mode: input.mode, followedCreators }));
  const scored = eligible.map((post) => ({ post, score: scorePost(post, input.events, input.now) }));
  const ordered = scored.sort(compareRankedPosts);
  return diversifyByCreator(ordered);
}

function isEligiblePost(request: EligibilityRequest): boolean {
  if (!isPublicDisplayableContent(request.post, request.now)) return false;
  if (!request.post.sourceQuality.attributionComplete && request.post.sourceKind !== "user_upload" && request.post.sourceKind !== "demo_seed") return false;
  if (request.mode === "following" && !request.followedCreators.has(request.post.creatorId)) return false;
  return true;
}

function scorePost(post: SocialRankPost, events: readonly SocialRankEvent[], now: Date): number {
  return sourceQualityScore(post) + recencyScore(post, now) + eventsScore(post.id, events, now);
}

function sourceQualityScore(post: SocialRankPost): number {
  const boundedTrust = Math.min(Math.max(post.sourceQuality.trustScore, 0), 1);
  return boundedTrust * 2 + (post.sourceQuality.attributionComplete ? 0.5 : 0);
}

function recencyScore(post: SocialRankPost, now: Date): number {
  if (!post.publishedAt) return 0;
  const ageHours = Math.max(0, (now.getTime() - Date.parse(post.publishedAt)) / 3_600_000);
  return 1 / (1 + ageHours / 24);
}

function eventsScore(postId: string, events: readonly SocialRankEvent[], now: Date): number {
  return events
    .filter((event) => event.postId === postId)
    .reduce((score, event) => score + EVENT_WEIGHTS[event.kind] * event.value * eventFreshness(event.occurredAt, now), 0);
}

function eventFreshness(occurredAt: string, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - Date.parse(occurredAt)) / 3_600_000);
  return 1 / (1 + ageHours / 72);
}

function compareRankedPosts(left: SocialRankedPost, right: SocialRankedPost): number {
  const scoreDelta = right.score - left.score;
  if (scoreDelta !== 0) return scoreDelta;
  const rightPublished = right.post.publishedAt ? Date.parse(right.post.publishedAt) : 0;
  const leftPublished = left.post.publishedAt ? Date.parse(left.post.publishedAt) : 0;
  if (rightPublished !== leftPublished) return rightPublished - leftPublished;
  return left.post.id.localeCompare(right.post.id);
}

function diversifyByCreator(posts: readonly SocialRankedPost[]): readonly SocialRankedPost[] {
  const remaining = [...posts];
  const diversified: SocialRankedPost[] = [];
  while (remaining.length > 0) {
    const previousCreator = diversified.at(-1)?.post.creatorId ?? null;
    const pickIndex = previousCreator === null ? 0 : alternativeCreatorIndex(remaining, previousCreator);
    const picked = remaining.splice(pickIndex, 1)[0];
    if (picked) diversified.push(picked);
  }
  return diversified;
}

function alternativeCreatorIndex(posts: readonly SocialRankedPost[], previousCreator: string): number {
  if (posts[0]?.post.creatorId !== previousCreator) return 0;
  const alternative = posts.findIndex((post) => post.post.creatorId !== previousCreator);
  return alternative === -1 ? 0 : alternative;
}
