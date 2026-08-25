import { NextRequest } from "next/server";
import { handleOutboundRedirect } from "@/lib/affiliate/outbound";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  return handleOutboundRedirect(req, productId);
}
