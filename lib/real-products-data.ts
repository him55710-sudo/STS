export interface RealProduct {
  id: string;
  brand: string;
  name: string;
  category: "스킨케어" | "선케어" | "메이크업" | "클렌징" | "디바이스";
  originalPrice: number;
  salePrice: number;
  discountRate: number;
  image: string;
  rankBadge: string;
  collabType: "마켓" | "공유리워드" | "무료협찬" | "광고";
  rewardRate: string;
  status: "신청 가능" | "협업 중" | "마감 임박";
  retailer: string;
  purchaseUrl: string;
  features: string[];
  description: string;
}

export const REAL_KBEAUTY_BESTSELLERS: RealProduct[] = [
  {
    id: "kb-boj-sun",
    brand: "Beauty of Joseon (조선미녀)",
    name: "맑은쌀선크림 SPF50+ PA++++ 50ml",
    category: "선케어",
    originalPrice: 18000,
    salePrice: 13500,
    discountRate: 25,
    image: "/products/kb-boj-sun.jpg",
    rankBadge: "글로벌 No.1 선크림",
    collabType: "마켓",
    rewardRate: "커미션 15%",
    status: "신청 가능",
    retailer: "공식몰 · 올리브영",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=조선미녀+맑은쌀선크림",
    features: ["백탁 없는 촉촉한 유기자차", "쌀추출물 30% 함유", "글로벌 틱톡 누적 1,000만병 돌파"],
    description: "전 세계를 뒤흔든 K-뷰티 대표 선크림. 로션처럼 산뜻하고 촉촉하게 스며드는 수분 밀착 텍스처.",
  },
  {
    id: "kb-dalba-serum",
    brand: "d'Alba (달바)",
    name: "화이트 트러플 퍼스트 스프레이 세럼 100ml",
    category: "스킨케어",
    originalPrice: 29900,
    salePrice: 19900,
    discountRate: 33,
    image: "/products/kb-dalba-serum.jpg",
    rankBadge: "올리브영 1위 승무원미스트",
    collabType: "무료협찬",
    rewardRate: "본품 무상 + 10%",
    status: "신청 가능",
    retailer: "올리브영 · 네이버",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=달바+화이트+트러플+퍼스트+스프레이+세럼",
    features: ["이탈리아 화이트 트러플 함유", "오일층+세럼층 듀얼 광채", "안개 분사 저자극 비건"],
    description: "승무원 미스트로 유명한 프리미엄 비건 항산화 세럼. 흔들어서 쓱 뿌리면 즉각적인 수분 광채를 선사합니다.",
  },
  {
    id: "kb-romand-tint",
    brand: "rom&nd (롬앤)",
    name: "쥬시 래스팅 틴트 #25 베어 그레이프",
    category: "메이크업",
    originalPrice: 13000,
    salePrice: 8900,
    discountRate: 32,
    image: "/products/kb-romand-tint.jpg",
    rankBadge: "올리브영 어워즈 립 1위",
    collabType: "공유리워드",
    rewardRate: "리워드 15%",
    status: "신청 가능",
    retailer: "올리브영 · 지그재그",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=롬앤+쥬시래스팅틴트+베어그레이프",
    features: ["쿨톤 인생 베이스 립", "맑고 투명한 탕후루 광택", "오랜 시간 지속되는 착색력"],
    description: "바르는 순간 투명한 탕후루 광택이 차오르는 쿨톤 베스트 컬러. 자연스러운 쿨 누디 포도빛.",
  },
  {
    id: "kb-clio-cushion",
    brand: "CLIO (클리오)",
    name: "킬커버 더 뉴 파운웨어 쿠션 [본품+리필 기획세트]",
    category: "메이크업",
    originalPrice: 36000,
    salePrice: 25200,
    discountRate: 30,
    image: "/products/kb-clio-cushion.jpg",
    rankBadge: "올리브영 단독기획 베스트",
    collabType: "광고",
    rewardRate: "광고비 150만원",
    status: "신청 가능",
    retailer: "올리브영 공식몰",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=클리오+킬커버+더뉴파운웨어쿠션",
    features: ["72시간 무너짐 없는 밀착 커버", "초슬림 파우더 입자", "세미매트 피니시"],
    description: "더 얇고 더 섬세해진 킬커버. 가볍게 얹히면서도 결점을 감쪽같이 커버하는 올리브영 1위 쿠션.",
  },
  {
    id: "kb-roundlab-cream",
    brand: "ROUND LAB (라운드랩)",
    name: "자작나무 수분 크림 80ml",
    category: "스킨케어",
    originalPrice: 32000,
    salePrice: 22400,
    discountRate: 30,
    image: "/products/kb-roundlab-cream.jpg",
    rankBadge: "화해 뷰티어워드 수분크림 1위",
    collabType: "마켓",
    rewardRate: "커미션 14%",
    status: "신청 가능",
    retailer: "올리브영 · 공식몰",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=라운드랩+자작나무+수분크림",
    features: ["인제 자작나무 수액 듬뿍", "비타히알루론산 48시간 보습", "끈적임 0% 수분 캡슐"],
    description: "메마른 피부에 맑은 수분을 급속 충전하는 청량한 젤 크림. 수분 캡슐이 톡톡 터지며 깊은 보습감 부여.",
  },
  {
    id: "kb-manyo-oil",
    brand: "ma:nyo (마녀공장)",
    name: "퓨어 클렌징 오일 200ml",
    category: "클렌징",
    originalPrice: 29000,
    salePrice: 18900,
    discountRate: 35,
    image: "/products/kb-manyo-oil.jpg",
    rankBadge: "누적 판매 1,000만병 돌파",
    collabType: "마켓",
    rewardRate: "커미션 16%",
    status: "마감 임박",
    retailer: "올리브영 · 공식몰",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=마녀공장+퓨어클렌징오일",
    features: ["블랙헤드 99.73% 세정력", "자연유래 식물성 오일 14종", "미세먼지까지 완벽 유화"],
    description: "물과 닿는 순간 밀크빛으로 유화되며 모공 속 피지와 블랙헤드를 자극 없이 말끔하게 녹여냅니다.",
  },
  {
    id: "kb-torriden-serum",
    brand: "Torriden (토리든)",
    name: "다이브인 저분자 히알루론산 세럼 50ml",
    category: "스킨케어",
    originalPrice: 22000,
    salePrice: 14900,
    discountRate: 32,
    image: "/products/kb-torriden-serum.jpg",
    rankBadge: "올리브영 어워즈 에센스 1위",
    collabType: "무료협찬",
    rewardRate: "본품 2종 + 12%",
    status: "신청 가능",
    retailer: "올리브영 · 지그재그",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=토리든+다이브인+저분자+히알루론산+세럼",
    features: ["5D 복합 저분자 히알루론산", "속당김 잡는 파란 세럼", "판테놀 & 알란토인 진정"],
    description: "속당김을 단 3초 만에 잠재우는 수분 바이블 세럼. 끈적임 없이 피부 속 끝까지 차오르는 맑은 수분감.",
  },
  {
    id: "kb-medicube-pro",
    brand: "medicube (메디큐브)",
    name: "에이지알 부스터 프로 6-in-1 토탈 케어",
    category: "디바이스",
    originalPrice: 395000,
    salePrice: 249000,
    discountRate: 37,
    image: "/products/kb-medicube-pro.jpg",
    rankBadge: "홈케어 뷰티 디바이스 1위",
    collabType: "마켓",
    rewardRate: "커미션 20% (건당 5만)",
    status: "신청 가능",
    retailer: "메디큐브 공식스토어",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=메디큐브+에이지알+부스터프로",
    features: ["부스터+미세전류+더마샷+에어샷 4가지 모드", "화장품 유효성분 흡수율 785% 증가", "블루투스 앱 연동 맞춤케어"],
    description: "손으로 바를 때와는 차원이 다른 피부 광채와 탄력. 국내외 뷰티 크리에이터 극찬 인생 디바이스.",
  },
  {
    id: "kb-anua-toner",
    brand: "Anua (아누아)",
    name: "어성초 77% 수분 진정 토너 250ml",
    category: "스킨케어",
    originalPrice: 23000,
    salePrice: 16800,
    discountRate: 27,
    image: "/products/kb-anua-toner.jpg",
    rankBadge: "올리브영 토너 랭킹 1위",
    collabType: "공유리워드",
    rewardRate: "리워드 12%",
    status: "신청 가능",
    retailer: "올리브영 · 쿠팡",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=아누아+어성초+77+토너",
    features: ["국내산 어성초추출물 77%", "민감성 피부 트러블 긴급 진정", "약산성 무자극 토너"],
    description: "붉은 기와 열감을 편안하게 다독여주는 진정계의 국민 토너. 토너팩으로 활용 시 맑은 결 정리 완성.",
  },
  {
    id: "kb-aestura-cream",
    brand: "AESTURA (에스트라)",
    name: "아토베리어365 크림 80ml",
    category: "스킨케어",
    originalPrice: 33000,
    salePrice: 26400,
    discountRate: 20,
    image: "/products/kb-aestura-cream.jpg",
    rankBadge: "피부과 처방 1위 장벽크림",
    collabType: "공유리워드",
    rewardRate: "리워드 12%",
    status: "신청 가능",
    retailer: "올리브영 · 아모레몰",
    purchaseUrl: "https://search.shopping.naver.com/search/all?query=에스트라+아토베리어365+크림",
    features: ["고밀도 더마온 세라마이드 캡슐", "120시간 장벽 보습 유지", "민감 피부 더마 테스트 완료"],
    description: "피부 장벽이 무너졌을 때 찾는 SOS 보습제. 미세 캡슐이 부드럽게 녹으며 피부 틈새를 촘촘히 메워줍니다.",
  }
];

export interface BrandLogo {
  id: string;
  name: string;
  svg: string;
}

export const REAL_BRAND_LOGOS: BrandLogo[] = [
  { id: "dasique", name: "dasique (데이지크)", svg: "/brands/logo-10.svg" },
  { id: "melixir", name: "melixir (멜릭서)", svg: "/brands/logo-35.svg" },
  { id: "vivelab", name: "ViveLab (바이브랩)", svg: "/brands/logo-32.svg" },
  { id: "refilled", name: "Refilled (리필드)", svg: "/brands/logo-17.svg" },
  { id: "citybreeze", name: "CITYBREEZE", svg: "/brands/logo-05.svg" },
  { id: "urago", name: "URAGO", svg: "/brands/logo-01.svg" },
  { id: "rel", name: "RE_L", svg: "/brands/logo-77.svg" },
  { id: "teazen", name: "TEAZEN (티젠)", svg: "/brands/logo-12.svg" },
  { id: "monochrome", name: "MONOCHROME", svg: "/brands/logo-03.svg" },
  { id: "lukt", name: "lukt (룩트)", svg: "/brands/logo-29.svg" },
  { id: "cos", name: "COS (코스)", svg: "/brands/logo-26.svg" },
  { id: "hdex", name: "HDEX (에이치덱스)", svg: "/brands/logo-16.svg" },
  { id: "notia", name: "NOTIA (노티아)", svg: "/brands/logo-11.svg" },
  { id: "mongdol", name: "MONGDOL (몽돌)", svg: "/brands/logo-49.svg" },
  { id: "rememberjane", name: "REMEMBER JANE", svg: "/brands/logo-31.svg" },
  { id: "dubleve", name: "DUBLEVE", svg: "/brands/logo-04.svg" },
  { id: "knola", name: "Knola", svg: "/brands/logo-06.svg" },
  { id: "brabantia", name: "brabantia", svg: "/brands/logo-15.svg" },
  { id: "childlife", name: "ChildLife", svg: "/brands/logo-28.svg" },
  { id: "propermarket", name: "Proper Market", svg: "/brands/logo-20.svg" },
  { id: "todo", name: "TŌDO", svg: "/brands/logo-21.svg" },
  { id: "inertia", name: "INERTIA", svg: "/brands/logo-22.svg" },
  { id: "sartu", name: "SARTU", svg: "/brands/logo-23.svg" },
  { id: "tilli-die", name: "TILL I DIE", svg: "/brands/logo-24.svg" },
];

export interface FaceSegmentationZone {
  id: string;
  zone: "lips" | "cheeks" | "tzone" | "barrier" | "contour";
  zoneName: string; // "입술 (Lips)" | "양 볼 / 치크 (Cheeks)" | "T존 / 이마 (T-Zone)" | "피부 장벽 (Skin)"
  zoneIcon: string;
  confidence: number; // e.g. 99.8
  polygonPoints: string; // SVG polygon coords (viewBox 0 0 100 100)
  fillColor: string;
  strokeColor: string;
  glowColor: string;
  anchorX: number; // %
  anchorY: number; // %
  productId: string;
  brand: string;
  productName: string;
  price: number;
  discount: number;
  productImage: string;
  cosmeticRole: string; // "탕후루 광택 립 발색" | "세미매트 도자기 결 커버" | "속수분 광채 밀착"
  appliedEffect: string; // "쿨 누디 베어그레이프 2콧 레이어링" | "킬커버 03 리넨 얇게 밀착"
  textureNote: string; // "유리알 광택막 코팅 완료" | "모공 요철 블러링 피니시"
}

export interface KBeautyCreatorPost {
  id: string;
  creatorHandle: string;
  creatorName: string;
  creatorAvatar: string;
  modelImage: string;
  routineTitle: string;
  caption: string;
  likes: number;
  productTags: {
    productId: string;
    brand: string;
    productName: string;
    price: number;
    discount: number;
    tagX: number;
    tagY: number;
    productImage: string;
  }[];
  faceZones: FaceSegmentationZone[];
}

export const KBEAUTY_CREATOR_POSTS: KBeautyCreatorPost[] = [
  {
    id: "post-kb-01",
    creatorHandle: "yoon.glow",
    creatorName: "윤글로우",
    creatorAvatar: "/kbeauty-models/kb-creator-01.jpg",
    modelImage: "/kbeauty-models/kb-creator-01.jpg",
    routineTitle: "속광 터지는 글래스 스킨 루틴 ✨",
    caption: "선크림만 발라도 피부 결이 이렇게 맑아질 수 있어요. 백탁 없이 촉촉한 조선미녀 쌀선크림 & 달바 미스트 조합 필수!",
    likes: 24800,
    productTags: [
      {
        productId: "kb-boj-sun",
        brand: "Beauty of Joseon",
        productName: "맑은쌀선크림 SPF50+ PA++++",
        price: 13500,
        discount: 25,
        tagX: 50,
        tagY: 34,
        productImage: "/products/kb-boj-sun.jpg"
      },
      {
        productId: "kb-dalba-serum",
        brand: "d'Alba",
        productName: "화이트 트러플 퍼스트 스프레이 세럼",
        price: 19900,
        discount: 33,
        tagX: 35,
        tagY: 52,
        productImage: "/products/kb-dalba-serum.jpg"
      },
      {
        productId: "kb-romand-tint",
        brand: "rom&nd",
        productName: "쥬시 래스팅 틴트 25 베어그레이프",
        price: 8900,
        discount: 32,
        tagX: 50,
        tagY: 64,
        productImage: "/products/kb-romand-tint.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-01-lips",
        zone: "lips",
        zoneName: "입술 (Lips)",
        zoneIcon: "💋",
        confidence: 99.8,
        polygonPoints: "44,61.5 47,59.8 50,60.5 53,59.8 56,61.5 58,63.2 55,66.4 50,68 45,66.4 42,63.2",
        fillColor: "rgba(244, 63, 94, 0.35)",
        strokeColor: "rgba(251, 113, 133, 0.95)",
        glowColor: "rgba(244, 63, 94, 0.8)",
        anchorX: 50,
        anchorY: 64,
        productId: "kb-romand-tint",
        brand: "rom&nd (롬앤)",
        productName: "쥬시 래스팅 틴트 #25 베어 그레이프",
        price: 8900,
        discount: 32,
        productImage: "/products/kb-romand-tint.jpg",
        cosmeticRole: "글래스 탕후루 광택 립 발색",
        appliedEffect: "쿨 누디 베어그레이프 2회 레이어링 도포",
        textureNote: "맑은 수분 코팅막으로 입술 볼륨감 극대화"
      },
      {
        id: "zone-kb-01-cheeks",
        zone: "cheeks",
        zoneName: "양 볼 / 광대 (Cheeks)",
        zoneIcon: "🌸",
        confidence: 99.5,
        polygonPoints: "26,48 34,44 42,48 43,56 38,63 29,61 24,54",
        fillColor: "rgba(59, 130, 246, 0.30)",
        strokeColor: "rgba(96, 165, 250, 0.95)",
        glowColor: "rgba(59, 130, 246, 0.75)",
        anchorX: 33,
        anchorY: 53,
        productId: "kb-dalba-serum",
        brand: "d'Alba (달바)",
        productName: "화이트 트러플 퍼스트 스프레이 세럼",
        price: 19900,
        discount: 33,
        productImage: "/products/kb-dalba-serum.jpg",
        cosmeticRole: "이탈리아 화이트 트러플 수분 오일 광채",
        appliedEffect: "세럼층+오일층 안개 분사로 광채 레이어링",
        textureNote: "끈적임 제로 듀얼 오일막 속광 형성"
      },
      {
        id: "zone-kb-01-tzone",
        zone: "tzone",
        zoneName: "T존 / 이마 (T-Zone)",
        zoneIcon: "✨",
        confidence: 99.3,
        polygonPoints: "40,28 50,25 60,28 58,35 53,38 52,47 48,47 47,38 42,35",
        fillColor: "rgba(16, 185, 129, 0.28)",
        strokeColor: "rgba(52, 211, 153, 0.95)",
        glowColor: "rgba(16, 185, 129, 0.75)",
        anchorX: 50,
        anchorY: 34,
        productId: "kb-boj-sun",
        brand: "Beauty of Joseon (조선미녀)",
        productName: "맑은쌀선크림 SPF50+ PA++++",
        price: 13500,
        discount: 25,
        productImage: "/products/kb-boj-sun.jpg",
        cosmeticRole: "로션 텍스처 수분 유기자차 차단",
        appliedEffect: "쌀추출물 30% 수분 밀착 결 정돈",
        textureNote: "백탁 및 밀림 없는 무결점 자외선 차단막"
      }
    ]
  },
  {
    id: "post-kb-02",
    creatorHandle: "minji_makeup",
    creatorName: "민지메이크업",
    creatorAvatar: "/kbeauty-models/kb-creator-02.jpg",
    modelImage: "/kbeauty-models/kb-creator-02.jpg",
    routineTitle: "쿨톤 인생 탕후루 립 완성 🍇",
    caption: "베어그레이프 컬러감 무엇... 맑은 물막 광택에 착색까지 짱짱해서 수정화장 1도 필요 없어요!",
    likes: 31200,
    productTags: [
      {
        productId: "kb-romand-tint",
        brand: "rom&nd",
        productName: "쥬시 래스팅 틴트 25 베어그레이프",
        price: 8900,
        discount: 32,
        tagX: 50,
        tagY: 64,
        productImage: "/products/kb-romand-tint.jpg"
      },
      {
        productId: "kb-clio-cushion",
        brand: "CLIO",
        productName: "킬커버 더 뉴 파운웨어 쿠션",
        price: 25200,
        discount: 30,
        tagX: 35,
        tagY: 51,
        productImage: "/products/kb-clio-cushion.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-02-lips",
        zone: "lips",
        zoneName: "입술 (Lips)",
        zoneIcon: "💋",
        confidence: 99.9,
        polygonPoints: "44,61 47,59.2 50,60 53,59.2 56,61 58,63.5 55,66.8 50,68.5 45,66.8 42,63.5",
        fillColor: "rgba(236, 72, 153, 0.38)",
        strokeColor: "rgba(244, 114, 182, 0.98)",
        glowColor: "rgba(236, 72, 153, 0.85)",
        anchorX: 50,
        anchorY: 64,
        productId: "kb-romand-tint",
        brand: "rom&nd (롬앤)",
        productName: "쥬시 래스팅 틴트 #25 베어 그레이프",
        price: 8900,
        discount: 32,
        productImage: "/products/kb-romand-tint.jpg",
        cosmeticRole: "올리브영 1위 탕후루 광택 립",
        appliedEffect: "풀 립 도포 후 입술 중앙 1회 추가 터치",
        textureNote: "시간이 지날수록 투명하게 차오르는 광택막"
      },
      {
        id: "zone-kb-02-cheeks",
        zone: "cheeks",
        zoneName: "양 볼 / 베이스 (Cheeks & Base)",
        zoneIcon: "🖤",
        confidence: 99.6,
        polygonPoints: "27,46 36,43 43,47 44,56 39,63 29,61 24,53",
        fillColor: "rgba(99, 102, 241, 0.30)",
        strokeColor: "rgba(129, 140, 248, 0.95)",
        glowColor: "rgba(99, 102, 241, 0.75)",
        anchorX: 34,
        anchorY: 52,
        productId: "kb-clio-cushion",
        brand: "CLIO (클리오)",
        productName: "킬커버 더 뉴 파운웨어 쿠션",
        price: 25200,
        discount: 30,
        productImage: "/products/kb-clio-cushion.jpg",
        cosmeticRole: "72시간 초슬림 도자기 세미매트 커버",
        appliedEffect: "퍼프로 얇게 톡톡 밀착 두드림",
        textureNote: "모공 요철 블러링 및 묻어남 방지 파우더"
      }
    ]
  },
  {
    id: "post-kb-03",
    creatorHandle: "soyeon_skin",
    creatorName: "소연스킨케어",
    creatorAvatar: "/kbeauty-models/kb-creator-03.jpg",
    modelImage: "/kbeauty-models/kb-creator-03.jpg",
    routineTitle: "트러블 긴급 진정 3일 루틴 🌿",
    caption: "붉은 기 올라올 땐 아누아 어성초 토너팩 + 토리든 저분자 세럼 3겹 레이어링이 정답입니다.",
    likes: 18900,
    productTags: [
      {
        productId: "kb-anua-toner",
        brand: "Anua",
        productName: "어성초 77% 수분 진정 토너",
        price: 16800,
        discount: 27,
        tagX: 50,
        tagY: 34,
        productImage: "/products/kb-anua-toner.jpg"
      },
      {
        productId: "kb-torriden-serum",
        brand: "Torriden",
        productName: "다이브인 저분자 히알루론산 세럼",
        price: 14900,
        discount: 32,
        tagX: 36,
        tagY: 53,
        productImage: "/products/kb-torriden-serum.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-03-cheeks",
        zone: "cheeks",
        zoneName: "양 볼 / 수분존 (Cheeks)",
        zoneIcon: "💧",
        confidence: 99.7,
        polygonPoints: "26,47 35,44 42,48 43,56 38,62 30,60 25,54",
        fillColor: "rgba(14, 165, 233, 0.32)",
        strokeColor: "rgba(56, 189, 248, 0.95)",
        glowColor: "rgba(14, 165, 233, 0.75)",
        anchorX: 34,
        anchorY: 53,
        productId: "kb-torriden-serum",
        brand: "Torriden (토리든)",
        productName: "다이브인 저분자 히알루론산 세럼",
        price: 14900,
        discount: 32,
        productImage: "/products/kb-torriden-serum.jpg",
        cosmeticRole: "5D 저분자 히알루론산 속당김 급속 충전",
        appliedEffect: "세럼 3방울 손바닥 온기로 3겹 흡수",
        textureNote: "끈적임 0% 피부 틈새 수분 잠금"
      },
      {
        id: "zone-kb-03-tzone",
        zone: "tzone",
        zoneName: "T존 / 이마 진정팩 (T-Zone)",
        zoneIcon: "🌿",
        confidence: 99.4,
        polygonPoints: "41,27 50,25 59,27 58,35 53,38 52,47 48,47 47,38 42,35",
        fillColor: "rgba(34, 197, 94, 0.30)",
        strokeColor: "rgba(74, 222, 128, 0.95)",
        glowColor: "rgba(34, 197, 94, 0.75)",
        anchorX: 50,
        anchorY: 34,
        productId: "kb-anua-toner",
        brand: "Anua (아누아)",
        productName: "어성초 77% 수분 진정 토너",
        price: 16800,
        discount: 27,
        productImage: "/products/kb-anua-toner.jpg",
        cosmeticRole: "국내산 어성초추출물 77% 긴급 진정",
        appliedEffect: "화장솜에 듬뿍 적셔 5분 토너팩 진행",
        textureNote: "붉은 기 및 열감 즉각 쿨링 다운"
      }
    ]
  },
  {
    id: "post-kb-04",
    creatorHandle: "chaewon.daily",
    creatorName: "채원데일리",
    creatorAvatar: "/kbeauty-models/kb-creator-04.jpg",
    modelImage: "/kbeauty-models/kb-creator-04.jpg",
    routineTitle: "72시간 무너짐 없는 도자기 베이스 🖤",
    caption: "모공 요철 싹 메워주는 올리브영 1위 클리오 쿠션. 얇게 밀착되면서 퇴근할 때까지 그대로 유지돼요.",
    likes: 27400,
    productTags: [
      {
        productId: "kb-clio-cushion",
        brand: "CLIO",
        productName: "킬커버 더 뉴 파운웨어 쿠션",
        price: 25200,
        discount: 30,
        tagX: 35,
        tagY: 52,
        productImage: "/products/kb-clio-cushion.jpg"
      },
      {
        productId: "kb-romand-tint",
        brand: "rom&nd",
        productName: "쥬시 래스팅 틴트 25 베어그레이프",
        price: 8900,
        discount: 32,
        tagX: 50,
        tagY: 64,
        productImage: "/products/kb-romand-tint.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-04-cheeks",
        zone: "cheeks",
        zoneName: "양 볼 / 베이스 (Cheeks)",
        zoneIcon: "🖤",
        confidence: 99.8,
        polygonPoints: "27,47 36,44 43,48 44,56 39,63 29,61 24,54",
        fillColor: "rgba(59, 130, 246, 0.32)",
        strokeColor: "rgba(96, 165, 250, 0.95)",
        glowColor: "rgba(59, 130, 246, 0.8)",
        anchorX: 34,
        anchorY: 53,
        productId: "kb-clio-cushion",
        brand: "CLIO (클리오)",
        productName: "킬커버 더 뉴 파운웨어 쿠션",
        price: 25200,
        discount: 30,
        productImage: "/products/kb-clio-cushion.jpg",
        cosmeticRole: "72시간 지속 초밀착 커버",
        appliedEffect: "미세 파우더 입자로 얇게 레이어링",
        textureNote: "무결점 세미매트 피니시"
      },
      {
        id: "zone-kb-04-lips",
        zone: "lips",
        zoneName: "입술 (Lips)",
        zoneIcon: "💋",
        confidence: 99.7,
        polygonPoints: "44,61 47,59.2 50,60 53,59.2 56,61 58,63.5 55,66.8 50,68.5 45,66.8 42,63.5",
        fillColor: "rgba(244, 63, 94, 0.35)",
        strokeColor: "rgba(251, 113, 133, 0.95)",
        glowColor: "rgba(244, 63, 94, 0.8)",
        anchorX: 50,
        anchorY: 64,
        productId: "kb-romand-tint",
        brand: "rom&nd (롬앤)",
        productName: "쥬시 래스팅 틴트 #25 베어 그레이프",
        price: 8900,
        discount: 32,
        productImage: "/products/kb-romand-tint.jpg",
        cosmeticRole: "쿨톤 생기 부여 립",
        appliedEffect: "자연스러운 혈색 광택 레이어링",
        textureNote: "끈적임 없는 탕후루 코팅막"
      }
    ]
  },
  {
    id: "post-kb-05",
    creatorHandle: "haein_beauty",
    creatorName: "해인뷰티",
    creatorAvatar: "/kbeauty-models/kb-creator-05.jpg",
    modelImage: "/kbeauty-models/kb-creator-05.jpg",
    routineTitle: "에이지알 부스터프로 1주일 피부 변화 ⚡",
    caption: "스킨케어 유효성분을 785% 깊숙이 흡수시켜주는 인생 디바이스. 다음 날 아침 화장 먹는 게 달라요.",
    likes: 42100,
    productTags: [
      {
        productId: "kb-medicube-pro",
        brand: "medicube",
        productName: "에이지알 부스터 프로 6-in-1",
        price: 249000,
        discount: 37,
        tagX: 50,
        tagY: 72,
        productImage: "/products/kb-medicube-pro.jpg"
      },
      {
        productId: "kb-dalba-serum",
        brand: "d'Alba",
        productName: "화이트 트러플 퍼스트 스프레이 세럼",
        price: 19900,
        discount: 33,
        tagX: 36,
        tagY: 53,
        productImage: "/products/kb-dalba-serum.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-05-contour",
        zone: "contour",
        zoneName: "턱선 / 리프팅 윤곽 (Jawline)",
        zoneIcon: "⚡",
        confidence: 99.4,
        polygonPoints: "32,66 40,73 50,76 60,73 68,66 62,71 50,74.5 38,71",
        fillColor: "rgba(168, 85, 247, 0.32)",
        strokeColor: "rgba(192, 132, 252, 0.95)",
        glowColor: "rgba(168, 85, 247, 0.8)",
        anchorX: 50,
        anchorY: 72,
        productId: "kb-medicube-pro",
        brand: "medicube (메디큐브)",
        productName: "에이지알 부스터 프로 6-in-1 토탈 케어",
        price: 249000,
        discount: 37,
        productImage: "/products/kb-medicube-pro.jpg",
        cosmeticRole: "유효성분 흡수율 785% 증폭",
        appliedEffect: "미세전류 더마샷 턱선 윤곽 리프팅 모드",
        textureNote: "피부 속 탄력 케어 및 붓기 완화"
      },
      {
        id: "zone-kb-05-cheeks",
        zone: "cheeks",
        zoneName: "양 볼 광채 (Cheeks)",
        zoneIcon: "✨",
        confidence: 99.5,
        polygonPoints: "27,47 35,44 42,48 43,56 38,62 30,60 25,54",
        fillColor: "rgba(245, 158, 11, 0.30)",
        strokeColor: "rgba(251, 191, 36, 0.95)",
        glowColor: "rgba(245, 158, 11, 0.75)",
        anchorX: 34,
        anchorY: 53,
        productId: "kb-dalba-serum",
        brand: "d'Alba (달바)",
        productName: "화이트 트러플 퍼스트 스프레이 세럼",
        price: 19900,
        discount: 33,
        productImage: "/products/kb-dalba-serum.jpg",
        cosmeticRole: "부스터프로 연동 광채 세럼",
        appliedEffect: "세럼 도포 후 부스터 모드로 깊숙이 흡수",
        textureNote: "진피층까지 차오르는 수분 광채"
      }
    ]
  },
  {
    id: "post-kb-06",
    creatorHandle: "eunji_skincare",
    creatorName: "은지스킨",
    creatorAvatar: "/kbeauty-models/kb-creator-06.jpg",
    modelImage: "/kbeauty-models/kb-creator-06.jpg",
    routineTitle: "환절기 무너진 장벽 살리는 SOS 크림 💧",
    caption: "피부과 처방 1위 에스트라 아토베리어 크림 + 라운드랩 수분크림. 속건조 잡고 꿀잠 자고 일어났어요!",
    likes: 19500,
    productTags: [
      {
        productId: "kb-aestura-cream",
        brand: "AESTURA",
        productName: "아토베리어365 크림 80ml",
        price: 26400,
        discount: 20,
        tagX: 50,
        tagY: 50,
        productImage: "/products/kb-aestura-cream.jpg"
      },
      {
        productId: "kb-roundlab-cream",
        brand: "ROUND LAB",
        productName: "자작나무 수분 크림 80ml",
        price: 22400,
        discount: 30,
        tagX: 34,
        tagY: 55,
        productImage: "/products/kb-roundlab-cream.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-06-barrier",
        zone: "barrier",
        zoneName: "얼굴 전체 피부 장벽 (Skin Barrier)",
        zoneIcon: "🛡️",
        confidence: 99.7,
        polygonPoints: "32,32 50,28 68,32 72,48 68,64 50,72 32,64 28,48",
        fillColor: "rgba(59, 130, 246, 0.25)",
        strokeColor: "rgba(96, 165, 250, 0.95)",
        glowColor: "rgba(59, 130, 246, 0.75)",
        anchorX: 50,
        anchorY: 48,
        productId: "kb-aestura-cream",
        brand: "AESTURA (에스트라)",
        productName: "아토베리어365 크림 80ml",
        price: 26400,
        discount: 20,
        productImage: "/products/kb-aestura-cream.jpg",
        cosmeticRole: "피부과 처방 1위 더마온 세라마이드 장벽막",
        appliedEffect: "보습 캡슐을 체온으로 녹여 120시간 장벽 방패 형성",
        textureNote: "무너진 각질층 미세 틈새 고밀도 밀착"
      },
      {
        id: "zone-kb-06-cheeks",
        zone: "cheeks",
        zoneName: "양 볼 수분 캡슐 (Cheeks)",
        zoneIcon: "💧",
        confidence: 99.4,
        polygonPoints: "27,47 35,44 42,48 43,56 38,62 30,60 25,54",
        fillColor: "rgba(14, 165, 233, 0.30)",
        strokeColor: "rgba(56, 189, 248, 0.95)",
        glowColor: "rgba(14, 165, 233, 0.75)",
        anchorX: 34,
        anchorY: 54,
        productId: "kb-roundlab-cream",
        brand: "ROUND LAB (라운드랩)",
        productName: "자작나무 수분 크림 80ml",
        price: 22400,
        discount: 30,
        productImage: "/products/kb-roundlab-cream.jpg",
        cosmeticRole: "인제 자작나무 수액 48시간 수분 충전",
        appliedEffect: "수분 캡슐이 터지며 청량한 쿨링감 선사",
        textureNote: "끈적임 0% 산뜻한 젤 크림 피니시"
      }
    ]
  },
  {
    id: "post-kb-07",
    creatorHandle: "jiwoo.pure",
    creatorName: "지우클린",
    creatorAvatar: "/kbeauty-models/model-cleansing-pure.jpg",
    modelImage: "/kbeauty-models/model-cleansing-pure.jpg",
    routineTitle: "블랙헤드 99% 녹이는 모공 딥클렌징 🫧",
    caption: "1,000만병 신화 마녀공장 퓨어 클렌징 오일. 유화 과정만 제대로 거치면 피지랑 블랙헤드가 쏙쏙 빠져요!",
    likes: 38400,
    productTags: [
      {
        productId: "kb-manyo-oil",
        brand: "ma:nyo",
        productName: "퓨어 클렌징 오일 200ml",
        price: 18900,
        discount: 35,
        tagX: 50,
        tagY: 48,
        productImage: "/products/kb-manyo-oil.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-07-tzone",
        zone: "tzone",
        zoneName: "코 & T존 모공 딥클렌징",
        zoneIcon: "🫧",
        confidence: 99.8,
        polygonPoints: "42,32 50,29 58,32 57,42 53,46 52,55 48,55 47,46 43,42",
        fillColor: "rgba(234, 179, 8, 0.30)",
        strokeColor: "rgba(250, 204, 21, 0.95)",
        glowColor: "rgba(234, 179, 8, 0.8)",
        anchorX: 50,
        anchorY: 46,
        productId: "kb-manyo-oil",
        brand: "ma:nyo (마녀공장)",
        productName: "퓨어 클렌징 오일 200ml",
        price: 18900,
        discount: 35,
        productImage: "/products/kb-manyo-oil.jpg",
        cosmeticRole: "블랙헤드 99.73% 세정력 유화 오일",
        appliedEffect: "물과 닿는 즉시 밀크빛 유화로 피지 멜팅",
        textureNote: "식물성 오일 14종 저자극 모공 딥클린"
      }
    ]
  },
  {
    id: "post-kb-08",
    creatorHandle: "sarah_glass",
    creatorName: "세라글로우",
    creatorAvatar: "/kbeauty-models/model-glass-skin.jpg",
    modelImage: "/kbeauty-models/model-glass-skin.jpg",
    routineTitle: "미국 틱톡 조회수 1억 회 돌파 선크림 후기 🌟",
    caption: "해외 세포라에서도 품절 대란인 조선미녀 쌀선크림. 끈적임이나 눈시림 없이 하루 종일 수분광이 돌아요.",
    likes: 56200,
    productTags: [
      {
        productId: "kb-boj-sun",
        brand: "Beauty of Joseon",
        productName: "맑은쌀선크림 SPF50+ PA++++",
        price: 13500,
        discount: 25,
        tagX: 50,
        tagY: 34,
        productImage: "/products/kb-boj-sun.jpg"
      },
      {
        productId: "kb-romand-tint",
        brand: "rom&nd",
        productName: "쥬시 래스팅 틴트 25 베어그레이프",
        price: 8900,
        discount: 32,
        tagX: 50,
        tagY: 64,
        productImage: "/products/kb-romand-tint.jpg"
      }
    ],
    faceZones: [
      {
        id: "zone-kb-08-tzone",
        zone: "tzone",
        zoneName: "T존 / 이마 수분 자외선 차단",
        zoneIcon: "🌞",
        confidence: 99.6,
        polygonPoints: "41,27 50,25 59,27 58,35 53,38 52,47 48,47 47,38 42,35",
        fillColor: "rgba(16, 185, 129, 0.30)",
        strokeColor: "rgba(52, 211, 153, 0.95)",
        glowColor: "rgba(16, 185, 129, 0.8)",
        anchorX: 50,
        anchorY: 34,
        productId: "kb-boj-sun",
        brand: "Beauty of Joseon (조선미녀)",
        productName: "맑은쌀선크림 SPF50+ PA++++",
        price: 13500,
        discount: 25,
        productImage: "/products/kb-boj-sun.jpg",
        cosmeticRole: "글로벌 틱톡 1억 뷰 신화 선크림",
        appliedEffect: "쌀 발효 추출물로 로션처럼 편안한 발림성",
        textureNote: "백탁 없는 투명한 글래스 스킨 연출"
      },
      {
        id: "zone-kb-08-lips",
        zone: "lips",
        zoneName: "입술 (Lips)",
        zoneIcon: "💋",
        confidence: 99.8,
        polygonPoints: "44,61 47,59.2 50,60 53,59.2 56,61 58,63.5 55,66.8 50,68.5 45,66.8 42,63.5",
        fillColor: "rgba(244, 63, 94, 0.35)",
        strokeColor: "rgba(251, 113, 133, 0.95)",
        glowColor: "rgba(244, 63, 94, 0.8)",
        anchorX: 50,
        anchorY: 64,
        productId: "kb-romand-tint",
        brand: "rom&nd (롬앤)",
        productName: "쥬시 래스팅 틴트 #25 베어 그레이프",
        price: 8900,
        discount: 32,
        productImage: "/products/kb-romand-tint.jpg",
        cosmeticRole: "탕후루 광택 립 포인트",
        appliedEffect: "맑은 수분 코팅 립",
        textureNote: "착색력과 광택의 완벽한 밸런스"
      }
    ]
  }
];

