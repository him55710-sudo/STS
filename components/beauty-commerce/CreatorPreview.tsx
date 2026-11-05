"use client";

import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import styles from "./CreatorPreview.module.css";

const routines = [
  { id: "7518741157669653790", creator: "@jooshica", title: { en: "The natural makeup routine", vi: "Routine trang điểm tự nhiên", ko: "내추럴 메이크업 루틴" }, detail: "AOU · 2aN · Peripera" },
  { id: "7310866363613039874", creator: "@iam.chae", title: { en: "Everyday, layer by layer", vi: "Từng lớp cho mỗi ngày", ko: "레이어마다 살펴보는 데일리" }, detail: "lilybyred · ETUDE · NUSE" },
  { id: "7292952659240209672", creator: "@sarahkchey", title: { en: "A little lip wardrobe", vi: "Bộ sưu tập son nhỏ", ko: "골라보는 립 틴트 컬렉션" }, detail: "rom&nd · Peripera · AMUSE" },
] as const;

export function CreatorPreview() {
  const { locale } = useBeautyCommerce();
  const t = translator(locale);
  return <section className="bc-section" aria-label={t("Original creator routines", "Routine gốc của nhà sáng tạo", "크리에이터 원본 루틴")}>
    <div className="bc-section-heading"><div><p className="bc-eyebrow">FROM THEIR VANITY TO YOURS</p><h2>{t("Real creators. ", "Nhà sáng tạo thật. ", "실제 크리에이터, ")}<em>{t("Every layer.", "Từng lớp một.", "레이어 하나까지.")}</em></h2></div><Link className="bc-text-link" href="/creators">{t("Watch & explore", "Xem và khám phá", "영상과 제품 보기")}<ArrowUpRight size={17} /></Link></div>
    <div className={styles.grid}>{routines.map((routine, index) => <Link key={routine.id} href={`/creators?video=${routine.id}`} className={styles.card}>
      <div className={styles.top}><span>0{index + 1} / ORIGINAL TIKTOK</span><Play size={16} /></div><p className={styles.creator}>{routine.creator}</p><h3>{localize(routine.title, locale)}</h3><p className={styles.detail}>{routine.detail}</p><span className={styles.open}>{t("Explore the product layers", "Khám phá các lớp sản phẩm", "제품 레이어 살펴보기")}<ArrowUpRight size={17} /></span>
    </Link>)}</div>
    <p className={styles.note}>{t("Original videos play on TikTok. Product names are sourced from creator caption notes; unverified shades and timing stay clearly labeled.", "Video gốc phát trên TikTok. Tên sản phẩm từ chú thích đã được lập chỉ mục; màu và thời điểm chưa xác minh được ghi rõ.", "원본은 TikTok 플레이어로 재생합니다. 제품명은 확인한 원본 캡션을 바탕으로 하며, 확인되지 않은 색상과 시간은 구분해 안내합니다.")}</p>
  </section>;
}
