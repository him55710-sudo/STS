"use client";
import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import { useApp, useHydrated } from "@/lib/store";
import { LanguageSelect } from "./LanguageSelect";
import { PersonalBeautyEditor } from "./ProductFit";

export function BeautyProfile() {
  const { locale, savedLookIds, savedProductIds } = useBeautyCommerce();
  const t = translator(locale);
  const hydrated = useHydrated();
  const user = useApp((state) => state.user);
  const links = [{ href: "/saved", en: "Your collection", vi: "Bộ sưu tập của bạn", ko: "나의 컬렉션" }, { href: "/create", en: "Create content", vi: "Đăng nội dung", ko: "콘텐츠 만들기" }, { href: "/creator", en: "Creator tools", vi: "Công cụ nhà sáng tạo", ko: "크리에이터 도구" }, { href: "/analytics", en: "Content analytics", vi: "Phân tích nội dung", ko: "콘텐츠 성과 분석" }];
  return <section className="bc-page"><p className="bc-eyebrow">MAKE YOURSELF AT HOME</p><h1 className="bc-page-title">{<>{t("A little space, ", "Không gian ", "나의 취향, ")}<em>{t("just for you.", "của bạn.", "나의 공간.")}</em></>}</h1><p className="bc-page-description">{t("Explore your way. Save a little inspiration and return whenever you like.", "Khám phá theo cách của bạn. Lưu cảm hứng, trở lại bất cứ lúc nào.", "나의 방식으로 발견하고, 마음에 든 순간을 다시 만나세요.")}</p><div className="bc-profile-card"><UserRound size={30} strokeWidth={1} /><h2>{hydrated && user ? user.name : t("Hello, beauty explorer.", "Chào bạn, người yêu vẻ đẹp.", "반가워요, 새로운 취향의 발견자.")}</h2><p>{t("Explore and save on this device without signing in.", "Khám phá và lưu trên thiết bị này mà không cần đăng nhập.", "로그인 없이 둘러보고 이 기기에 저장할 수 있어요.")}</p><p>{savedLookIds.length} {t("looks", "diện mạo", "개의 룩")} · {savedProductIds.length} {t("products", "sản phẩm", "개의 제품")}</p><Link className="bc-text-link" href={user ? "/profile/account" : "/login"}>{t("Your STS account", "Tài khoản STS", "STS 계정")}<ArrowUpRight size={15} /></Link><div className="bc-profile-links">{links.map((link) => <Link href={link.href} key={link.href}>{localize(link, locale)}<ArrowUpRight size={16} /></Link>)}</div><PersonalBeautyEditor /><LanguageSelect /></div></section>;
}
