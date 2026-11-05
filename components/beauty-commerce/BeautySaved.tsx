"use client";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, ArrowUpRight, X } from "lucide-react";
import { BEAUTY_LOOKS, BEAUTY_PRODUCTS } from "@/lib/beauty-commerce/catalog";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import { LookCard } from "./LookCard";

export function BeautySaved({ view = "looks" }: { readonly view?: string }) {
  const { locale, savedLookIds, savedProductIds, selectedShades, toggleProduct, hydrated } = useBeautyCommerce();
  const t = translator(locale);
  const looks = BEAUTY_LOOKS.filter((look) => savedLookIds.includes(look.id));
  const products = BEAUTY_PRODUCTS.filter((product) => savedProductIds.includes(product.id));
  const hasItems = view === "products" ? products.length > 0 : looks.length > 0;
  return <section className="bc-page"><p className="bc-eyebrow">A BEAUTY COLLECTION, ENTIRELY YOURS</p><h1 className="bc-page-title">{<>{t("A place for ", "Những điều ", "좋아하는 것을 ")}<em>{t("your favorites.", "bạn yêu.", "모아두는 곳.")}</em></>}</h1><p className="bc-page-description">{t("Keep the looks and products you want to return to. Your collection is saved in this browser.", "Giữ lại diện mạo và sản phẩm bạn muốn quay lại. Bộ sưu tập được lưu trên trình duyệt này.", "다시 보고 싶은 룩과 제품을 모아두세요. 이 브라우저에 저장됩니다.")}</p>
    <div className="bc-tab-links"><Link href="/saved" aria-current={view !== "products" ? "page" : undefined}>{t("Looks", "Diện mạo", "룩")} ({looks.length})</Link><Link href="/saved?view=products" aria-current={view === "products" ? "page" : undefined}>{t("Products", "Sản phẩm", "제품")} ({products.length})</Link><Link href="/saved/archive">{t("Earlier saved items", "Bộ sưu tập trước", "기존 저장 항목")}</Link></div>
    {!hydrated ? <p role="status">{t("Opening your collection…", "Đang mở bộ sưu tập…", "컬렉션을 불러오는 중…")}</p> : !hasItems ? <div className="bc-empty"><Bookmark size={28} strokeWidth={1} /><h2>{t("Make a little room for inspiration.", "Dành một chỗ cho cảm hứng.", "새로운 취향을 위한 자리.")}</h2><p>{t("Tap the save icon on a look or product. Everything you love will find a home here.", "Chạm vào biểu tượng lưu trên diện mạo hoặc sản phẩm. Mọi điều bạn thích sẽ ở đây.", "룩이나 제품의 저장 아이콘을 눌러보세요. 마음에 든 모든 것이 여기에 모여요.")}</p><Link href="/discover" className="bc-button">{t("Find your next favorite", "Tìm điều bạn thích", "나의 취향 발견하기")}<ArrowUpRight size={16} /></Link></div> : view === "products" ? <div className="bc-shelf bc-saved-products">{products.map((product) => <article className="bc-shelf-item" key={product.id}><div><Image src={product.image} alt={localize(product.name, locale)} width={220} height={220} /></div><span>{product.brand}</span><h3>{localize(product.name, locale)}</h3><p>{selectedShades[product.id] ?? product.shades[0]?.name}</p><div className="bc-saved-actions"><Link href={`/discover?view=products&product=${product.id}`} className="bc-text-link">{t("Explore products", "Xem sản phẩm", "제품 보기")}<ArrowUpRight size={14} /></Link><button className="bc-icon-button" onClick={() => toggleProduct(product.id)} aria-label={`${t("Remove from saved", "Bỏ lưu", "저장 해제")} ${product.brand}`}><X size={17} /></button></div></article>)}</div> : <div className="bc-look-grid">{looks.map((look) => <LookCard key={look.id} look={look} />)}</div>}
  </section>;
}
