import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const offerId = new URL(req.url).searchParams.get("offerId");
  const destination = new URL(req.url).searchParams.get("destination");
  return NextResponse.json({
    ok: true,
    kind: "test-affiliate",
    offerId,
    destination,
  });
}
