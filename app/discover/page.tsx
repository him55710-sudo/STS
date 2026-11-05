import type { Metadata } from "next";
import { BeautyExplore } from "@/components/beauty-commerce/BeautyExplore";
export const metadata: Metadata = { title: "Khám phá K-beauty & phong cách | STS" };
export default async function DiscoverPage({ searchParams }: { readonly searchParams: Promise<{ readonly category?: string; readonly view?: string; readonly product?: string }> }) {
  const params = await searchParams;
  return <BeautyExplore key={`${params.category}-${params.view}-${params.product}`} category={params.category} view={params.view} productId={params.product} />;
}
