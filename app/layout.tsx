import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SupabaseAuthProvider from "@/components/SupabaseAuthProvider";

export const metadata: Metadata = {
  title: "TACTILE",
  description: "Collectible virtual keycaps with tactile press feedback, customization, sound presets, and reward progress.",
  openGraph: {
    title: "TACTILE",
    description: "Collect, customize, press, and unlock virtual mechanical keycaps.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f3f0ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
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
        <SupabaseAuthProvider>
          <AppShell>{children}</AppShell>
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
