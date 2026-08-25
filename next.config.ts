import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 콘텐츠·상품 이미지는 저장소 내 실사 정적 파일이므로 최적화 파이프라인 없이 서빙
  images: { unoptimized: true },
};

export default nextConfig;
