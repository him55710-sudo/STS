import type { Metadata } from "next";
import ZvzoStyleLanding from "@/components/landing/ZvzoStyleLanding";

export const metadata: Metadata = {
  title: "STS — 브랜드 협업, 이제 STS 하나로 | 크리에이터 커머스",
  description: "올리던 콘텐츠 그대로, 내 채널에 맞는 협업을 골라 시작하세요. 사진·영상 속 진짜 인기 K-뷰티 상품이 바로 수익이 됩니다.",
  openGraph: {
    title: "STS — 브랜드 협업, 이제 STS 하나로",
    description: "마켓·광고·공유리워드·무료협찬으로 수익을 만들고, 원하는 K-뷰티 상품을 직접 골라 협업하세요.",
    images: ["/products/kb-boj-sun.jpg"],
  },
};

export default function HomePage() {
  return <ZvzoStyleLanding />;
}
