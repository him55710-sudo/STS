"use client";
import { useState } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BEAUTY_LOOKS, BEAUTY_PRODUCTS } from "@/lib/beauty-commerce/catalog";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import { LOOK_POSTS } from "@/lib/catalog";
import { LookCard } from "./LookCard";
import { ProductPanel } from "./ProductPanel";

const categories = [{ id: "all", en: "All", vi: "Tất cả", ko: "전체" }, { id: "lip", en: "Lips", vi: "Môi", ko: "립" }, { id: "base", en: "Base", vi: "Nền", ko: "베이스" }, { id: "cheek", en: "Cheeks", vi: "Má", ko: "치크" }, { id: "skin", en: "Skincare", vi: "Dưỡng da", ko: "스킨케어" }, { id: "eye", en: "Eyes", vi: "Mắt", ko: "아이" }, { id: "fashion", en: "Style", vi: "Phong cách", ko: "패션" }] as const;

export function BeautyExplore({ category = "all", view = "looks", productId }: { readonly category?: string; readonly view?: string; readonly productId?: string }) {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(productId ?? BEAUTY_PRODUCTS[0]?.id ?? "");
  const normalized = query.toLocaleLowerCase(locale).trim();
  const looks = BEAUTY_LOOKS.filter((look) => (category === "all" || category === look.category) && `${localize(look.title, locale)} ${localize(look.subtitle, locale)}`.toLocaleLowerCase(locale).includes(normalized));
  const products = BEAUTY_PRODUCTS.filter((product) => (category === "all" || category === product.category) && `${product.brand} ${localize(product.name, locale)}`.toLocaleLowerCase(locale).includes(normalized));
  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  const fashion = category === "fashion";
  const empty = <div className="bc-empty"><Search size={25} /><h2>{t("Nothing here just yet.", "Chưa tìm thấy điều bạn muốn.", "아직 맞는 결과가 없어요.")}</h2><p>{t("Try a brand name or a shorter search.", "Thử tên thương hiệu hoặc một từ khóa ngắn hơn.", "브랜드 이름이나 짧은 검색어로 다시 찾아보세요.")}</p><button className="bc-button" onClick={() => setQuery("")}>{t("Clear search", "Xóa từ khóa", "검색어 지우기")}</button><Link href="/discover" className="bc-text-link">{t("See everything", "Xem tất cả", "전체 보기")}</Link></div>;
  return <section className="bc-page"><p className="bc-eyebrow">FIND YOUR NEXT LITTLE OBSESSION</p><h1 className="bc-page-title">{<>{t("Keep on ", "Không ngừng ", "나를 위한 ")}<em>{t("discovering.", "khám phá.", "새로운 발견.")}</em></>}</h1><p className="bc-page-description">{t("A lip color, a fresh base, a whole new mood. Start with whatever makes you curious.", "Một đôi môi, một lớp nền, một phong cách. Bắt đầu từ điều khiến bạn tò mò.", "립 하나부터 베이스, 룩을 완성하는 스타일까지. 지금 궁금한 것부터 시작하세요.")}</p>
    {!fashion && <label className="bc-search-box"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search looks, products, brands…", "Tìm diện mạo, sản phẩm, thương hiệu…", "룩, 제품, 브랜드 검색…")} aria-label={t("Search content", "Tìm kiếm nội dung", "콘텐츠 검색")} />{query && <button onClick={() => setQuery("")} className="bc-icon-button" aria-label={t("Clear search", "Xóa tìm kiếm", "검색어 지우기")}><X size={17} /></button>}</label>}
    <div className="bc-filter-row">{categories.map((item) => <Link key={item.id} href={`/discover?category=${item.id}&view=${view}`} aria-current={category === item.id ? "page" : undefined} className={category === item.id ? "bc-active-filter" : ""}>{localize(item, locale)}</Link>)}</div>
    {fashion ? <><p className="bc-result-count">{t("Style inspiration from the STS collection.", "Cảm hứng thời trang từ bộ sưu tập STS.", "기존 STS 패션 컬렉션에서 스타일을 발견하세요.")}</p><div className="bc-look-grid">{LOOK_POSTS.map((post) => <article className="bc-look-card" key={post.id}><Link className="bc-look-image" href={`/post/${post.id}`}><Image src={post.image} alt={post.caption} width={600} height={750} /></Link><div className="bc-look-meta"><span>STS STYLE ARCHIVE</span></div><Link className="bc-look-title" href={`/post/${post.id}`}>{t("Complete the look", "Hoàn thiện phong cách", "나의 룩을 완성하는 스타일")}</Link></article>)}</div></> : <>
      <div className="bc-tab-links"><Link href={`/discover?category=${category}&view=looks`} aria-current={view !== "products" ? "page" : undefined}>{t("Looks", "Diện mạo", "룩")}</Link><Link href={`/discover?category=${category}&view=products`} aria-current={view === "products" ? "page" : undefined}>{t("Products", "Sản phẩm", "제품")}</Link></div><p className="bc-result-count">{view === "products" ? products.length : looks.length} {t("curated results", "kết quả tuyển chọn", "개의 큐레이션 결과")}</p>
      {view === "products" ? selected ? <div className="bc-product-layout"><div className="bc-product-menu" aria-label={t("Choose a product", "Chọn sản phẩm", "제품 선택")}>{products.map((product) => <button key={product.id} aria-pressed={selected.id === product.id} onClick={() => setSelectedId(product.id)}><Image src={product.image} alt="" width={50} height={60} /><span>{product.brand}<br />{localize(product.name, locale)}</span></button>)}</div><ProductPanel key={selected.id} product={selected} match="inspiration" /></div> : empty : looks.length ? <div className="bc-look-grid">{looks.map((look) => <LookCard key={look.id} look={look} />)}</div> : empty}
    </>}
  </section>;
}
