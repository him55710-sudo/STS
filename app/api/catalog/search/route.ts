import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readPersistedCatalogOffers } from "@/lib/retrieval/persisted-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.strictObject({
  queries: z.array(z.string().trim().min(2).max(180)).min(1).max(5),
  limit: z.number().int().positive().max(50).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid catalog search request" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "invalid catalog search request" }, { status: 400 });

  try {
    const offers = await readPersistedCatalogOffers();
    return NextResponse.json({ offers: offers.slice(0, parsed.data.limit ?? 50), availability: "available" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ offers: [], availability: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
