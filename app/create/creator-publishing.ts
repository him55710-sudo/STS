import type {
  ContentKind,
  MediaAssetKind,
  SocialDisclosureKind,
  SocialMediaAsset,
  SocialRights,
  SocialSourceKind,
} from "@/lib/types";
import type { ProductCandidate } from "@/lib/retrieval";
import type { Exactness } from "@/lib/types";

export const CREATOR_CONTENT_KIND_OPTIONS = [
  { value: "photo", label: "사진" },
  { value: "carousel", label: "캐러셀" },
  { value: "reel", label: "릴스" },
  { value: "video", label: "비디오" },
  { value: "story", label: "스토리" },
  { value: "lookbook", label: "룩북" },
] as const satisfies readonly { readonly value: ContentKind; readonly label: string }[];

export const CREATOR_DISCLOSURE_OPTIONS = [
  { value: "none", label: "없음" },
  { value: "affiliate", label: "제휴" },
  { value: "sponsored", label: "스폰서" },
  { value: "editorial", label: "에디토리얼" },
  { value: "official", label: "공식" },
  { value: "partner", label: "파트너" },
] as const satisfies readonly { readonly value: SocialDisclosureKind; readonly label: string }[];

export const CREATOR_RIGHTS_KIND_OPTIONS = [
  { value: "user_owned", label: "직접 촬영" },
  { value: "licensed", label: "라이선스 보유" },
] as const satisfies readonly { readonly value: SocialRights["kind"]; readonly label: string }[];

export type CreatorMediaAssetState =
  | "queued"
  | "uploading"
  | "processing"
  | "ready"
  | "blocked"
  | "failed";

export type CreatorModerationState = "pending" | "approved" | "rejected";

export type CreatorAssetReviewState = "review" | "approved" | "unverified";

export type CreatorUploadedAsset = {
  readonly localId: string;
  readonly assetId: string | null;
  readonly fileName: string;
  readonly kind: MediaAssetKind;
  readonly previewUrl: string;
  readonly publicUrl: string | null;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number | null;
  readonly uploadState: CreatorMediaAssetState;
  readonly moderationState: CreatorModerationState;
  readonly reviewState: CreatorAssetReviewState;
  readonly displayApproved: boolean;
  readonly altText: string;
  readonly candidates: readonly ProductCandidate[];
  readonly error: string | null;
};

export type CreatorPublishMetadata = {
  readonly contentKind: ContentKind;
  readonly sourceKind: SocialSourceKind;
  readonly sourceProvider: string;
  readonly sourceIdentity: string;
  readonly disclosureKind: SocialDisclosureKind;
  readonly disclosureLabel: string;
  readonly rightsKind: SocialRights["kind"];
  readonly rightsEvidence: string;
};

export type CreatorPublishGate =
  | { readonly kind: "ready"; readonly assets: readonly CreatorUploadedAsset[] }
  | { readonly kind: "blocked"; readonly reason: string };

export function createDefaultPublishMetadata(): CreatorPublishMetadata {
  return {
    contentKind: "photo",
    sourceKind: "user_upload",
    sourceProvider: "STS Creator Studio",
    sourceIdentity: "",
    disclosureKind: "none",
    disclosureLabel: "",
    rightsKind: "user_owned",
    rightsEvidence: "",
  };
}

export function isRightsSafe(metadata: CreatorPublishMetadata): boolean {
  return metadata.rightsEvidence.trim().length > 0 && metadata.sourceIdentity.trim().length > 0;
}

export function resolveCandidateExactness(candidate: ProductCandidate, requested: Exactness): Exactness {
  if (requested !== "exact") return requested;
  return candidate.tier === "exact" && candidate.catalogProductId ? "exact" : "review";
}

export function getCreatorPublishGate(
  metadata: CreatorPublishMetadata,
  assets: readonly CreatorUploadedAsset[]
): CreatorPublishGate {
  if (!isRightsSafe(metadata)) return { kind: "blocked", reason: "출처와 권리 근거를 입력해야 합니다." };

  const readyAssets = assets.filter(isCreatorAssetPublishable);
  if (readyAssets.length === 0) return { kind: "blocked", reason: "발행 가능한 미디어가 없습니다." };

  switch (metadata.contentKind) {
    case "photo":
    case "story":
    case "lookbook":
      return { kind: "ready", assets: readyAssets.slice(0, 1) };
    case "carousel":
      return readyAssets.length >= 2
        ? { kind: "ready", assets: readyAssets }
        : { kind: "blocked", reason: "캐러셀은 준비된 미디어가 2개 이상 필요합니다." };
    case "reel":
    case "video":
      return readyAssets.some((asset) => asset.kind === "video")
        ? { kind: "ready", assets: readyAssets.filter((asset) => asset.kind === "video").slice(0, 1) }
        : { kind: "blocked", reason: "비디오 콘텐츠는 승인된 영상 미디어가 필요합니다." };
    default:
      return assertNever(metadata.contentKind);
  }
}

export function isCreatorAssetPublishable(asset: CreatorUploadedAsset): boolean {
  return (
    asset.assetId !== null &&
    asset.publicUrl !== null &&
    asset.uploadState === "ready" &&
    asset.moderationState === "approved" &&
    asset.reviewState === "approved" &&
    asset.displayApproved &&
    asset.altText.trim().length > 0
  );
}

export function toSocialMediaAsset(asset: CreatorUploadedAsset, order: number): SocialMediaAsset {
  return {
    id: asset.assetId ?? asset.localId,
    order,
    kind: asset.kind,
    url: asset.publicUrl ?? "",
    dimensions: { width: asset.width, height: asset.height },
    poster: null,
    durationMs: asset.durationMs,
    manifest: null,
    objectTags: [],
  };
}

function assertNever(value: never): never {
  throw new Error(`unexpected creator content kind: ${JSON.stringify(value)}`);
}
