import type { Metadata } from "next";
import { CreatorLibrary } from "@/components/beauty-commerce/CreatorLibrary";

export const metadata: Metadata = {
  title: "Creator routines · STS",
  description: "Original TikTok beauty routines, manual process notes, and product names from creator captions.",
};

export default function CreatorsPage() {
  return <CreatorLibrary />;
}
