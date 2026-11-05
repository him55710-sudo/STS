import type { Metadata } from "next";
import { BeautyHome } from "@/components/beauty-commerce/BeautyHome";
export const metadata: Metadata = {
  title: "STS — See the look. Learn the steps.",
  description: "Watch real K-beauty application, explore the steps and find products for your routine in Vietnam.",
  openGraph: { title: "STS — The beauty edit", description: "See the look. Learn the steps. Make it yours.", images: ["/beauty-media/modern-lip.webp"] },
};
export default function HomePage() { return <BeautyHome />; }
