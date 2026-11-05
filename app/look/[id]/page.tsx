import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLook } from "@/lib/beauty-commerce/catalog";
import { LookExperience } from "@/components/beauty-commerce/LookExperience";

type LookPageProps = {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly step?: string | readonly string[] }>;
};

export async function generateMetadata({ params }: LookPageProps): Promise<Metadata> {
  const { id } = await params;
  const look = getLook(id);
  if (!look) return { title: "STS · Look" };
  return { title: `${look.title.en} · STS`, description: look.subtitle.en, openGraph: { images: [look.image] } };
}

export default async function LookPage({ params, searchParams }: LookPageProps) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const look = getLook(id);
  if (!look) notFound();
  return <LookExperience look={look} initialStepId={typeof step === "string" ? step : undefined} />;
}
