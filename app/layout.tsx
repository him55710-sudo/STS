import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SupabaseAuthProvider from "@/components/SupabaseAuthProvider";

export const metadata: Metadata = {
  title: "STS — See it. Tap it. Shop it.",
  description:
    "사진 속 물건을 직접 탭해서 쇼핑하는 AI Visual Commerce. 게시물의 모든 상품을 AI가 자동으로 연결하고, 크리에이터와 수익을 나눕니다.",
  openGraph: {
    title: "STS — See it. Tap it. Shop it.",
    description: "사진 속 모든 것이 바로 쇼핑이 되는 Visual Commerce 플랫폼.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f7f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <SupabaseAuthProvider>
          <AppShell>{children}</AppShell>
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
