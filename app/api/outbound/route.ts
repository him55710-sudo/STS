import { NextRequest } from "next/server";
import { handleOutboundRedirect } from "@/lib/affiliate/outbound";

export const maxDuration = 8;

export async function GET(req: NextRequest) {
  return handleOutboundRedirect(req);
}
