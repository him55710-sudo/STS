"use client";
import { usePathname } from "next/navigation";
import { BeautyCommerceShell } from "@/components/beauty-commerce/BeautyCommerceShell";
export default function AppShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = ["/board", "/collection", "/studio", "/rewards"].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return standalone ? <>{children}</> : <BeautyCommerceShell>{children}</BeautyCommerceShell>;
}
