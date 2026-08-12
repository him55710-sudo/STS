import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
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
        {/* 모바일: 폰 폭 컬럼 + 하단 탭바 / 데스크톱(lg+): 좌측 사이드바 + 넓은 콘텐츠 (SEEIT web layout) */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[1180px] justify-center">
          <Sidebar />
          <div className="min-h-dvh w-full max-w-[430px] bg-bg sm:border-x sm:border-line lg:max-w-[660px]">
            <main className="pb-[76px] lg:pb-10">{children}</main>
            <TabBar />
          </div>
        </div>
      </body>
    </html>
  );
}
