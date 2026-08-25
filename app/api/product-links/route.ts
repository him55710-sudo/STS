import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productById } from "@/lib/catalog";
import { productMarketplaceLinks } from "@/lib/marketplace-links";

const querySchema = z.object({ productId: z.string().min(1).max(120) });

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({ productId: new URL(req.url).searchParams.get("productId") });
  if (!parsed.success) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = productById(parsed.data.productId);
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const links = productMarketplaceLinks(product);
  return NextResponse.json(
    {
      productId: product.id,
      productName: product.name,
      verified: links.some((link) => link.verified),
      links,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
