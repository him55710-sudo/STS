import { BeautySaved } from "@/components/beauty-commerce/BeautySaved";
export default async function SavedPage({ searchParams }: { readonly searchParams: Promise<{ readonly view?: string }> }) {
  const { view } = await searchParams;
  return <BeautySaved view={view} />;
}
