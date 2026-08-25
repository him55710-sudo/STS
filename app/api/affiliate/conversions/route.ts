import { NextRequest, NextResponse } from "next/server";
import { fetchAdpickConversions } from "@/lib/affiliate/adpick";

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const adminToken = process.env.AFFILIATE_ADMIN_TOKEN?.trim();
  if (!adminToken) return NextResponse.json({ error: "AFFILIATE_ADMIN_TOKEN is not configured" }, { status: 503 });
  if (req.headers.get("x-sts-admin-token") !== adminToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const result = await fetchAdpickConversions({
    startDate: params.get("sdate") ?? undefined,
    endDate: params.get("edate") ?? undefined,
    pData: params.get("p_data") ?? undefined,
    page: parsePositiveInt(params.get("page")),
    limit: parsePositiveInt(params.get("limit")),
  });
  return NextResponse.json(result.payload, { status: result.status, headers: { "Cache-Control": "no-store" } });
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
