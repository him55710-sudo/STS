"use client";

import { Globe2 } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { translator } from "@/lib/beauty-commerce/types";

export function LanguageSelect() {
  const { locale, setLocale } = useBeautyCommerce();
  const t = translator(locale);
  return <label className="bc-language">
    <Globe2 size={15} aria-hidden="true" />
    <select value={locale} aria-label={t("Language", "Ngôn ngữ", "언어")} className="border-0 bg-transparent text-current" onChange={(event) => {
      const value = event.target.value;
      if (value === "en" || value === "vi" || value === "ko") setLocale(value);
    }}>
      <option value="en">English</option>
      <option value="ko">한국어</option>
      <option value="vi">Tiếng Việt</option>
    </select>
  </label>;
}
