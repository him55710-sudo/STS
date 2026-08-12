import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 데모 이미지는 저장소 내 정적 파일이므로 이미지 최적화 파이프라인 없이 서빙
  images: { unoptimized: true },
  // Vercel 배포에서는 seed 에셋을 별도 정적 프로젝트(objet-assets)에서 서빙.
  // 로컬에서는 public/seed가 우선 매칭되므로 이 rewrite는 영향 없음.
  async rewrites() {
    return [
      {
        source: "/seed/:path*",
        destination: "https://objet-assets-mongben.vercel.app/seed/:path*",
      },
    ];
  },
};

export default nextConfig;
