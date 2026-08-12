import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";

export const metadata: Metadata = {
  title: "STS — See it. Tap it. Shop it.",
  description:
    "사진 속 물건을 직접 탭해서 쇼핑하는 AI Visual Commerce. 게시물의 모든 상품을 AI가 자동으로 연결하고, 크리에이터와 수익을 나눕니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f5f6f7",
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
        {/* 모바일 우선 — 데스크톱에서는 폰 폭 컬럼 중앙 정렬 */}
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-bg sm:border-x sm:border-line">
          <main className="pb-[76px]">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
