import { NextRequest, NextResponse } from "next/server";
import { decodeImageDataUrl } from "@/lib/affiliate/aliexpress";
import { gateCommerceCandidates } from "@/lib/commerce/candidate-gate";
import { queryCanonical } from "@/lib/commerce/query-canonical";
import { isNaverConfigured } from "@/lib/naver/api-hub";
import { colorSimilarity, productImageColor } from "@/lib/naver/visual-score";
import { verifyProductCandidates } from "@/lib/retrieval/product-verifier";
import { buildProductDiscoveryQuery } from "@/lib/retrieval/discovery-query";
import { createProductDiscoveryProviders } from "@/lib/retrieval/discovery-providers";
import { discoverProducts } from "@/lib/retrieval/discovery-orchestrator";
import { toWebCandidate } from "@/lib/retrieval/discovery-adapter";
import type { WebCandidate } from "@/lib/retrieval/web-candidates";
import { colorName } from "@/lib/retrieval/queries";
import { createConfiguredVisualEmbeddingProvider } from "@/lib/retrieval/visual-embedding";
import { defaultProductImageEmbeddingStore } from "@/lib/retrieval/image-embedding-cache";
import { rerankProductCandidates } from "@/lib/retrieval/visual-rerank";
import { verifyExactSku } from "@/lib/retrieval/exact-sku-verifier";
import { VISUAL_RERANK_POLICY } from "@/lib/vision-config";
import { z } from "zod";

export const maxDuration = 45;
export const runtime = "nodejs";

const requestSchema = z.strictObject({
  queries: z.array(z.string().trim().min(2).max(180)).min(1).max(5),
  tone: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  image: z.string().startsWith("data:image/").max(150_000).optional(),
  cropMode: z.enum(["polygon", "bbox"]).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  canonicalClass: z.string().trim().min(1).max(80).optional(),
  attributes: z.object({
    brandCandidates: z.array(z.object({
      brand: z.string().trim().min(1),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()).default([]),
    })).default([]),
    primaryColorName: z.string().trim().min(1).optional(),
    pattern: z.enum(["solid", "stripe", "check", "graphic", "logo", "denim", "other"]).optional(),
    fit: z.string().trim().min(1).optional(),
    logo: z.object({
      detected: z.boolean(),
      text: z.string().optional(),
      description: z.string().optional(),
      confidence: z.number().min(0).max(1),
    }).optional(),
    visibleText: z.array(z.string()).default([]),
    modelIdentifiers: z.array(z.string()).default([]),
    materials: z.array(z.string()).default([]),
    distinctiveFeatures: z.array(z.string()).default([]),
  }).optional(),
});

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) return NextResponse.json({ error: "invalid product search request" }, { status: 400 });
  const body = parsedBody.data;
  const queries = body.queries;
  const aliImage = body.image ? decodeImageDataUrl(body.image) : null;
  const canonical = queryCanonical(body.category, queries.join(" "), body.canonicalClass);
  const discoveryQuery = buildProductDiscoveryQuery({
    canonicalClass: body.canonicalClass ?? queries[0] ?? "object",
    category: body.category ?? "lifestyle",
    queries,
    attributes: body.attributes,
    primaryColor: colorName(body.tone)?.ko ?? null,
  });
  const discovery = await discoverProducts({
    query: discoveryQuery,
    providers: createProductDiscoveryProviders({ canonical, aliImage }),
  });
  const candidates: WebCandidate[] = discovery.candidates.map(toWebCandidate);
  if (candidates.length === 0) {
    return NextResponse.json({
      candidates: [],
      provider: discovery.metrics.providerMetrics.length > 0 ? "empty" : "none",
      discoveryMetrics: discovery.metrics,
      visualRerankStatus: "unavailable",
      visualScored: 0,
      visualImageCoverage: 0,
    });
  }

  const visualRerank = await rerankProductCandidates({
    query: discoveryQuery,
    queryImage: body.image ?? null,
    cropMode: body.cropMode ?? "bbox",
    candidates,
    provider: createConfiguredVisualEmbeddingProvider(VISUAL_RERANK_POLICY.requestTimeoutMs),
    store: defaultProductImageEmbeddingStore(),
  });
  const rankedTopTen = [...visualRerank.topTen];

  let identityVerified = 0;
  const aliCandidates = rankedTopTen.filter((candidate) => candidate.source === "discovery:aliexpress");
  if (body.image && process.env.GEMINI_API_KEY?.trim() && aliCandidates.length > 0) {
    const verifications = await verifyProductCandidates({
      queryImageDataUrl: body.image,
      candidates: aliCandidates.flatMap((candidate) => {
        const imageUrl = candidate.imageUrls[0];
        return imageUrl ? [{ id: candidate.id, title: candidate.productName, imageUrl }] : [];
      }),
    });
    const byId = new Map(verifications.map((verification) => [verification.candidateId, verification]));
    candidates.forEach((candidate) => {
      const verification = byId.get(candidate.id);
      if (!verification) return;
      candidate.visualScore = verification.visualSimilarity;
      candidate.visualSource = "gemini-product-identity";
      candidate.sameProductProbability = verification.sameProductProbability;
      candidate.visualEvidence = [...(candidate.visualEvidence ?? []), ...verification.evidence];
      candidate.visualConflicts = [...(candidate.visualConflicts ?? []), ...verification.conflicts];
      identityVerified += 1;
    });
  }

  // ── 시각 검증: 네이버 이미지 검색으로 후보 상품의 실제 색을 얻어 visual 점수 산출 ──
  // (이미지 자체는 노출하지 않는다 — 제3자 저작물이며 출처 URL 필드가 없다)
  const tone = body.tone;
  let visualScored = 0;
  if (tone && isNaverConfigured()) {
    const top = rankedTopTen.slice(0, 4);
    await Promise.all(
      top.map(async (c) => {
        // 몰 페이지 제목은 길다 — 이미지 검색 쿼리는 앞 7토큰으로 자른다
        const q = [c.brand, c.productName, c.color]
          .filter(Boolean)
          .join(" ")
          .split(/\s+/)
          .slice(0, 7)
          .join(" ");
        const color = await productImageColor(q);
        const sim = colorSimilarity(tone, color);
        if (sim != null && c.visualSource !== "gemini-product-identity") {
          c.visualScore = Math.max(c.visualScore ?? 0, Math.round(sim * 75) / 100);
          c.visualSource = c.visualSource ? `${c.visualSource}+naver-color` : "naver-color";
          visualScored++;
        }
      })
    );
  }

  const verifiedTopTen = rankedTopTen.map((candidate) => {
    const verification = verifyExactSku({ query: discoveryQuery, candidate });
    const conflicts = [...new Set([...(candidate.visualConflicts ?? []), ...verification.conflicts])];
    const identityStatus = conflicts.length > 0 ? "CONFLICT" : verification.identityStatus;
    return {
      ...candidate,
      finalIdentityScore: verification.finalIdentityScore,
      identityStatus,
      variantExactness: conflicts.length === 0 && verification.variantExactness,
      matchReasons: verification.reasons,
      conflicts,
      visualConflicts: conflicts,
      visualEvidence: [...new Set([...(candidate.visualEvidence ?? []), ...verification.reasons])],
      detailPageVerified: identityStatus === "VERIFIED" && candidate.detailPageVerified,
      purchaseEligible: false,
    } satisfies WebCandidate;
  });
  const finalTopFive = verifiedTopTen
    .sort((left, right) => (right.finalIdentityScore ?? 0) - (left.finalIdentityScore ?? 0) || (right.preliminaryIdentityScore ?? 0) - (left.preliminaryIdentityScore ?? 0))
    .slice(0, VISUAL_RERANK_POLICY.finalTopK);

  const gatedCandidates = gateCommerceCandidates({ canonical, candidates: finalTopFive });
  const rejectedCandidateCount = discovery.metrics.rejectedCandidateCount + candidates.length - gatedCandidates.length;

  if (gatedCandidates.length === 0) {
    return NextResponse.json({
      candidates: [],
      provider: discovery.metrics.providerMetrics.length > 0 ? "empty" : "none",
      discoveryMetrics: { ...discovery.metrics, validatedCandidateCount: 0, rejectedCandidateCount },
      visualScored,
      identityVerified,
      visualRerankStatus: visualRerank.status,
      visualImageCoverage: visualRerank.imageCoverage,
      visualLatencyMs: visualRerank.latencyMs,
      preliminaryCandidateCount: candidates.length,
      preliminaryTopK: rankedTopTen.length,
      finalTopK: gatedCandidates.length,
      rejectedCandidateCount,
    });
  }

  return NextResponse.json({
    candidates: gatedCandidates,
    provider: gatedCandidates[0]?.source ?? "none",
    discoveryMetrics: { ...discovery.metrics, validatedCandidateCount: gatedCandidates.length, rejectedCandidateCount },
    visualScored,
    identityVerified,
    visualRerankStatus: visualRerank.status,
    visualScoredCount: visualRerank.scoredCount,
    visualImageCoverage: visualRerank.imageCoverage,
    visualLatencyMs: visualRerank.latencyMs,
    preliminaryCandidateCount: candidates.length,
    preliminaryTopK: rankedTopTen.length,
    finalTopK: gatedCandidates.length,
    rejectedCandidateCount,
  });
}
