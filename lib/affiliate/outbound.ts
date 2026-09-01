import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productById } from "../catalog";
import { isAffiliateEligibleUrl, isAdpickConfigured, resolveAdpickRedirect } from "./adpick";
import { recordAffiliateClick } from "./clicks";
import { resolveLinkPriceRedirect } from "./linkprice";
import { resolveTestAffiliateUrl } from "./providers/test-resolver";
import { createSovrnAffiliateLink } from "../commerce/providers/sovrn";
import { getCommerceOfferById, getCommerceOffersForLegacyId } from "../commerce/canonical-repository";
import { isPurchaseEligibleOffer, isVerifiedExactOffer } from "../commerce/url-policy";

const contextSchema = z.object({
  productId: z.string().min(1).max(120),
  postId: z.string().min(1).max(120).optional(),
  objectId: z.string().min(1).max(120).optional(),
  creatorId: z.string().min(1).max(120).optional(),
  destinationUrl: z.url().max(4096).optional(),
});

const offerContextSchema = z.object({
  offerId: z.string().min(1).max(240),
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
    destinationUrl: searchParams.get("destinationUrl") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid affiliate request" }, { status: 400 });

  if (parsed.data.destinationUrl) {
    return NextResponse.json({ error: "custom destinations cannot redirect" }, { status: 422 });
  }

  if (!productById(parsed.data.productId)) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  const offer = getCommerceOffersForLegacyId(parsed.data.productId).find(isVerifiedExactOffer);
  if (!offer) return NextResponse.json({ error: "offer is not purchase eligible" }, { status: 422 });

  return handleOfferOutboundRedirect(req, offer.id);
}

export async function handleOfferOutboundRedirect(req: NextRequest, routeOfferId?: string): Promise<NextResponse> {
  const searchParams = new URL(req.url).searchParams;
  const parsed = offerContextSchema.safeParse({
    offerId: routeOfferId ?? searchParams.get("offerId"),
    postId: searchParams.get("postId") ?? undefined,
    objectId: searchParams.get("objectId") ?? undefined,
    creatorId: searchParams.get("creatorId") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid offer request" }, { status: 400 });

  const offer = getCommerceOfferById(parsed.data.offerId);
  if (!offer) return NextResponse.json({ error: "offer not found" }, { status: 404 });
  if (!isVerifiedExactOffer(offer) || !offer.detailUrl) {
    return NextResponse.json({ error: "offer is not purchase eligible" }, { status: 422 });
  }

  const attribution = {
    productId: offer.providerProductId ?? offer.canonicalProductId ?? offer.id,
    ...(parsed.data.postId ? { postId: parsed.data.postId } : {}),
    ...(parsed.data.objectId ? { objectId: parsed.data.objectId } : {}),
    ...(parsed.data.creatorId ? { creatorId: parsed.data.creatorId } : {}),
  };
  const destinationUrl = offer.detailUrl;
  const testAffiliateUrl = resolveTestAffiliateUrl(offer);
  let redirectUrl = offer.affiliateUrl ?? destinationUrl;
  let affiliateUrl = offer.affiliateUrl ?? undefined;
  let network: string = offer.provider;

  if (testAffiliateUrl) {
    redirectUrl = testAffiliateUrl;
    affiliateUrl = testAffiliateUrl;
    network = "test-resolver";
  } else if (!offer.affiliateUrl && offer.provider === "sovrn") {
    const sovrnUrl = createSovrnAffiliateLink(destinationUrl, parsed.data.postId);
    if (sovrnUrl) {
      redirectUrl = sovrnUrl;
      affiliateUrl = sovrnUrl;
    }
  } else if (!offer.affiliateUrl && offer.provider !== "direct" && offer.commissionRate !== null && isAffiliateEligibleUrl(destinationUrl)) {
    const linkPriceResult = await resolveLinkPriceRedirect(destinationUrl, attribution);
    if (linkPriceResult.kind === "redirect") {
      redirectUrl = linkPriceResult.location;
      affiliateUrl = linkPriceResult.location;
      network = "linkprice";
    } else if (isAdpickConfigured()) {
      const adpickResult = await resolveAdpickRedirect(destinationUrl, attribution);
      if (adpickResult.kind === "redirect") {
        redirectUrl = new URL(adpickResult.location, req.url).toString();
        affiliateUrl = redirectUrl;
        network = "adpick";
      }
    }
  }

  const eligibleAfterAffiliateResolution = testAffiliateUrl
    ? true
    : affiliateUrl !== undefined && isPurchaseEligibleOffer({ ...offer, affiliateUrl });
  if (!eligibleAfterAffiliateResolution) {
    return NextResponse.json({ error: "offer is missing an approved affiliate URL" }, { status: 422 });
  }

  try {
    await recordAffiliateClick({
      productId: attribution.productId,
      ...(parsed.data.postId ? { postId: parsed.data.postId } : {}),
      ...(parsed.data.objectId ? { objectId: parsed.data.objectId } : {}),
      ...(parsed.data.creatorId ? { creatorId: parsed.data.creatorId } : {}),
      network,
      destinationUrl,
      ...(affiliateUrl ? { affiliateUrl } : {}),
      ...(req.headers.get("referer") ? { referrer: req.headers.get("referer") ?? undefined } : {}),
      ...(req.headers.get("user-agent") ? { userAgent: req.headers.get("user-agent") ?? undefined } : {}),
    });
  } catch (error) {
    if (error instanceof Error) console.warn(`[affiliate] offer click persistence failed: ${error.message}`);
    else console.warn("[affiliate] offer click persistence failed");
  }

  return NextResponse.redirect(redirectUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
