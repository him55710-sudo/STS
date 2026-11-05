import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeTikTokUrl, TIKTOK_ORIGIN } from "@/lib/beauty-commerce/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.strictObject({ url: z.string().max(500) });
const oembedSchema = z.object({
  provider_name: z.literal("TikTok"),
  title: z.string().max(1_000).optional(), author_name: z.string().max(100).optional(),
});
const noStore = { "Cache-Control": "no-store" };
const BODY_LIMIT = 65_536;

async function readBoundedBody(response: Pick<Response, "body" | "headers">, limit: number): Promise<string | null> {
  if (Number(response.headers.get("content-length")) > limit || !response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const part = await reader.read();
    if (part.done) return text + decoder.decode();
    size += part.value.byteLength;
    if (size > limit) { await reader.cancel(); return null; }
    text += decoder.decode(part.value, { stream: true });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  if (Number(request.headers.get("content-length")) > 2_048) return NextResponse.json({ error: "Request too large." }, { status: 413, headers: noStore });
  let input: unknown;
  try {
    const raw = await readBoundedBody(request, 2_048);
    if (raw === null) return NextResponse.json({ error: "Request too large." }, { status: 413, headers: noStore });
    input = JSON.parse(raw);
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore });
    throw error;
  }
  const parsed = requestSchema.safeParse(input);
  const source = parsed.success ? normalizeTikTokUrl(parsed.data.url) : null;
  if (!source) return NextResponse.json({ error: "Use a full https://www.tiktok.com/@creator/video/id URL." }, { status: 400, headers: noStore });
  const endpoint = new URL("/oembed", TIKTOK_ORIGIN);
  endpoint.searchParams.set("url", source.url);
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5_000), redirect: "error", headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ status: "unavailable", source: source.url, reason: "blocked" }, { headers: noStore });
    const text = await readBoundedBody(response, BODY_LIMIT);
    if (text === null) return NextResponse.json({ status: "unavailable", source: source.url, reason: "invalid" }, { headers: noStore });
    let json: unknown;
    try { json = JSON.parse(text); } catch (error) { if (error instanceof SyntaxError) return NextResponse.json({ status: "unavailable", source: source.url, reason: "invalid" }, { headers: noStore }); throw error; }
    const metadata = oembedSchema.safeParse(json);
    if (!metadata.success) return NextResponse.json({ status: "unavailable", source: source.url, reason: "invalid" }, { headers: noStore });
    return NextResponse.json({ status: "available", source: source.url, title: metadata.data.title ?? "", author: metadata.data.author_name ?? source.handle }, { headers: noStore });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const reason = error.name === "TimeoutError" || error.name === "AbortError" ? "timeout" : "network";
    return NextResponse.json({ status: "unavailable", source: source.url, reason }, { headers: noStore });
  }
}
