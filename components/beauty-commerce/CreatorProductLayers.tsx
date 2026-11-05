"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { getProduct } from "@/lib/beauty-commerce/catalog";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, translator } from "@/lib/beauty-commerce/types";
import type { Localized, Region } from "@/lib/beauty-commerce/types";
import type { CreatorSourceProduct } from "@/lib/beauty-commerce/tiktok";
import { usePersonalBeauty } from "./PersonalBeautyProvider";
import { PersonalBeautyEditor } from "./ProductFit";
import { ProductPanel } from "./ProductPanel";
import styles from "./CreatorProductLayers.module.css";

const regions: Record<Region, Localized> = {
  skin: { en: "Skin prep", vi: "Dưỡng da", ko: "스킨 준비" }, base: { en: "Base", vi: "Lớp nền", ko: "베이스" },
  eye: { en: "Eyes & brows", vi: "Mắt & mày", ko: "눈과 눈썹" }, cheek: { en: "Cheeks & light", vi: "Má & bắt sáng", ko: "치크와 하이라이트" }, lip: { en: "Lips", vi: "Môi", ko: "립" },
};
const skinLabels = {
  unsure: { en: "Skin type undecided", vi: "Chưa rõ loại da", ko: "피부타입 미선택" },
  dry: { en: "Dry skin", vi: "Da khô", ko: "건성" }, oily: { en: "Oily skin", vi: "Da dầu", ko: "지성" },
  combination: { en: "Combination skin", vi: "Da hỗn hợp", ko: "복합성" }, normal: { en: "Normal skin", vi: "Da thường", ko: "중성" },
};

export function CreatorProductLayers({ products, sourceUrl, focus, onSeekLabel, autoSeekLabel = true }: { readonly products: readonly CreatorSourceProduct[]; readonly sourceUrl: string; readonly focus: { readonly region: Region | "all"; readonly productName?: string } | null; readonly onSeekLabel: (start: number) => void; readonly autoSeekLabel?: boolean }) {
  const { locale } = useBeautyCommerce();
  const { profile } = usePersonalBeauty();
  const [region, setRegion] = useState<Region | "all">("all");
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!focus) return;
    setRegion(focus.region);
    const index = products.findIndex((product) => focus.productName ? product.name === focus.productName : focus.region === "all" || product.region === focus.region);
    setSelected(Math.max(0, index));
  }, [focus, products]);
  const t = translator(locale);
  const available = [...new Set(products.map((product) => product.region))];
  const visible = products.map((product, index) => ({ product, index })).filter(({ product }) => region === "all" || product.region === region);
  const active = products[selected] ?? products[0];
  if (!active) return null;
  const labelSeenAt = active.labelSeenAt;
  const catalogProduct = active.brand === "rom&nd" && active.name === "Juicy Lasting Tint" ? getProduct("romand-tint") : undefined;
  const searchUrl = `https://www.lazada.vn/catalog/?q=${encodeURIComponent(`${active.brand} ${active.name} ${active.sourceDetail ?? ""}`.trim())}`;
  return <section className={styles.section} aria-label={t("Creator product layers", "Các lớp sản phẩm của tác giả", "크리에이터 제품 레이어")} data-testid="creator-product-layers">
    <h3><Layers3 size={18} />{t("Explore every product layer", "Khám phá từng lớp sản phẩm", "제품 레이어 하나씩 살펴보기")}</h3>
    <p className={styles.note}>{t("Products named in the creator caption, grouped by makeup area. Only reviewed scenes receive a time link; other product matches remain caption-based.", "Sản phẩm trong chú thích đã lập chỉ mục, nhóm theo vùng trang điểm. Chỉ cảnh đã xem xét có liên kết thời gian; sản phẩm khác dựa trên chú thích.", "확인한 원문 설명의 제품을 메이크업 부위로 묶었습니다. 검토한 장면만 시간으로 연결하고, 나머지 제품은 원문 설명을 바탕으로 안내합니다.")}</p>
    <div className={styles.filters} role="group" aria-label={t("Product areas", "Vùng trang điểm", "제품 부위")}><button type="button" aria-pressed={region === "all"} onClick={() => setRegion("all")}>{t("All layers", "Tất cả", "전체 레이어")}</button>{available.map((value) => <button key={value} type="button" aria-pressed={region === value} onClick={() => { setRegion(value); const index = products.findIndex((product) => product.region === value); if (index >= 0) setSelected(index); }}>{localize(regions[value], locale)}</button>)}</div>
    <div className={styles.products}>{visible.map(({ product, index }) => <button key={`${product.brand}-${product.name}`} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); if (autoSeekLabel && product.labelSeenAt !== undefined) onSeekLabel(product.labelSeenAt); }}><small>{product.brand}</small><span>{product.name}</span></button>)}</div>
    <div className={styles.detail} aria-live="polite" data-testid="creator-layer-detail">
      <p className={styles.overline}>{localize(regions[active.region], locale)} · {t("CAPTION MENTION", "NHẮC TRONG CHÚ THÍCH", "원문 설명에 언급")}</p><h4>{active.brand} · {active.name}</h4>
      <p>{active.sourceDetail ? `${t("Detail stated in source", "Chi tiết trong nguồn", "원문에 기재된 정보")}: ${active.sourceDetail}` : t("Exact shade / option is not stated in the source note.", "Nguồn chưa ghi màu / phiên bản chính xác.", "원문 정보에서 정확한 색상·옵션을 확인하지 못했습니다.")}</p>
      {active.labelSeenAt !== undefined && <p>{t("Product-family label visually reviewed at 1:03; the exact shade remains unknown.", "Nhãn dòng sản phẩm đã được xem ở 1:03; chưa rõ màu chính xác.", "1:03에서 제품군 라벨을 직접 확인했습니다. 정확한 색상은 미확인입니다.")}</p>}
      {!autoSeekLabel && labelSeenAt !== undefined && <button type="button" className="bc-text-link" onClick={() => onSeekLabel(labelSeenAt)}>{t("See this moment in the video", "Xem khoảnh khắc trong video", "영상에서 이 장면 보기")}<ArrowUpRight size={14} /></button>}
      <a className={styles.source} href={sourceUrl} target="_blank" rel="noopener noreferrer">{t("Check the creator's original", "Kiểm tra bản gốc của tác giả", "크리에이터 원본에서 확인")}<ArrowUpRight size={14} /></a>
      {catalogProduct ? <ProductPanel product={catalogProduct} match="caption" /> : <>
        <PersonalBeautyEditor />
        <h5>{t("Make this layer yours", "Điều chỉnh lớp này cho bạn", "이 레이어를 나에게 맞게")}</h5>
        <p className={styles.profile}>{localize(skinLabels[profile.skinType], locale)} · {profile.finish === "any" ? t("Finish open", "Không yêu cầu độ hoàn thiện", "마무리 취향 미선택") : profile.finish === "glossy" ? t("Glossy preference", "Thích bóng", "광택 선호") : t("Matte preference", "Thích lì", "매트 선호")}</p>
        <p>{active.region === "lip" ? t("Compare the shade on your own lips and in your usual lighting. The creator's result does not establish how this color will look on you.", "So màu trên môi bạn dưới ánh sáng thường dùng. Kết quả của tác giả không xác nhận màu sẽ lên trên môi bạn ra sao.", "내 입술과 평소 조명에서 색상을 비교하세요. 크리에이터의 발색만으로 내 발색을 예측할 수는 없습니다.") : t("Use the video to study placement. Compare the exact product's finish and directions with your preferences before adding this layer to your routine.", "Học vị trí tán qua video. So độ hoàn thiện và hướng dẫn của đúng sản phẩm với sở thích trước khi thêm vào routine.", "영상에서 바르는 위치를 살펴보세요. 이 레이어를 루틴에 넣기 전 정확한 제품의 마무리와 사용법을 내 취향에 맞춰 비교하세요.")}</p>
        {profile.fragrance === "avoid" && <p>{t("You prefer to avoid fragrance. This product's current ingredient list has not been checked here.", "Bạn muốn tránh hương liệu. Thành phần hiện tại của sản phẩm chưa được kiểm tra ở đây.", "향을 피하고 싶다고 선택했습니다. 이 제품의 현재 전성분은 아직 확인되지 않았습니다.")}</p>}
        {profile.climate === "humid" && <p>{t("Your profile uses a hot & humid setting. Wear in that climate has not been verified for this product.", "Hồ sơ đang chọn nóng ẩm. Độ bền trong khí hậu đó chưa được xác minh cho sản phẩm này.", "프로필은 고온다습한 환경으로 설정되어 있습니다. 이 제품의 해당 환경 지속력은 확인되지 않았습니다.")}</p>}
        <p className={styles.note}>{t("Formula, skin tolerance and suitability remain unassessed. Check the exact regional version before choosing.", "Chưa đánh giá công thức, dung nạp và độ phù hợp. Kiểm tra đúng phiên bản tại khu vực trước khi chọn.", "제품의 성분·피부 반응·적합성은 평가되지 않았습니다. 선택 전에 판매 지역의 정확한 버전을 확인하세요.")}</p>
        <a className="bc-button" href={searchUrl} target="_blank" rel="noopener noreferrer">{t("Search this product in Vietnam", "Tìm sản phẩm tại Việt Nam", "베트남 판매처에서 검색")}<ArrowUpRight size={15} /></a>
        <p className={styles.note}>{t("Retailer search results; shade, price, stock and seller need checking.", "Kết quả tìm kiếm; cần kiểm tra màu, giá, tồn kho và người bán.", "판매처 검색 결과입니다. 색상·가격·재고·판매자를 확인하세요.")}</p>
      </>}
    </div>
  </section>;
}
