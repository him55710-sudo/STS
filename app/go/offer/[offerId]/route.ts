import { NextRequest } from "next/server";
import { handleOfferOutboundRedirect } from "@/lib/affiliate/outbound";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await context.params;
  return handleOfferOutboundRedirect(req, offerId);
}
