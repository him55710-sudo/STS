import { z } from "zod";
import { geminiImagesJson, type GeminiInlineImage } from "../llm/gemini";
import { MATCH_TIERS } from "../vision-config";

const MAX_CANDIDATES = 3;
const MAX_REMOTE_IMAGE_BYTES = 2 * 1024 * 1024;

const verificationSchema = z.object({
  matches: z.array(z.object({
    index: z.number().int().min(0),
    visualSimilarity: z.number().min(0).max(1),
    sameProductProbability: z.number().min(0).max(1),
    evidence: z.array(z.string()).max(5).default([]),
    conflicts: z.array(z.string()).max(5).default([]),
  })).max(MAX_CANDIDATES),
});

export type ProductImageCandidate = {
  readonly id: string;
  readonly title: string;
  readonly imageUrl: string;
};

export type ProductVerification = {
  readonly candidateId: string;
  readonly visualSimilarity: number;
  readonly sameProductProbability: number;
  readonly evidence: readonly string[];
  readonly conflicts: readonly string[];
};

type VerificationRequest = {
  readonly queryImageDataUrl: string;
  readonly candidates: readonly ProductImageCandidate[];
};

type ExactMatchInput = {
  readonly finalScore: number;
  readonly visualScore: number;
  readonly sameProductProbability: number;
  readonly brandScore: number;
  readonly logoScore: number;
  readonly textScore: number;
  readonly conflicts: readonly string[];
};

type LoadedCandidate = {
  readonly candidateId: string;
  readonly title: string;
  readonly image: GeminiInlineImage;
};

export async function verifyProductCandidates(
  request: VerificationRequest
): Promise<ProductVerification[]> {
  const queryImage = parseDataImage(request.queryImageDataUrl);
  if (!queryImage) return [];

  const loaded = await Promise.all(
    request.candidates.slice(0, MAX_CANDIDATES).map(loadCandidateImage)
  );
  const candidates = loaded.filter((item): item is LoadedCandidate => item !== null);
  if (candidates.length === 0) return [];

  const mapping = candidates.map((candidate, index) =>
    `Candidate index ${index}: ${candidate.title}`
  ).join("\n");
  const result = await geminiImagesJson({
    images: [queryImage, ...candidates.map((candidate) => candidate.image)],
    prompt: `Image 1 is a crop of the product in a user photo. Images 2 onward are marketplace candidates in this exact order:\n${mapping}\n\nCompare product identity, not merely category or color. Ignore pose, crop, lighting, background, and model. Check model-specific logo placement, readable text, panel and seam geometry, print, buttons, pockets, sole pattern, hardware, proportions, and material. A generic item of the same type and color must stay at or below 0.65 sameProductProbability. Use above 0.90 only when identity-level details agree and there are no visible contradictions. Return only JSON: {"matches":[{"index":0,"visualSimilarity":0.0,"sameProductProbability":0.0,"evidence":["short observed fact"],"conflicts":["short contradiction"]}]}`,
    timeoutMs: 18000,
  });
  if (!result.data) return [];
  return parseProductVerification(
    result.data,
    candidates.map((candidate) => candidate.candidateId)
  );
}

export function parseProductVerification(
  text: string,
  candidateIds: readonly string[]
): ProductVerification[] {
  let value: unknown;
  try {
    value = JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    return [];
  }
  const parsed = verificationSchema.safeParse(value);
  if (!parsed.success) return [];

  return parsed.data.matches.flatMap((match) => {
    const candidateId = candidateIds[match.index];
    if (!candidateId) return [];
    return [{
      candidateId,
      visualSimilarity: roundScore(match.visualSimilarity),
      sameProductProbability: roundScore(match.sameProductProbability),
      evidence: match.evidence,
      conflicts: match.conflicts,
    }];
  });
}

export function canClaimExactMatch(input: ExactMatchInput): boolean {
  const identityScore = Math.max(input.brandScore, input.logoScore, input.textScore);
  return input.finalScore >= MATCH_TIERS.exactMin
    && input.visualScore >= 0.9
    && input.sameProductProbability >= 0.93
    && identityScore >= 0.6
    && input.conflicts.length === 0;
}

async function loadCandidateImage(
  candidate: ProductImageCandidate
): Promise<LoadedCandidate | null> {
  const url = allowedAliImageUrl(candidate.imageUrl);
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REMOTE_IMAGE_BYTES) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_REMOTE_IMAGE_BYTES) return null;
    const mimeType = imageMime(response.headers.get("content-type"), url.pathname);
    if (!mimeType) return null;
    return {
      candidateId: candidate.id,
      title: candidate.title,
      image: { mimeType, data: Buffer.from(bytes).toString("base64") },
    };
  } catch {
    return null;
  }
}

function parseDataImage(dataUrl: string): GeminiInlineImage | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), data: match[2].replace(/\s/g, "") };
}

function allowedAliImageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host === "alicdn.com" || host.endsWith(".alicdn.com")) return url;
    if (host === "aliexpress-media.com" || host.endsWith(".aliexpress-media.com")) return url;
    return null;
  } catch {
    return null;
  }
}

function imageMime(contentType: string | null, pathname: string): string | null {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/png" || normalized === "image/webp") {
    return normalized;
  }
  if (/\.png$/i.test(pathname)) return "image/png";
  if (/\.webp$/i.test(pathname)) return "image/webp";
  if (/\.(?:jpg|jpeg)$/i.test(pathname)) return "image/jpeg";
  return null;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
