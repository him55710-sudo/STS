import type { BeautyLook, BeautyProduct, Localized } from "./types";

const tri = (en: string, vi: string, ko: string): Localized => ({ en, vi, ko });

export const BEAUTY_PRODUCTS: readonly BeautyProduct[] = [
  {
    id: "romand-tint", brand: "rom&nd", name: tri("Juicy Lasting Tint", "Juicy Lasting Tint", "쥬시 래스팅 틴트"),
    image: "/beauty-media/kb-romand-tint.webp", category: "lip", searchTerm: "romand Juicy Lasting Tint",
    shades: [{ name: "#23 Nucadamia", color: "#a96155" }, { name: "#22 Pomelo Skin", color: "#be8270" }, { name: "#25 Bare Grape", color: "#a47882" }],
  },
  {
    id: "clio-cushion", brand: "CLIO", name: tri("Kill Cover The New Founwear Cushion", "Kill Cover The New Founwear Cushion", "킬커버 더 뉴 파운웨어 쿠션"),
    image: "/beauty-media/kb-clio-cushion.webp", category: "base", searchTerm: "CLIO Kill Cover The New Founwear Cushion",
    shades: [{ name: "03 Linen", color: "#e0bd98" }, { name: "04 Ginger", color: "#cfaa83" }],
  },
  {
    id: "torriden-serum", brand: "Torriden", name: tri("DIVE-IN Low Molecular Hyaluronic Acid Serum", "DIVE-IN Low Molecular Hyaluronic Acid Serum", "다이브인 저분자 히알루론산 세럼"),
    image: "/beauty-media/kb-torriden-serum.webp", category: "skin", searchTerm: "Torriden DIVE IN Serum 50ml",
    shades: [{ name: "50 ml", color: "#c7dce4" }],
  },
  {
    id: "3ce-blush", brand: "3CE", name: tri("Mood Recipe Face Blush", "Mood Recipe Face Blush", "무드 레시피 페이스 블러쉬"),
    image: "/beauty-media/kb-3ce-blush.webp", category: "cheek", searchTerm: "3CE Mood Recipe Face Blush",
    shades: [{ name: "Rose Beige", color: "#be8a7a" }, { name: "Nude Peach", color: "#d8a18c" }],
  },
  {
    id: "glint-highlighter", brand: "Glint", name: tri("Highlighter", "Highlighter", "하이라이터"),
    image: "/beauty-media/kb-glint-highlighter.webp", category: "cheek", searchTerm: "Glint Highlighter",
    shades: [{ name: "01 Dewy Moon", color: "#ddc8a4" }],
  },
  {
    id: "etude-brow", brand: "ETUDE", name: tri("Drawing Eye Brow", "Drawing Eye Brow", "드로잉 아이브로우"),
    image: "/beauty-media/kb-etude-brow.webp", category: "eye", searchTerm: "ETUDE Drawing Eye Brow",
    shades: [{ name: "03 Brown", color: "#705449" }, { name: "01 Dark Brown", color: "#51423a" }],
  },
] as const;

export const BEAUTY_LOOKS: readonly BeautyLook[] = [
  {
    id: "glow-lip", title: tri("A little lipstick. A natural finish.", "Một lớp son, thật tự nhiên.", "한 번의 터치, 자연스러운 립."),
    subtitle: tri("A moment at the mirror: watch the lipstick application, then check the finish.", "Một khoảnh khắc trước gương: xem cách tô son rồi kiểm tra lớp son.", "거울 앞에서 립스틱을 바르고 마무리를 확인하는 짧은 과정입니다."),
    image: "/beauty-media/modern-lip.webp", duration: "0:09", category: "lip", creator: "Artem Podrez",
    media: { kind: "licensed", src: "/beauty-media/modern-lip.mp4", sourceUrl: "https://www.pexels.com/video/woman-applying-lipstick-in-mirror-6782210/", credit: "Artem Podrez / Pexels", license: "Pexels License", captions: [
      { src: "/beauty-media/modern-lip.en.vtt", locale: "en", label: "English" },
      { src: "/beauty-media/modern-lip.vi.vtt", locale: "vi", label: "Tiếng Việt" },
      { src: "/beauty-media/modern-lip.ko.vtt", locale: "ko", label: "한국어" },
    ] },
    tags: [tri("Lips", "Son môi", "립"), tri("Real application", "Thao tác thật", "실제 도포")],
    steps: [
      { id: "lip-apply", label: tri("Apply the lipstick", "Tô son trước gương", "거울을 보며 바르기"), region: "lip", instruction: tri("Watch the hand movement as she applies lipstick at the mirror. The product and shade are unknown; the tint beside it is an editorial alternative.", "Quan sát động tác tô son trước gương. Chưa xác nhận sản phẩm và màu; son bên cạnh là gợi ý biên tập.", "거울을 보며 립스틱을 바르는 손동작을 확인하세요. 제품과 색상은 확인되지 않았고, 옆의 틴트는 에디터의 참고 제안입니다."), start: 0, end: 5.5, productId: "romand-tint", match: "inspiration" },
      { id: "mirror-check", label: tri("Check the finish", "Kiểm tra lớp son", "거울에서 마무리 확인"), region: "lip", instruction: tri("Watch her check the result in the mirror. Compare color in your usual lighting, then adjust the amount to your preference.", "Xem cách kiểm tra kết quả trong gương. So màu dưới ánh sáng thường dùng và điều chỉnh lượng theo ý thích.", "거울에서 마무리를 살피는 모습을 보세요. 평소 조명에서 내 발색을 확인하고 원하는 농도로 양을 조절하세요."), start: 5.5, end: 9, productId: "romand-tint", match: "inspiration" },
    ],
  },
  {
    id: "glass-skin", title: tri("A softly luminous base", "Làn da bắt sáng nhẹ nhàng", "빛을 머금은 투명한 베이스"),
    subtitle: tri("Skin prep and makeup ideas for a light, natural-looking base.", "Cảm hứng cho lớp nền mỏng, cùng những gợi ý chăm sóc và trang điểm.", "얇고 자연스러운 베이스를 위한 스킨케어와 메이크업 아이디어."),
    image: "/beauty-media/model-glass-skin.webp", duration: "3 steps", category: "base", creator: "STS EDIT", media: { kind: "preview" },
    tags: [tri("Base", "Lớp nền", "베이스"), tri("Look inspiration", "Cảm hứng", "룩 아이디어")],
    steps: [
      { id: "glass-prep", label: tri("Prep the skin", "Chuẩn bị da", "피부 준비"), region: "skin", instruction: tri("Explore a moisturizing step before makeup. This is an editorial guide, not an application verified from the image.", "Tham khảo bước dưỡng ẩm trước trang điểm. Đây là hướng dẫn biên tập, không phải thao tác đã được xác minh từ hình ảnh.", "메이크업 전 보습 단계를 참고하세요. 이미지에서 확인한 실제 사용 과정이 아닌 에디토리얼 가이드입니다."), start: 0, end: 8, productId: "torriden-serum", match: "inspiration" },
      { id: "glass-base", label: tri("Keep the base light", "Tán nền mỏng", "얇은 베이스"), region: "base", instruction: tri("Start with a small amount and blend section by section, following the product instructions.", "Bắt đầu với lượng nhỏ và tán theo từng vùng; điều chỉnh theo hướng dẫn của sản phẩm.", "소량부터 부위별로 얇게 펴 바르고, 제품의 사용 안내에 맞춰 조절하세요."), start: 8, end: 16, productId: "clio-cushion", match: "inspiration" },
      { id: "glass-light", label: tri("Add a little light", "Thêm điểm sáng", "빛 더하기"), region: "cheek", instruction: tri("Take inspiration from a subtle cheekbone highlight. The suggested product has not been identified in the image.", "Tham khảo điểm nhấn ở gò má. Sản phẩm gợi ý không được xác nhận là sản phẩm trong ảnh.", "광대의 은은한 포인트를 참고하세요. 제안 상품은 이미지 속 실제 사용 제품으로 확인되지 않았습니다."), start: 16, end: 24, productId: "glint-highlighter", match: "inspiration" },
    ],
  },
  {
    id: "rosy-cheeks", title: tri("A little rosy color for your day", "Một chút hồng cho ngày mới", "하루에 생기를 더하는 로지 치크"),
    subtitle: tri("Ideas for pairing softly colored cheeks and lips.", "Gợi ý phối má hồng và son với sắc độ dịu nhẹ.", "부드러운 색감으로 완성하는 치크와 립 조합."),
    image: "/beauty-media/kb-creator-03.webp", duration: "2 steps", category: "cheek", creator: "STS EDIT", media: { kind: "preview" },
    tags: [tri("Cheeks", "Má hồng", "치크"), tri("Rose tones", "Sắc hồng", "로즈 톤")],
    steps: [
      { id: "rose-cheek", label: tri("A touch of blush", "Nhấn má hồng", "치크 포인트"), region: "cheek", instruction: tri("Explore blush placement and build from a small amount. The image is a style reference.", "Tham khảo vị trí má hồng và tán từ lượng nhỏ. Ảnh mang tính gợi ý phong cách.", "소량부터 펴 바르며 치크 위치를 참고하세요. 이미지는 스타일 참고용입니다."), start: 0, end: 10, productId: "3ce-blush", match: "inspiration" },
      { id: "rose-lip", label: tri("Pair a lip color", "Phối màu môi", "립 컬러 조합"), region: "lip", instruction: tri("Choose a lip color you like. The image does not confirm which shade or product was used.", "Chọn màu son theo sở thích; ảnh không xác nhận màu hoặc sản phẩm đã sử dụng.", "취향에 맞는 립 컬러를 선택하세요. 이미지로 사용 제품이나 색상을 확인한 것은 아닙니다."), start: 10, end: 20, productId: "romand-tint", match: "inspiration" },
    ],
  },
  {
    id: "daily-base", title: tri("An easy everyday base", "Lớp nền cho những ngày thường", "매일을 위한 가벼운 베이스"),
    subtitle: tri("A simple makeup idea for your morning routine.", "Một ý tưởng trang điểm gọn nhẹ cho buổi sáng.", "아침에 간결하게 완성하는 데일리 메이크업 아이디어."),
    image: "/beauty-media/model-cushion-base.webp", duration: "2 steps", category: "base", creator: "STS EDIT", media: { kind: "preview" },
    tags: [tri("Everyday", "Mỗi ngày", "데일리"), tri("Natural", "Tự nhiên", "내추럴")],
    steps: [
      { id: "daily-cushion", label: tri("Blend your base", "Tán nền", "베이스 펴 바르기"), region: "base", instruction: tri("Try a light base that lets you build coverage. Check actual shades and directions with the retailer.", "Gợi ý lớp nền mỏng để dễ điều chỉnh độ che phủ. Xem hướng dẫn và màu thực tế tại người bán.", "커버력을 조절하기 쉬운 얇은 베이스를 제안합니다. 실제 옵션과 사용법은 판매처에서 확인하세요."), start: 0, end: 10, productId: "clio-cushion", match: "inspiration" },
      { id: "daily-brow", label: tri("Define the brows", "Định hình chân mày", "눈썹 정리"), region: "eye", instruction: tri("Take inspiration from soft strokes along your natural brows. This is an editorial product suggestion.", "Tham khảo nét mày mềm theo dáng mày tự nhiên; đây là lựa chọn biên tập.", "자연스러운 눈썹 결을 따라 부드러운 라인을 참고하세요. 에디토리얼 상품 제안입니다."), start: 10, end: 20, productId: "etude-brow", match: "inspiration" },
    ],
  },
  {
    id: "skin-prep", title: tri("Start with skin prep", "Bắt đầu từ bước dưỡng da", "메이크업의 시작, 스킨 프렙"),
    subtitle: tri("Make a little time to prepare your skin before foundation.", "Dành một chút thời gian cho bước chuẩn bị trước lớp nền.", "베이스 전, 피부를 준비하는 짧은 시간."),
    image: "/beauty-media/model-soothing-routine.webp", duration: "2 steps", category: "skin", creator: "STS EDIT", media: { kind: "preview" },
    tags: [tri("Skincare", "Dưỡng da", "스킨케어"), tri("Prep", "Chuẩn bị", "프렙")],
    steps: [
      { id: "prep-serum", label: tri("Moisturize first", "Dưỡng ẩm", "보습 준비"), region: "skin", instruction: tri("Follow the package directions and your skin needs. An image cannot demonstrate long-term results.", "Dùng theo hướng dẫn trên bao bì và nhu cầu của da. Hình ảnh không thể chứng minh hiệu quả lâu dài.", "제품 표시와 자신의 피부 상태에 맞춰 사용하세요. 이미지는 장기적인 효능을 입증하지 않습니다."), start: 0, end: 10, productId: "torriden-serum", match: "inspiration" },
      { id: "prep-base", label: tri("Move on to your base", "Tiếp tục lớp nền", "베이스로 이어가기"), region: "base", instruction: tri("After prep, choose your preferred base and shade. The suggestion is not based on identifying a product in the image.", "Sau bước chuẩn bị, chọn lớp nền và màu phù hợp. Gợi ý sản phẩm không dựa trên nhận diện từ ảnh.", "피부 준비 후 자신에게 맞는 베이스와 색상을 선택하세요. 이미지에서 제품을 인식한 제안은 아닙니다."), start: 10, end: 20, productId: "clio-cushion", match: "inspiration" },
    ],
  },
  {
    id: "soft-eyes", title: tri("Soft eyes, just enough", "Đôi mắt dịu dàng, vừa đủ", "가볍고 부드러운 눈매"),
    subtitle: tri("Ideas for natural brows and a quiet touch of color.", "Cảm hứng cho đôi mày tự nhiên và một điểm nhấn nhẹ.", "자연스러운 눈썹과 은은한 포인트를 위한 아이디어."),
    image: "/beauty-media/kb-creator-02.webp", duration: "2 steps", category: "eye", creator: "STS EDIT", media: { kind: "preview" },
    tags: [tri("Eyes", "Đôi mắt", "아이"), tri("Soft", "Nhẹ nhàng", "소프트")],
    steps: [
      { id: "soft-brow", label: tri("Keep the brows natural", "Nét mày tự nhiên", "자연스러운 눈썹"), region: "eye", instruction: tri("Explore soft brow strokes and choose a shade that suits your brows and preference.", "Tham khảo nét mày mềm, chọn sắc độ theo màu lông mày và sở thích.", "눈썹 결을 살리는 부드러운 라인을 참고하고 취향에 맞는 색상을 선택하세요."), start: 0, end: 10, productId: "etude-brow", match: "inspiration" },
      { id: "soft-cheek", label: tri("Balance with a touch of blush", "Cân bằng với má hồng", "치크로 균형 더하기"), region: "cheek", instruction: tri("A soft color pairing for the whole look. This is not a verified product from the image.", "Một gợi ý phối màu nhẹ cho tổng thể. Đây không phải sản phẩm đã xác minh trong hình.", "전체적인 균형을 위한 은은한 치크 조합입니다. 이미지 속 사용 제품으로 확인된 상품은 아닙니다."), start: 10, end: 20, productId: "3ce-blush", match: "inspiration" },
    ],
  },
] as const;
export function getLook(id: string): BeautyLook | undefined {
  return BEAUTY_LOOKS.find((look) => look.id === id);
}
export function getProduct(id: string): BeautyProduct | undefined {
  return BEAUTY_PRODUCTS.find((product) => product.id === id);
}
