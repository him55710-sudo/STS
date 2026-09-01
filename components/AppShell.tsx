"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TabBar from "@/components/TabBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/beauty-demo") ||
    pathname.startsWith("/board") ||
    pathname.startsWith("/collection") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/rewards")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1180px] justify-center">
      <Sidebar />
      <div className="min-h-dvh w-full max-w-[430px] bg-bg sm:border-x sm:border-line lg:max-w-[660px]">
        <main className="pb-[76px] lg:pb-10">{children}</main>
        <TabBar />
      </div>
    </div>
  );
}
