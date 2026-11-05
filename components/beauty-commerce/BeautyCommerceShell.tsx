"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bookmark, Compass, Home, PlaySquare, Search, UserRound } from "lucide-react";
import { BeautyCommerceProvider, useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import { LanguageSelect } from "./LanguageSelect";

const navigation = [
  { href: "/", label: { en: "Home", vi: "Trang chủ", ko: "홈" }, icon: Home },
  { href: "/discover", label: { en: "Explore", vi: "Khám phá", ko: "탐색" }, icon: Compass },
  { href: "/creators", label: { en: "Creators", vi: "Nhà sáng tạo", ko: "크리에이터" }, icon: PlaySquare },
  { href: "/saved", label: { en: "Saved", vi: "Đã lưu", ko: "저장" }, icon: Bookmark },
  { href: "/profile", label: { en: "You", vi: "Của bạn", ko: "내 정보" }, icon: UserRound },
] as const;

function CommerceFrame({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, savedLookIds, savedProductIds, storageAvailable, hydrated } = useBeautyCommerce();
  const t = translator(locale);
  const count = savedLookIds.length + savedProductIds.length;
  return (
    <div className="beauty-commerce" lang={locale} data-hydrated={hydrated}>
      <a href="#beauty-main" className="bc-skip">{t("Skip to content", "Đến nội dung", "본문으로 이동")}</a>
      <div className="bc-announcement"><span>K-BEAUTY, ONE LOOK AT A TIME</span><span>{t("Discover K-beauty for Vietnam", "Khám phá dành cho Việt Nam", "베트남을 위한 K뷰티 발견")}<ArrowUpRight size={12} /></span></div>
      <header className="bc-header">
        <Link className="bc-logo" href="/" aria-label="sts the beauty edit — home">sts<span>the beauty edit</span></Link>
        <nav className="bc-desktop-nav" aria-label={t("Main navigation", "Điều hướng chính", "주 메뉴")}>
          {navigation.slice(0, 4).map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{localize(label, locale)}{href === "/saved" && count > 0 && <span className="bc-count">{count}</span>}</Link>)}
        </nav>
        <div className="bc-header-actions">
          <span className="bc-market">VIETNAM <span>·</span> VND</span>
          <LanguageSelect />
          <Link className="bc-icon-button" href="/discover" aria-label={t("Search", "Tìm kiếm", "검색")}><Search size={20} /></Link>
          <Link className="bc-icon-button bc-account-link" href="/profile" aria-label={t("Your account", "Tài khoản", "내 정보")}><UserRound size={20} /></Link>
        </div>
      </header>
      {!storageAvailable && <p className="bc-storage-notice" role="status">{t("Your browser is blocking storage. Your choices will stay available during this session.", "Trình duyệt đang chặn lưu trữ. Lựa chọn vẫn dùng được trong phiên này.", "브라우저 저장이 제한되어 현재 세션에서만 선택을 유지합니다.")}</p>}
      <main id="beauty-main" className="bc-main">{children}</main>
      <footer className="bc-footer">
        <div><Link href="/" className="bc-footer-logo">sts.</Link><p>{t("See the beauty. Know every step.", "Thấy vẻ đẹp. Hiểu từng bước.", "마음에 든 아름다움, 그 과정까지.")}</p></div>
        <div className="bc-footer-links"><Link href="/creator">{t("For creators", "Dành cho nhà sáng tạo", "크리에이터 도구")}</Link><Link href="/terms">{t("Terms", "Điều khoản", "이용약관")}</Link><Link href="/privacy">{t("Privacy", "Quyền riêng tư", "개인정보처리방침")}</Link></div>
        <p className="bc-footer-note">{t("Curated inspiration. Confirm prices, stock and delivery with the retailer. © STS 2026", "Nội dung tuyển chọn. Giá, tồn kho và giao hàng được xác nhận tại nơi bán. © STS 2026", "큐레이션 콘텐츠 · 가격, 재고와 배송은 판매처에서 확인하세요. © STS 2026")}</p>
      </footer>
      <nav className="bc-mobile-nav" aria-label={t("Main navigation", "Điều hướng chính", "주 메뉴")}>
        {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{localize(label, locale)}{href === "/saved" && count > 0 ? ` · ${count}` : ""}</span></Link>)}
      </nav>
    </div>
  );
}

export function BeautyCommerceShell({ children }: { readonly children: React.ReactNode }) {
  return <BeautyCommerceProvider><CommerceFrame>{children}</CommerceFrame></BeautyCommerceProvider>;
}
