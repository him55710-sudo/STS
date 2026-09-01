import type { Metadata } from "next";
import { BeautyDemoShell } from "@/components/beauty/BeautyDemoShell";

export const metadata: Metadata = {
  title: "STS Beauty Demo",
  description: "A curated process-commerce presentation for a creator makeup video.",
};

type BeautyDemoPageProps = {
  readonly searchParams: Promise<{
    readonly present?: string | string[];
  }>;
};

export default async function BeautyDemoPage({ searchParams }: BeautyDemoPageProps) {
  const { present } = await searchParams;
  const presentationMode = Array.isArray(present) ? present.includes("1") : present === "1";

  return <BeautyDemoShell presentationMode={presentationMode} />;
}
