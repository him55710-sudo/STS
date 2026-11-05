import { notFound } from "next/navigation";
import MarketingLanding from "@/components/MarketingLanding";
import MarketingEditorialHome from "@/components/MarketingEditorialHome";
import MarketingCommerceHome from "@/components/marketing-home/MarketingCommerceHome";
import { BrandHome } from "@/components/marketing-home/BrandHome";
import ZvzoStyleLanding from "@/components/landing/ZvzoStyleLanding";

export const metadata = { title: "STS · Design preview", robots: { index: false, follow: false } };

export function generateStaticParams() {
  return ["landing", "editorial", "commerce", "brand", "zvzo"].map((name) => ({ name }));
}

export default async function DesignPreview({ params }: { readonly params: Promise<{ readonly name: string }> }) {
  const { name } = await params;
  let preview;
  switch (name) {
    case "landing": preview = <MarketingLanding />; break;
    case "editorial": preview = <MarketingEditorialHome />; break;
    case "commerce": preview = <MarketingCommerceHome />; break;
    case "brand": preview = <BrandHome />; break;
    case "zvzo": preview = <ZvzoStyleLanding />; break;
    default: notFound();
  }
  return <><div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 9999, padding: "9px 14px", background: "#252a24", color: "white", borderRadius: 8, fontSize: 12, pointerEvents: "none" }}>ARCHIVED DESIGN · Prices and statistics are examples</div>{preview}</>;
}
