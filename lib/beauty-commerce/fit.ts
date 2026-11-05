import { z } from "zod";
import type { BeautyProduct, Localized } from "./types";

export const beautyProfileSchema = z.object({
  skinType: z.enum(["unsure", "dry", "oily", "combination", "normal"]).default("unsure"),
  finish: z.enum(["any", "glossy", "matte"]).default("any"),
  fragrance: z.enum(["any", "avoid"]).default("any"),
  sensitive: z.boolean().default(false),
  climate: z.enum(["mild", "humid"]).default("humid"),
  experience: z.enum(["beginner", "comfortable"]).default("beginner"),
});
export type PersonalBeautyProfile = z.infer<typeof beautyProfileSchema>;
export const DEFAULT_BEAUTY_PROFILE = beautyProfileSchema.parse({});
export type ProductFit = {
  readonly kind: "aligned" | "tradeoff" | "review";
  readonly reasons: readonly Localized[];
  readonly adaptation: Localized;
  readonly sourceUrl: string | null;
};

export function parsePersonalProfile(raw: string | null): PersonalBeautyProfile {
  if (!raw) return DEFAULT_BEAUTY_PROFILE;
  try {
    const parsed = beautyProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_BEAUTY_PROFILE;
  } catch (error) {
    if (error instanceof SyntaxError) return DEFAULT_BEAUTY_PROFILE;
    throw error;
  }
}

export function assessProductFit(product: BeautyProduct, profile: PersonalBeautyProfile): ProductFit {
  const tri = (en: string, vi: string, ko: string): Localized => ({ en, vi, ko });
  const reasons: Localized[] = [];
  let kind: ProductFit["kind"] = "review";
  let sourceUrl: string | null = null;
  if (product.id === "romand-tint") {
    sourceUrl = "https://romandbeauty.com/products/juicy-lasting-tint";
    reasons.push(tri("The brand describes a glossy, buildable tint with a fruit scent.", "Hãng mô tả son bóng, có thể chồng màu và có hương trái cây.", "브랜드는 광택과 덧바르기가 가능한 과일 향 틴트로 설명합니다."));
    if (profile.finish === "glossy") {
      kind = "aligned";
      reasons.push(tri("Its described glossy finish matches your finish preference.", "Độ bóng được mô tả phù hợp với sở thích của bạn.", "브랜드가 설명한 광택 마무리가 선택한 취향과 맞습니다."));
    }
    if (profile.finish === "matte" || profile.fragrance === "avoid") {
      kind = "tradeoff";
      reasons.push(profile.fragrance === "avoid"
        ? tri("You prefer to avoid fragrance. This scented option deserves a closer ingredient check or an alternative.", "Bạn muốn tránh hương liệu. Hãy xem kỹ thành phần hoặc so sánh sản phẩm khác.", "향을 피하고 싶다고 선택했습니다. 향이 있는 이 제품은 성분 확인과 대안 비교가 필요합니다.")
        : tri("You prefer matte; this product is described as glossy. Compare a matte option before choosing.", "Bạn thích lì nhưng sản phẩm được mô tả là bóng. Hãy so sánh lựa chọn lì.", "매트한 마무리를 선호하지만 이 제품은 광택 제품입니다. 매트한 대안도 비교하세요."));
    }
  } else if (product.id === "torriden-serum") {
    sourceUrl = "https://torriden.us/products/dive-in-serum";
    reasons.push(tri("The brand lists hyaluronic acid, panthenol and a lightweight hydration focus.", "Hãng nêu axit hyaluronic, panthenol và kết cấu dưỡng ẩm nhẹ.", "브랜드는 히알루론산, 판테놀과 가벼운 보습 사용감을 안내합니다."));
    if (profile.skinType === "dry") {
      kind = "aligned";
      reasons.push(tri("A hydration-focused prep step is relevant to the dry-skin routine you selected. Individual tolerance is unassessed.", "Bước cấp ẩm liên quan đến lựa chọn da khô của bạn. Khả năng dung nạp cá nhân chưa được đánh giá.", "선택한 건성 피부 루틴의 보습 준비 단계와 관련됩니다. 개인의 피부 반응을 평가한 결과는 아닙니다."));
    }
  } else {
    reasons.push(tri("We still need version-specific finish, wear and ingredient evidence to compare this product with your profile.", "Cần xác minh độ hoàn thiện, độ bền và thành phần của phiên bản này để so sánh.", "프로필과 비교하려면 이 제품 버전의 마무리, 지속력, 성분 근거가 더 필요합니다."));
  }
  if (profile.sensitive) reasons.push(tri("You reported sensitivity. Compare the complete current ingredient list with ingredients you already avoid; a routine video cannot establish skin tolerance.", "Bạn cho biết da nhạy cảm. So sánh bảng thành phần hiện tại với chất bạn cần tránh; video không xác nhận khả năng dung nạp.", "민감함을 선택했습니다. 현재 전성분과 피하고 있는 성분을 비교하세요. 영상으로 피부 적합성을 확인할 수는 없습니다."));
  const adaptation = product.category === "lip"
    ? tri("Try one thin pass first. Keep the center concentrated and build a second layer only if you want more color; compare the shade on your own lips.", "Thử một lớp mỏng trước, tập trung ở giữa môi rồi thêm màu nếu muốn. So màu trên môi của bạn.", "먼저 얇게 한 번 바르고 중앙의 농도를 살펴보세요. 더 진한 색을 원할 때만 덧바르고 내 입술에서 발색을 비교하세요.")
    : profile.climate === "humid"
      ? tri("For the hot, humid routine you selected, try a small amount and inspect how the layers sit together before adding more. Humidity performance has not been verified here.", "Với khí hậu nóng ẩm bạn chọn, thử lượng nhỏ rồi xem các lớp có hợp nhau không. Hiệu quả trong độ ẩm chưa được xác minh.", "선택한 고온다습한 환경에서는 소량으로 시작해 겹친 제형의 상태를 보고 양을 조절하세요. 습도별 지속력은 여기서 검증되지 않았습니다.")
      : tri("Start with a small amount and check the finish in your usual lighting before building the next layer.", "Bắt đầu với lượng nhỏ và kiểm tra dưới ánh sáng thường dùng trước khi thêm lớp.", "소량으로 시작하고 평소 조명에서 마무리를 확인한 다음 다음 레이어를 더하세요.");
  return { kind, reasons, adaptation, sourceUrl };
}
