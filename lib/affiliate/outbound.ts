import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productById } from "@/lib/catalog";
import { isAffiliateEligibleUrl, isAdpickConfigured, productDestinationUrl, resolveAdpickRedirect } from "@/lib/affiliate/adpick";
import { recordAffiliateClick } from "@/lib/affiliate/clicks";
import { resolveLinkPriceRedirect } from "@/lib/affiliate/linkprice";
import { buildMarketplaceSearchLinks, isMarketplaceDetailUrl } from "@/lib/marketplace-links";

const contextSchema = z.object({
  productId: z.string().min(1).max(120),
  postId: z.string().min(1).max(120).optional(),
  objectId: z.string().min(1).max(120).optional(),
  creatorId: z.string().min(1).max(120).optional(),
});

export async function handleOutboundRedirect(req: NextRequest, routeProductId?: string): Promise<NextResponse> {
  const searchParams = new URL(req.url).searchParams;
  const parsed = contextSchema.safeParse({
    productId: routeProductId ?? searchParams.get("productId"),
    postId: searchParams.get("postId") ?? undefined,
    objectId: searchParams.get("objectId") ?? undefined,
    creatorId: searchParams.get("creatorId") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid affiliate request" }, { status: 400 });

  const product = productById(parsed.data.productId);
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const destinationUrl = productDestinationUrl(product);
  if (!isMarketplaceDetailUrl(destinationUrl)) {
    return marketplaceCandidateResponse(product, req.url);
  }
  let redirectUrl = destinationUrl;
  let network = "direct";
  let affiliateUrl: string | undefined;

  if (product.affiliate && isAffiliateEligibleUrl(destinationUrl)) {
    const linkPriceResult = await resolveLinkPriceRedirect(destinationUrl, parsed.data);
    if (linkPriceResult.kind === "redirect") {
      redirectUrl = linkPriceResult.location;
      affiliateUrl = linkPriceResult.location;
      network = "linkprice";
    } else if (isAdpickConfigured()) {
      const adpickResult = await resolveAdpickRedirect(destinationUrl, parsed.data);
      if (adpickResult.kind === "redirect") {
        redirectUrl = new URL(adpickResult.location, req.url).toString();
        affiliateUrl = redirectUrl;
        network = "adpick";
      } else {
        console.warn(`[affiliate] fallback for ${product.id}: LinkPrice ${linkPriceResult.detail}; ADPICK ${adpickResult.detail}`);
      }
    }
  }

  try {
    await recordAffiliateClick({
      ...parsed.data,
      network,
      destinationUrl,
      ...(affiliateUrl ? { affiliateUrl } : {}),
      ...(req.headers.get("referer") ? { referrer: req.headers.get("referer") ?? undefined } : {}),
      ...(req.headers.get("user-agent") ? { userAgent: req.headers.get("user-agent") ?? undefined } : {}),
    });
  } catch (error) {
    if (error instanceof Error) console.warn(`[affiliate] click persistence failed: ${error.message}`);
    else console.warn("[affiliate] click persistence failed");
  }

  return NextResponse.redirect(redirectUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}

function marketplaceCandidateResponse(product: NonNullable<ReturnType<typeof productById>>, requestUrl: string): NextResponse {
  const links = buildMarketplaceSearchLinks(product);
  const linkMarkup = links
    .map((link) => `<li><a href="${escapeHtml(link.url)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`)
    .join("");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>STS 판매처 후보</title></head><body><main><p>STS 상품 검증</p><h1>${escapeHtml(product.name)}</h1><p>검증된 상품 상세 URL이 없어 검색 후보만 제공합니다. 검색 결과의 상품 이미지와 모델명을 직접 확인해 주세요.</p><ul>${linkMarkup}</ul><a href="${escapeHtml(new URL(requestUrl).origin)}">STS로 돌아가기</a></main></body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character] ?? character;
  });
}
