"use client";

import Image from "next/image";
import { ArrowUpRight, Bookmark, Check } from "lucide-react";
import { useBeautyCommerce } from "@/lib/beauty-commerce/context";
import { localize, merchantSearch, translator } from "@/lib/beauty-commerce/types";
import type { BeautyProduct } from "@/lib/beauty-commerce/types";
import styles from "./LookExperience.module.css";
import { ProductFit } from "./ProductFit";

type ProductPanelProps = {
  readonly product: BeautyProduct;
  readonly match?: "inspiration" | "verified" | "caption";
};

export function ProductPanel({ product, match = "inspiration" }: ProductPanelProps) {
  const { locale, savedProductIds, selectedShades, selectShade, toggleProduct } = useBeautyCommerce();
  const selectedShade = product.shades.find((shade) => shade.name === selectedShades[product.id]) ?? product.shades[0];
  const saved = savedProductIds.includes(product.id);
  const t = translator(locale);

  return (
    <article className={styles.productPanel} aria-label={localize(product.name, locale)}>
      <div className={styles.productTop}>
        <div className={styles.productImage}>
          <Image src={product.image} alt={localize(product.name, locale)} width={180} height={180} sizes="96px" />
        </div>
        <div className={styles.productIdentity}>
          <p className={styles.productBrand}>{product.brand}</p>
          <h3>{localize(product.name, locale)}</h3>
          <span className={styles.matchBadge}>
            {match === "verified"
              ? t("Confirmed product", "Sản phẩm đã xác nhận", "사용 제품 확인됨")
              : match === "caption" ? t("Named in creator caption", "Được nhắc trong chú thích", "크리에이터 설명에 언급") : t("Editorial suggestion", "Sản phẩm gợi ý", "참고 제품")}
          </span>
          <p className={styles.price}>{t("Check the retailer for pricing", "Xem giá tại nơi bán", "가격은 판매처에서 확인")}</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => toggleProduct(product.id)}
          aria-pressed={saved}
          aria-label={saved ? t("Unsave product", "Bỏ lưu sản phẩm", "제품 저장 해제") : t("Save product", "Lưu sản phẩm", "제품 저장")}
        >
          <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {product.shades.length > 0 && (
        <fieldset className={styles.shades}>
          <legend>{t("Choose an option", "Chọn màu", "색상 선택")} <span>{selectedShade?.name}</span></legend>
          <div className={styles.swatchRow}>
            {product.shades.map((shade) => (
              <button
                type="button"
                key={shade.name}
                onClick={() => selectShade(product.id, shade.name)}
                className={styles.swatch}
                data-selected={selectedShade?.name === shade.name}
                aria-pressed={selectedShade?.name === shade.name}
                aria-label={shade.name}
                title={shade.name}
              >
                <span style={{ backgroundColor: shade.color }}>
                  {selectedShade?.name === shade.name && <Check size={14} strokeWidth={2.5} />}
                </span>
              </button>
            ))}
          </div>
          <p className={styles.microcopy}>
            {t("Swatches are illustrative. Check actual shade photos with the retailer.", "Màu minh họa; xem ảnh màu thực tế tại nơi bán.", "색상 견본은 참고용입니다. 실제 발색은 판매처에서 확인하세요.")}
          </p>
        </fieldset>
      )}

      {match === "inspiration" && (
        <p className={styles.provenance}>
          {t("An editorial suggestion for exploring this style. The actual brand and shade in the image or video have not been confirmed.", "Gợi ý để khám phá phong cách này. Nhãn hiệu và màu trong hình/video chưa được xác nhận.", "이 룩을 참고한 에디터의 제품 제안입니다. 이미지·영상 속 실제 브랜드와 색상은 확인되지 않았습니다.")}
        </p>
      )}
      <ProductFit product={product} />
      <a
        href={merchantSearch(product, selectedShade?.name ?? "")}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.merchantLink}
      >
        <span>{t("Search Lazada Vietnam", "Tìm trên Lazada Việt Nam", "Lazada 베트남에서 검색")}</span>
        <ArrowUpRight size={18} />
      </a>
      <p className={styles.merchantNote}>
        {t("Opens search results. Check the shade, seller, price and delivery before buying.", "Mở kết quả tìm kiếm. Kiểm tra màu, người bán, giá và giao hàng trước khi mua.", "검색 결과가 열립니다. 색상·판매자·가격·배송 조건을 확인한 후 구매하세요.")}
      </p>
    </article>
  );
}
