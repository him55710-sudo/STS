"use client";

import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize } from "@/lib/beauty-commerce/types";
import type { BeautyProduct, Localized } from "@/lib/beauty-commerce/types";
import { assessProductFit, beautyProfileSchema } from "@/lib/beauty-commerce/fit";
import { usePersonalBeauty } from "./PersonalBeautyProvider";
import styles from "./ProductFit.module.css";

const labels = {
  aligned: { en: "Matches some preferences", vi: "Hợp với một số sở thích", ko: "일부 취향과 맞아요" },
  tradeoff: { en: "A tradeoff to consider", vi: "Có điểm cần cân nhắc", ko: "비교해 볼 점이 있어요" },
  review: { en: "More information needed", vi: "Cần thêm thông tin", ko: "정보를 더 확인해요" },
} satisfies Record<string, Localized>;

export function PersonalBeautyEditor() {
  const { locale } = useBeautyCommerce();
  const { profile, updateProfile, storageAvailable } = usePersonalBeauty();
  const t = (en: string, vi: string, ko: string) => localize({ en, vi, ko }, locale);
  return <details className={styles.editor}>
    <summary><SlidersHorizontal size={15} />{t("Make it personal", "Điều chỉnh cho bạn", "나에게 맞게 설정")}</summary>
    <p>{t("Your choices are saved on this browser and guide product explanations.", "Lựa chọn được lưu trên trình duyệt và dùng để giải thích sản phẩm.", "선택은 이 브라우저에 저장되고 제품 비교 설명에 반영됩니다.")}</p>
    <div className={styles.fields}>
      <label>{t("Your skin type", "Loại da", "내 피부타입")}<select value={profile.skinType} onChange={(event) => updateProfile({ skinType: beautyProfileSchema.shape.skinType.parse(event.target.value) })}>
        <option value="unsure">{t("Not sure", "Chưa rõ", "잘 모르겠어요")}</option><option value="dry">{t("Dry", "Da khô", "건성")}</option><option value="oily">{t("Oily", "Da dầu", "지성")}</option><option value="combination">{t("Combination", "Da hỗn hợp", "복합성")}</option><option value="normal">{t("Normal", "Da thường", "중성")}</option>
      </select></label>
      <label>{t("Preferred finish", "Độ hoàn thiện", "원하는 마무리")}<select value={profile.finish} onChange={(event) => updateProfile({ finish: beautyProfileSchema.shape.finish.parse(event.target.value) })}><option value="any">{t("Open to both", "Cả hai", "둘 다 좋아요")}</option><option value="glossy">{t("Glossy / dewy", "Bóng / căng mướt", "윤기 / 광택")}</option><option value="matte">{t("Soft matte", "Lì nhẹ", "소프트 매트")}</option></select></label>
      <label>{t("Fragrance preference", "Sở thích hương liệu", "향 선호")}<select value={profile.fragrance} onChange={(event) => updateProfile({ fragrance: beautyProfileSchema.shape.fragrance.parse(event.target.value) })}><option value="any">{t("No preference", "Không yêu cầu", "상관없어요")}</option><option value="avoid">{t("Prefer to avoid", "Muốn tránh", "피하고 싶어요")}</option></select></label>
      <label>{t("Your climate", "Khí hậu", "주로 사용하는 환경")}<select value={profile.climate} onChange={(event) => updateProfile({ climate: beautyProfileSchema.shape.climate.parse(event.target.value) })}><option value="humid">{t("Hot & humid", "Nóng ẩm", "덥고 습해요")}</option><option value="mild">{t("Mild / air-conditioned", "Ôn hòa / phòng lạnh", "온화 / 실내")}</option></select></label>
    </div>
    <label className={styles.check}><input type="checkbox" checked={profile.sensitive} onChange={(event) => updateProfile({ sensitive: event.target.checked })} />{t("My skin can be sensitive", "Da tôi dễ nhạy cảm", "피부가 민감한 편이에요")}</label>
    {!storageAvailable && <p role="status">{t("Storage is blocked; preferences last for this session.", "Lưu trữ bị chặn; chỉ giữ trong phiên này.", "저장이 제한되어 현재 세션에서만 유지됩니다.")}</p>}
  </details>;
}

export function ProductFit({ product }: { readonly product: BeautyProduct }) {
  const { locale } = useBeautyCommerce();
  const { profile } = usePersonalBeauty();
  const fit = assessProductFit(product, profile);
  const t = (en: string, vi: string, ko: string) => localize({ en, vi, ko }, locale);
  return <section className={styles.panel} data-testid="product-fit" aria-label={t("How this fits you", "Có phù hợp với bạn?", "나와 얼마나 맞을까요")}>
    <h4><Sparkles size={15} />{t("How this fits you", "Có phù hợp với bạn?", "나와 얼마나 맞을까요")}</h4>
    <PersonalBeautyEditor />
    <div className={styles.result} aria-live="polite"><strong>{localize(labels[fit.kind], locale)}</strong><ul>{fit.reasons.map((reason) => <li key={reason.en}>{localize(reason, locale)}</li>)}</ul></div>
    <h5>{t("Adapt the technique", "Điều chỉnh cách dùng", "바르는 방법을 내 것으로")}</h5><p>{localize(fit.adaptation, locale)}</p>
    {fit.sourceUrl && <a href={fit.sourceUrl} target="_blank" rel="noopener noreferrer">{t("Read the brand's product information", "Xem thông tin từ hãng", "브랜드의 제품 정보 확인")}</a>}
  </section>;
}
