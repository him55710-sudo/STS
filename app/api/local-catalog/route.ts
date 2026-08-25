import { NextRequest, NextResponse } from "next/server";
import { listLocalCatalog, readLocalCatalogAsset } from "@/lib/local-catalog";

export async function GET(req: NextRequest) {
  const name = new URL(req.url).searchParams.get("name");
  if (name) {
    const asset = await readLocalCatalogAsset(name);
    if (!asset) return NextResponse.json({ error: "local asset not found" }, { status: 404 });
    return new NextResponse(new Blob([asset.body]), { headers: { "Content-Type": asset.contentType, "Cache-Control": "public, max-age=3600" } });
  }
  return NextResponse.json(await listLocalCatalog());
}
