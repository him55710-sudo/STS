import type { Metadata } from "next";
import { BeautyHome } from "@/components/beauty-commerce/BeautyHome";
export const metadata: Metadata = {
  title: "STS — Thấy đẹp. Hiểu cách. Chọn đúng.",
  description: "Khám phá K-beauty qua những thao tác trang điểm thật. Xem từng bước, lưu diện mạo và tìm sản phẩm dành cho bạn tại Việt Nam.",
  openGraph: { title: "STS — The beauty edit", description: "Thấy vẻ đẹp. Hiểu từng bước.", images: ["/beauty-media/lip-application.jpg"] },
};
export default function HomePage() { return <BeautyHome />; }
