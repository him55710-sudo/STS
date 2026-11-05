"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Bookmark, Play } from "lucide-react";
import type { BeautyLook } from "@/lib/beauty-commerce/types";
import { localize, translator } from "@/lib/beauty-commerce/types";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";

export function LookCard({ look }: { readonly look: BeautyLook }) {
  const { locale, savedLookIds, toggleLook } = useBeautyCommerce();
  const t = translator(locale);
  const saved = savedLookIds.includes(look.id);
  return (
    <article className="bc-look-card">
      <div className="bc-look-image">
        <Link href={`/look/${look.id}`} aria-label={localize(look.title, locale)}><Image src={look.image} alt={localize(look.title, locale)} width={600} height={750} style={{ objectPosition: look.position ?? "center" }} /><span className="bc-look-open"><ArrowUpRight size={23} /></span></Link>
        <span className="bc-media-label">{look.media.kind === "licensed" ? <><Play size={11} fill="currentColor" />{look.duration}</> : t("LOOKBOOK", "LOOKBOOK", "룩북")}</span>
        <button className={`bc-card-save ${saved ? "is-saved" : ""}`} onClick={() => toggleLook(look.id)} aria-pressed={saved} aria-label={`${t("Save", "Lưu", "저장")} ${localize(look.title, locale)}`}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="bc-look-meta"><span>{look.creator}</span><span>{look.steps.length} {t("steps", "bước", "단계")}</span></div>
      <Link className="bc-look-title" href={`/look/${look.id}`}>{localize(look.title, locale)}</Link>
      <p>{localize(look.subtitle, locale)}</p>
    </article>
  );
}
