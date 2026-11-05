"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bookmark, Check, Play } from "lucide-react";
import { useState } from "react";
import { BEAUTY_LOOKS, BEAUTY_PRODUCTS } from "@/lib/beauty-commerce/catalog";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import { LookCard } from "./LookCard";
import { CreatorPreview } from "./CreatorPreview";

const filters = [{ id: "all", en: "All", vi: "Tất cả", ko: "전체" }, { id: "lip", en: "Lips", vi: "Đôi môi", ko: "립" }, { id: "base", en: "Base", vi: "Lớp nền", ko: "베이스" }, { id: "cheek", en: "Cheeks", vi: "Má hồng", ko: "치크" }] as const;
const journey = [{ n: "01", en: "See a look that makes you pause.", vi: "Một vẻ đẹp khiến bạn dừng lại.", ko: "마음이 머무는 룩을 보고." }, { n: "02", en: "Explore the step you want to learn.", vi: "Một bước bạn muốn hiểu hơn.", ko: "궁금한 과정을 골라 보고." }, { n: "03", en: "Find the products for your own routine.", vi: "Một lựa chọn dành riêng cho bạn.", ko: "나를 위한 제품을 발견해요." }] as const;

export function BeautyHome() {
  const { locale, toggleLook, savedLookIds } = useBeautyCommerce();
  const [filter, setFilter] = useState("all");
  const featured = BEAUTY_LOOKS[0];
  const products = BEAUTY_PRODUCTS.slice(0, 3);
  const looks = BEAUTY_LOOKS.filter((look) => filter === "all" || look.category === filter).slice(0, 3);
  const t = translator(locale);
  if (!featured) return null;
  const saved = savedLookIds.includes(featured.id);
  return <>
    <section className="bc-hero">
      <div className="bc-hero-copy">
        <p className="bc-eyebrow"><span />THE BEAUTY OF KNOWING HOW</p>
        <h1>{<>{t("See the look.", "Thấy đẹp.", "마음에 든 룩,")}<br />{t("Learn the steps.", "Hiểu cách.", "그 과정부터")}<br /><em>{t("Make it yours.", "Chọn đúng.", "나의 것으로.")}</em></>}</h1>
        <p className="bc-hero-description">{t("Go beyond the finished look. Watch real application, explore each step, and discover K-beauty for your own routine.", "Không chỉ là một diện mạo đẹp. Khám phá cách trang điểm thật, từng bước nhỏ, và tìm sản phẩm K-beauty cho riêng bạn.", "예쁜 결과에서 한 걸음 더. 실제로 바르는 과정을 보고, 나에게 맞는 K뷰티 제품을 발견하세요.")}</p>
        <div className="bc-hero-buttons"><Link className="bc-button" href={`/look/${featured.id}`}><Play size={15} fill="currentColor" />{t("Watch the application", "Xem cách trang điểm", "바르는 과정 보기")}<ArrowUpRight size={17} /></Link><Link className="bc-text-link" href="/creators">{t("Real creator routines", "Routine từ nhà sáng tạo", "크리에이터 루틴 보기")}<ArrowUpRight size={15} /></Link></div>
        <div className="bc-hero-footnote"><span className="bc-small-line" /><span>{t("A closer look. A more considered choice.", "Nhìn gần hơn. Chọn có lý do.", "더 가까이 보고, 이유 있는 선택.")}</span></div>
      </div>
      <div className="bc-hero-visual">
        <div className="bc-hero-caption"><span>THE APPLICATION EDIT</span><span>01 / LIPS</span></div>
        <div className="bc-feature-video">
          {featured.media.kind === "licensed" ? <video src={featured.media.src} poster={featured.image} autoPlay muted loop playsInline controls preload="metadata" aria-label={t("Real lipstick application video", "Video thoa son thực tế", "실제 립스틱 도포 영상")}>{featured.media.captions?.map((caption) => <track key={caption.locale} kind="captions" src={caption.src} srcLang={caption.locale} label={caption.label} />)}</video> : <Image src={featured.image} alt={localize(featured.title, locale)} fill priority sizes="(max-width: 700px) 90vw, 40vw" />}
          <button className="bc-feature-save" onClick={() => toggleLook(featured.id)} aria-pressed={saved} aria-label={t("Save video", "Lưu video", "영상 저장")}><Bookmark size={19} fill={saved ? "currentColor" : "none"} /></button>
        </div>
        <Link href={`/look/${featured.id}`} className="bc-floating-note"><span className="bc-note-number">01</span><span><small>{t("START WITH A LITTLE LIP COLOR", "BẮT ĐẦU TỪ MỘT ĐÔI MÔI", "입술에서 시작하는 발견")}</small><strong>{t("One little touch. A whole new mood.", "Một nét son. Cả cảm hứng.", "한 번의 터치, 새로운 무드.")}</strong></span><ArrowUpRight size={20} /></Link>
        <p className="bc-credit">{featured.media.kind === "licensed" ? featured.media.credit : "STS EDIT"} <span>·</span> {t("Technique demonstration video", "Video minh họa kỹ thuật", "사용법을 보여주는 시연 영상")}</p>
      </div>
    </section>
    <section className="bc-how-strip" aria-label={t("How to explore", "Cách khám phá", "발견하는 방법")}>{journey.map((item) => <div key={item.n}><span>{item.n}</span><p>{localize(item, locale)}</p></div>)}</section>
    <CreatorPreview />
    <section className="bc-section" id="the-edit">
      <div className="bc-section-heading"><div><p className="bc-eyebrow">A LITTLE INSPIRATION, EVERY DAY</p><h2>{<>{t("Find your ", "Tìm thấy ", "오늘, ")}<em>{t("kind of beauty.", "vẻ đẹp của bạn.", "어떤 무드인가요.")}</em></>}</h2></div><Link className="bc-text-link" href="/discover">{t("Explore all looks", "Khám phá tất cả", "전체 둘러보기")}<ArrowUpRight size={17} /></Link></div>
      <div className="bc-filter-row" aria-label={t("Filter looks", "Lọc diện mạo", "룩 필터")}>{filters.map((item) => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{localize(item, locale)}</button>)}<Link href="/discover?category=fashion">{t("Complete the look", "Phong cách đi cùng", "함께한 스타일")}<ArrowUpRight size={13} /></Link></div>
      <div className="bc-look-grid">{looks.map((look) => <LookCard key={look.id} look={look} />)}</div>
    </section>
    <section className="bc-routine-banner"><div className="bc-routine-image"><Image src="/beauty-media/model-glass-skin.webp" alt={t("Luminous skin inspiration", "Cảm hứng làn da căng bóng", "촉촉한 피부 표현 영감")} width={600} height={500} /></div><div><p className="bc-eyebrow">LESS GUESSING. MORE YOU.</p><h2>{<>{t("Beauty deserves", "Đẹp không phải", "아름다움의 과정은")}<br /><em>{t("a closer look.", "là điều bí mật.", "비밀이 아니니까.")}</em></>}</h2><p>{t("Save a look you love, learn a little technique, and build a collection that feels like you. No account needed to begin.", "Lưu những diện mạo yêu thích, tìm hiểu từng thao tác và xây dựng danh sách sản phẩm của riêng bạn. Không cần đăng ký để bắt đầu.", "좋아하는 룩을 저장하고, 작은 동작을 배워보세요. 가입 없이 나만의 뷰티 루틴을 시작할 수 있어요.")}</p><Link className="bc-button bc-button-light" href="/saved">{t("Build your collection", "Tạo bộ sưu tập của bạn", "나만의 컬렉션 만들기")}<ArrowRight size={17} /></Link></div></section>
    <section className="bc-section bc-product-section"><div className="bc-section-heading"><div><p className="bc-eyebrow">ON OUR BEAUTY SHELF</p><h2>{<>{t("Little products. ", "Bắt đầu từ ", "작은 제품 하나가 ")}<em>{t("Lovely possibilities.", "điều nhỏ nhất.", "만드는 변화.")}</em></>}</h2></div><Link className="bc-text-link" href="/discover?view=products">{t("Explore products", "Xem sản phẩm", "제품 둘러보기")}<ArrowUpRight size={17} /></Link></div><div className="bc-shelf">{products.map((product) => <Link key={product.id} className="bc-shelf-item" href={`/discover?view=products&product=${product.id}`}><div><Image src={product.image} alt={localize(product.name, locale)} width={220} height={220} /></div><span>{product.brand}</span><h3>{localize(product.name, locale)}</h3><p>{t("An editorial pick", "Sản phẩm tuyển chọn", "에디터가 고른 제품")}<ArrowUpRight size={14} /></p></Link>)}</div></section>
    <div className="bc-values">{[{ en: "Watch real application", vi: "Xem thao tác thật", ko: "실제 도포 장면" }, { en: "Clearly labeled suggestions", vi: "Gợi ý được ghi rõ", ko: "참고 제품을 명확하게" }, { en: "Save what you love", vi: "Giữ lại điều bạn thích", ko: "좋아하는 순간을 저장" }].map((value) => <span key={value.vi}><Check size={16} />{localize(value, locale)}</span>)}</div>
  </>;
}
