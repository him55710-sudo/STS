import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./beauty-commerce.css";
import AppShell from "@/components/AppShell";
import { BeautyAuthBoundary } from "@/components/beauty-commerce/BeautyAuthBoundary";
import { PersonalBeautyProvider } from "@/components/beauty-commerce/PersonalBeautyProvider";

export const metadata: Metadata = {
  title: "STS — The beauty edit",
  description: "Watch real K-beauty application, explore every product layer, and adapt a routine to your own preferences.",
  openGraph: {
    title: "STS — The beauty edit",
    description: "See the look. Learn the steps. Make it yours.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="https://unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
            <Script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          </>
        )}

        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <BeautyAuthBoundary>
          <PersonalBeautyProvider><AppShell>{children}</AppShell></PersonalBeautyProvider>
        </BeautyAuthBoundary>
      </body>
    </html>
  );
}
