import type { Localized, Region } from "./types";

export type ReviewedRoutineStep = {
  readonly start: number; readonly end: number; readonly region: Region | "all";
  readonly label: Localized; readonly observation: Localized;
  readonly productName?: string;
};
const tri = (en: string, vi: string, ko: string): Localized => ({ en, vi, ko });

// Independently reviewed official playback, 2026-11-05; approximate navigation phases.
// Evidence: output/beauty-commerce-qa/creator-revision/routine-review-*.
export const REVIEWED_ROUTINES: Readonly<Record<string, readonly ReviewedRoutineStep[]>> = {
  "7310866363613039874": [
    { start: 0, end: 7, region: "skin", label: tri("Face prep", "Chuẩn bị da mặt", "얼굴 준비"), observation: tri("Hands blend product across the face. Prep and base cannot be separated confidently in this opening section; the exact product is unconfirmed.", "Dùng tay tán sản phẩm trên mặt. Chưa phân biệt chắc bước dưỡng và nền ở đoạn đầu; chưa xác nhận sản phẩm.", "손으로 얼굴에 제품을 펴 바릅니다. 이 도입부에서 스킨 준비와 베이스를 정확히 구분하거나 제품을 식별하지는 못했습니다.") },
    { start: 8, end: 12, region: "cheek", label: tri("First cheek color", "Lớp má đầu tiên", "첫 치크 컬러"), observation: tri("Pink liquid cheek color is blended with a finger. This is a cheek step, not a verified foundation step.", "Dùng ngón tay tán màu má dạng lỏng hồng. Đây là bước má, chưa phải bước nền đã xác nhận.", "분홍색 액상 치크를 손가락으로 펴 바릅니다. 베이스 단계가 아닌 치크 동작으로 관찰했습니다.") },
    { start: 13, end: 44, region: "eye", label: tri("Eyes & lid detail", "Mắt và điểm nhấn mí", "아이와 눈가 디테일"), observation: tri("Brush, stick and fingertip movements work around the lids and eye area. Product names beside the player come from the caption, not frame-by-frame identification.", "Dùng cọ, thỏi và ngón tay quanh mí và vùng mắt. Tên sản phẩm bên cạnh từ chú thích, chưa nhận diện từng khung hình.", "브러시·스틱·손가락으로 눈꺼풀과 눈가에 디테일을 더합니다. 옆의 제품명은 원문 설명을 바탕으로 하며 장면마다 식별한 결과는 아닙니다.") },
    { start: 46, end: 55, region: "cheek", label: tri("Build the cheek layer", "Tán thêm lớp má", "치크 레이어 더하기"), observation: tri("More cheek color is blended with the fingertips. This return to cheeks follows the eye work in the actual video.", "Dùng ngón tay tán thêm màu má. Trong video, tác giả quay lại bước má sau phần mắt.", "손끝으로 치크 컬러를 더 펴 바릅니다. 실제 영상에서도 아이 메이크업 후 치크로 돌아옵니다.") },
    { start: 55, end: 57, region: "lip", label: tri("Blend the lip color", "Tán màu môi", "립 컬러 블렌딩"), observation: tri("A fingertip blends color around the lips. The exact product in this short step is unconfirmed.", "Dùng ngón tay tán màu quanh môi. Chưa xác nhận sản phẩm của bước ngắn này.", "손끝으로 입술 주변의 컬러를 정리합니다. 이 짧은 단계의 정확한 제품은 확인되지 않았습니다.") },
    { start: 58, end: 62, region: "cheek", label: tri("Under-eye & cheek light", "Điểm sáng mắt và má", "눈 밑과 치크 하이라이트"), observation: tri("An applicator touches the under-eye and upper-cheek area. The exact formula and shade remain unconfirmed.", "Đầu tán chạm vùng dưới mắt và trên má. Chưa xác nhận công thức và màu chính xác.", "어플리케이터로 눈 밑과 위쪽 볼 부위를 터치합니다. 정확한 제형과 색상은 확인되지 않았습니다.") },
    { start: 64, end: 69, region: "lip", productName: "Hydra Peptide Lip Butter", label: tri("Lip application", "Thoa sản phẩm môi", "립 바르기"), observation: tri("A tube is applied to the lips. A NUDESTIX Hydra-Peptide Lip Butter label is legible in the preceding 1:03 close-up; the shade is unknown.", "Thoa tuýp sản phẩm lên môi. Nhãn NUDESTIX Hydra-Peptide Lip Butter đọc được ở cận cảnh 1:03 trước đó; chưa rõ màu.", "튜브형 제품을 입술에 바릅니다. 직전 1:03 클로즈업에서 NUDESTIX Hydra-Peptide Lip Butter 라벨이 보이며, 색상은 확인되지 않았습니다.") },
    { start: 73, end: 75.9, region: "all", label: tri("The finished look", "Diện mạo hoàn thiện", "완성된 룩 확인"), observation: tri("The final look is shown. Lighting and the creator's features do not establish how the same products will look on your skin.", "Tác giả cho xem diện mạo hoàn thiện. Ánh sáng và đặc điểm của tác giả không xác nhận kết quả trên da bạn.", "완성된 룩을 보여줍니다. 조명과 크리에이터의 이목구비만으로 내 피부의 발색과 결과를 예측할 수는 없습니다.") },
  ],
};

export function serializeReviewedSteps(steps: readonly ReviewedRoutineStep[]): string {
  return steps.map((step) => `${String(Math.floor(step.start / 60)).padStart(2, "0")}:${String(step.start % 60).padStart(2, "0")} ${step.label.en}`).join("\n");
}
