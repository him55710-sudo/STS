import type { Creator, Post, Product } from "./types";

/**
 * STS 시드 카탈로그 — 전 상품이 실존 제품이고, 콘텐츠는 전부 실사 사진이다.
 * 구매 링크는 상품이 바로 보이는 검색 딥링크(공식몰 상품 URL은 시즌마다 바뀌므로
 * 정확 상품명 검색 결과로 연결). 가격은 공개 정가 기준의 참고값이다.
 *
 * exactness = "exact"  : 사진 속 물건과 동일 상품으로 확인된 것
 * exactness = "similar": 브랜드/모델을 특정할 수 없어 같은 스타일의 구매 가능한 상품을 연결한 것
 */

const nv = (q: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;

/** 남성 룩 1~5 상품 */
export const LOOK_PRODUCTS: Product[] = [
  // Look 1 — 스마트 캐주얼 / 아이비리그
  { id: "pl-polo-oxford", brand: "Polo Ralph Lauren", name: "아이코닉 옥스포드 셔츠 클래식 핏", price: 259000, currency: "KRW", retailer: "폴로 공식몰", url: nv("폴로 랄프로렌 아이코닉 옥스포드 셔츠 클래식핏 블루"), image: "/looks/pl-polo-oxford.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["plw-polo-oxford", "pl-uniqlo-tee"] },
  { id: "pl-levis-501", brand: "Levi's", name: "501 오리지널 라이트 워시", price: 91300, currency: "KRW", retailer: "리바이스 공식몰", url: nv("리바이스 501 오리지널 라이트 인디고"), image: "/looks/pl-levis-501.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-apc-jeans", "plw-levis-ribcage"] },
  { id: "pl-dm-1461", brand: "Dr. Martens", name: "1461 스무스 블랙", price: 195000, currency: "KRW", retailer: "닥터마틴 공식몰", url: nv("닥터마틴 1461 스무스 블랙 3홀"), image: "/looks/pl-dm-1461.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-samba"] },
  { id: "pl-prada-bag", brand: "Prada", name: "리나일론 사피아노 숄더백", price: 2300000, currency: "KRW", retailer: "프라다 공식", url: nv("프라다 리나일론 사피아노 숄더백 블랙"), image: "/looks/pl-prada-bag.jpg", category: "fashion", affiliate: false, similarIds: ["plw-prada-re2005"] },
  // Look 2 — 모던 클래식 / 헤리티지
  { id: "pl-barbour-bedale", brand: "Barbour", name: "비데일 왁스 자켓 세이지", price: 384000, currency: "KRW", retailer: "바버 공식몰", url: nv("바버 비데일 왁스자켓 세이지"), image: "/looks/pl-barbour-bedale.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["plw-barbour-beadnell", "pl-patagonia-retrox"] },
  { id: "pl-uniqlo-tee", brand: "Uniqlo", name: "수피마 코튼 크루넥 티셔츠", price: 19900, currency: "KRW", retailer: "유니클로", url: nv("유니클로 수피마 코튼 크루넥 티셔츠 화이트"), image: "/looks/pl-uniqlo-tee.jpg", category: "fashion", affiliate: true, commissionRate: 0.03, similarIds: [] },
  { id: "pl-apc-jeans", brand: "A.P.C.", name: "쁘띠 스탠다드 로우 인디고 셀비지", price: 329000, currency: "KRW", retailer: "A.P.C. 공식", url: nv("아페쎄 쁘띠 스탠다드 셀비지 데님"), image: "/looks/pl-apc-jeans.jpg", category: "fashion", affiliate: false, similarIds: ["pl-levis-501", "plw-cos-dark-jeans"] },
  { id: "pl-clarks-wallabee", brand: "Clarks Originals", name: "왈라비 메이플 스웨이드", price: 259000, currency: "KRW", retailer: "클락스 공식몰", url: nv("클락스 왈라비 메이플 스웨이드"), image: "/looks/pl-clarks-wallabee.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-birken-boston"] },
  { id: "pl-omega-speedmaster", brand: "Omega", name: "스피드마스터 문워치 프로페셔널", price: 11500000, currency: "KRW", retailer: "오메가 부티크", url: nv("오메가 스피드마스터 문워치 프로페셔널"), image: "/looks/pl-omega-speedmaster.jpg", category: "fashion", affiliate: false, similarIds: ["pl-cartier-tank"] },
  // Look 3 — 미니멀 컨템포러리
  { id: "pl-acne-sweat", brand: "Acne Studios", name: "러버 로고 플리스 스웨트셔츠", price: 450000, currency: "KRW", retailer: "아크네 공식", url: nv("아크네 스튜디오 로고 스웨트셔츠 그레이"), image: "/looks/pl-acne-sweat.jpg", category: "fashion", affiliate: false, similarIds: ["plw-acne-sweat-oat"] },
  { id: "pl-acne-scarf", brand: "Acne Studios", name: "투톤 울 스카프 라이트 베이지", price: 290000, currency: "KRW", retailer: "아크네 공식", url: nv("아크네 스튜디오 울 머플러 베이지"), image: "/looks/pl-acne-scarf.jpg", category: "fashion", affiliate: false, similarIds: [] },
  { id: "pl-cos-pants", brand: "COS", name: "와이드 레그 울 트라우저 블랙", price: 159000, currency: "KRW", retailer: "COS 공식몰", url: nv("COS 와이드 레그 트라우저 블랙"), image: "/looks/pl-cos-pants.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-tnf-pants"] },
  { id: "pl-margiela-replica", brand: "Maison Margiela", name: "레플리카 스니커즈 화이트", price: 790000, currency: "KRW", retailer: "마르지엘라 공식", url: nv("메종 마르지엘라 레플리카 스니커즈 화이트"), image: "/looks/pl-margiela-replica.jpg", category: "fashion", affiliate: false, similarIds: ["pl-samba", "plw-samba-white"] },
  // Look 4 — 시티보이 / 아웃도어
  { id: "pl-patagonia-retrox", brand: "Patagonia", name: "클래식 레트로X 플리스 자켓", price: 289000, currency: "KRW", retailer: "파타고니아 코리아", url: nv("파타고니아 클래식 레트로X 자켓 내추럴"), image: "/looks/pl-patagonia-retrox.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-barbour-bedale"] },
  { id: "pl-tnf-pants", brand: "The North Face", name: "카고 조거 팬츠 다크 그레이", price: 139000, currency: "KRW", retailer: "노스페이스 코리아", url: nv("노스페이스 카고 조거 팬츠 다크그레이"), image: "/looks/pl-tnf-pants.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["pl-cos-pants"] },
  { id: "pl-birken-boston", brand: "Birkenstock", name: "보스턴 소프트풋베드 스웨이드 토프", price: 229000, currency: "KRW", retailer: "버켄스탁 공식몰", url: nv("버켄스탁 보스턴 소프트풋베드 스웨이드 토프"), image: "/looks/pl-birken-boston.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-clarks-wallabee"] },
  { id: "pl-arc-heliad", brand: "Arc'teryx", name: "헬리어드 15 백팩 블랙", price: 180000, currency: "KRW", retailer: "아크테릭스 코리아", url: nv("아크테릭스 헬리어드 15 백팩"), image: "/looks/pl-arc-heliad.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: [] },
  // Look 5 — 프렌치 럭셔리 스트리트
  { id: "pl-ami-knit", brand: "AMI Paris", name: "아미 드 쾨르 크루넥 울 니트 내추럴", price: 595000, currency: "KRW", retailer: "AMI 공식", url: nv("아미 파리 하트로고 크루넥 니트 내추럴"), image: "/looks/pl-ami-knit.jpg", category: "fashion", affiliate: false, similarIds: ["plw-acne-sweat-oat"] },
  { id: "pl-ysl-jeans", brand: "Saint Laurent", name: "슬림핏 진 다크 블루 블랙", price: 1340000, currency: "KRW", retailer: "생로랑 공식", url: nv("생로랑 슬림핏 데님 블랙"), image: "/looks/pl-ysl-jeans.jpg", category: "fashion", affiliate: false, similarIds: ["plw-cos-dark-jeans"] },
  { id: "pl-samba", brand: "Adidas", name: "삼바 OG 블랙", price: 139000, currency: "KRW", retailer: "아디다스 코리아", url: nv("아디다스 삼바 OG 블랙"), image: "/looks/pl-samba.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["plw-samba-white", "pl-dm-1461"] },
  { id: "pl-cartier-tank", brand: "Cartier", name: "탱크 머스트 레더 스트랩", price: 4300000, currency: "KRW", retailer: "까르띠에 부티크", url: nv("까르띠에 탱크 머스트"), image: "/looks/pl-cartier-tank.jpg", category: "fashion", affiliate: false, similarIds: ["pl-omega-speedmaster"] },
];

/** 여성 룩 6~10 상품 */
export const LOOK_PRODUCTS_W: Product[] = [
  // Look 6 — 프레피 스마트 캐주얼
  { id: "plw-polo-oxford", brand: "Polo Ralph Lauren", name: "클래식 핏 옥스포드 셔츠 스카이 블루", price: 198000, currency: "KRW", retailer: "폴로 공식몰", url: nv("폴로 랄프로렌 여성 클래식핏 옥스포드 셔츠 블루"), image: "/looks/plw-polo-oxford.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["pl-polo-oxford"] },
  { id: "plw-levis-ribcage", brand: "Levi's", name: "리브케이지 스트레이트 앵클 라이트 워시", price: 148000, currency: "KRW", retailer: "리바이스 공식몰", url: nv("리바이스 리브케이지 스트레이트 앵클 라이트"), image: "/looks/plw-levis-ribcage.jpg", category: "fashion", affiliate: true, commissionRate: 0.08, similarIds: ["pl-levis-501"] },
  { id: "plw-samba-white", brand: "Adidas", name: "삼바 OG 클라우드 화이트 · 검", price: 139000, currency: "KRW", retailer: "아디다스 코리아", url: nv("아디다스 삼바 OG 화이트 검"), image: "/looks/plw-samba-white.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-samba"] },
  { id: "plw-prada-re2005", brand: "Prada", name: "리에디션 2005 리나일론 숄더백 블랙", price: 2150000, currency: "KRW", retailer: "프라다 공식", url: nv("프라다 리에디션 2005 리나일론 숄더백 블랙"), image: "/looks/plw-prada-re2005.jpg", category: "fashion", affiliate: false, similarIds: ["pl-prada-bag"] },
  { id: "plw-tiffany-heart", brand: "Tiffany & Co.", name: "리턴 투 티파니 하트 태그 펜던트", price: 545000, currency: "KRW", retailer: "티파니 공식", url: nv("티파니 리턴투티파니 하트 태그 펜던트 실버"), image: "/looks/plw-tiffany-heart.jpg", category: "fashion", affiliate: false, similarIds: ["plw-gold-chain"] },
  { id: "plw-silver-hoop", brand: "OST", name: "실버 925 미니 후프 이어링", price: 49000, currency: "KRW", retailer: "OST 공식몰", url: nv("실버 925 미니 후프 이어링"), image: "/looks/plw-silver-hoop.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-gold-hoop", "plw-silver-stud"] },

  // Look 7 — 브리티시 헤리티지 캐주얼
  { id: "plw-barbour-beadnell", brand: "Barbour", name: "비드넬 왁스 자켓 올리브", price: 399000, currency: "KRW", retailer: "바버 공식몰", url: nv("바버 비드넬 왁스자켓 올리브 여성"), image: "/looks/plw-barbour-beadnell.jpg", category: "fashion", affiliate: true, commissionRate: 0.07, similarIds: ["pl-barbour-bedale"] },
  { id: "plw-cos-dark-jeans", brand: "COS", name: "스트레이트 레그 진 다크 인디고", price: 139000, currency: "KRW", retailer: "COS 공식몰", url: nv("COS 스트레이트 레그 진 다크 인디고"), image: "/looks/plw-cos-dark-jeans.jpg", category: "fashion", affiliate: true, commissionRate: 0.06, similarIds: ["pl-apc-jeans"] },
  { id: "plw-longchamp", brand: "Longchamp", name: "르 플리아쥬 오리지널 L 롱핸들 블랙", price: 165000, currency: "KRW", retailer: "롱샴 공식몰", url: nv("롱샴 르플리아쥬 오리지널 L 롱핸들 블랙"), image: "/looks/plw-longchamp.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-polene-bag"] },
  { id: "plw-gold-hoop", brand: "Lloyd", name: "14K 골드 미니 후프 이어링", price: 129000, currency: "KRW", retailer: "로이드 공식몰", url: nv("14K 골드 미니 후프 이어링"), image: "/looks/plw-gold-hoop.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-silver-hoop"] },
  { id: "plw-silver-rings", brand: "OST", name: "실버 925 레이어드 링 세트", price: 59000, currency: "KRW", retailer: "OST 공식몰", url: nv("실버 925 레이어드 반지 세트"), image: "/looks/plw-silver-rings.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-silver-hoop"] },

  // Look 8 — 미니멀 컨템포러리
  { id: "plw-acne-sweat-oat", brand: "Acne Studios", name: "오버사이즈 코튼 스웨트셔츠 오트밀", price: 420000, currency: "KRW", retailer: "아크네 공식", url: nv("아크네 스튜디오 오버사이즈 스웨트셔츠 오트밀"), image: "/looks/plw-acne-sweat-oat.jpg", category: "fashion", affiliate: false, similarIds: ["pl-acne-sweat", "pl-ami-knit"] },
  { id: "plw-celine-bag", brand: "Celine", name: "트리옹프 스몰 숄더백 블랙", price: 5900000, currency: "KRW", retailer: "셀린느 공식", url: nv("셀린느 트리옹프 숄더백 블랙"), image: "/looks/plw-celine-bag.jpg", category: "fashion", affiliate: false, similarIds: ["plw-polene-bag", "plw-prada-re2005"] },
  { id: "plw-gold-chain", brand: "골든듀", name: "14K 라운드 체인 네크리스", price: 298000, currency: "KRW", retailer: "골든듀 공식몰", url: nv("14K 골드 체인 목걸이 레이어드"), image: "/looks/plw-gold-chain.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-tiffany-heart"] },
  { id: "plw-gold-bracelet", brand: "골든듀", name: "14K 체인 브레이슬릿", price: 248000, currency: "KRW", retailer: "골든듀 공식몰", url: nv("14K 골드 체인 팔찌"), image: "/looks/plw-gold-bracelet.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-gold-chain"] },

  // Look 9 — 아웃도어 시티걸
  { id: "plw-socks", brand: "Uniqlo", name: "리브 크루 삭스 화이트", price: 9900, currency: "KRW", retailer: "유니클로", url: nv("유니클로 리브 크루 삭스 화이트"), image: "/looks/plw-socks.jpg", category: "fashion", affiliate: true, commissionRate: 0.03, similarIds: [] },
  { id: "plw-silver-stud", brand: "OST", name: "실버 925 미니 스터드 이어링", price: 39000, currency: "KRW", retailer: "OST 공식몰", url: nv("실버 925 미니 스터드 귀걸이"), image: "/looks/plw-silver-stud.jpg", category: "fashion", affiliate: true, commissionRate: 0.05, similarIds: ["plw-silver-hoop"] },

  // Look 10 — 프렌치 럭셔리 캐주얼
  { id: "plw-polene-bag", brand: "Polène", name: "뉴메로 위 나노 블랙", price: 580000, currency: "KRW", retailer: "폴렌 공식", url: nv("폴렌 뉴메로 위 나노 블랙"), image: "/looks/plw-polene-bag.jpg", category: "fashion", affiliate: false, similarIds: ["plw-celine-bag", "plw-longchamp"] },
];

export const PRODUCTS: Product[] = [...LOOK_PRODUCTS, ...LOOK_PRODUCTS_W];

export const CREATORS: Creator[] = [
  { id: "c-minu", handle: "minu.archive", name: "김민우", bio: "매일의 실물 착장 아카이브 📌\n사진 속 물건을 탭하면 바로 구매로 이어져요", followers: 218000, category: "fashion", tone: "#4A4D52", avatarImage: "/looks/look1.jpg", verified: true },
  { id: "c-eun", handle: "edit.eunseo", name: "김은서", bio: "여성 데일리 룩 에디토리얼 ✧\n입은 것 전부 탭으로 연결해둡니다", followers: 184300, category: "fashion", tone: "#8A8175", avatarImage: "/looks/look8.jpg", verified: true },
  { id: "c-rin", handle: "rin.heritage", name: "이서린", bio: "헤리티지 · 아웃도어 스타일링\n오래 입는 옷만 고릅니다", followers: 96700, category: "fashion", tone: "#5C6152", avatarImage: "/looks/look9.jpg", verified: true },
  { id: "c-me", handle: "me.sts", name: "나", bio: "내 콘텐츠", followers: 0, category: "fashion", tone: "#77727F" },
];

/**
 * 실사 룩 게시물 — 좌표는 Gemini detection 실측 + 그리드 검수값.
 * polygon(실루엣)은 fashion_v2 온디바이스 세그멘테이션으로 생성해 주입한다.
 */
export const LOOK_POSTS: Post[] = [
  {
    id: "post-look1",
    creatorId: "c-minu",
    image: "/looks/look1.jpg",
    ratio: 1,
    caption: "스마트 캐주얼. 옥스포드 셔츠 하나면 충분한 날 🔵 전부 태그해뒀어요",
    category: "fashion",
    likes: 12843,
    createdAt: "2026-08-12T18:30:00+09:00",
    objects: [
      { id: "l1-shirt", label: "옥스포드 셔츠", x: 0.331, y: 0.176, w: 0.302, h: 0.371, polygon: [[0.505,0.177],[0.585,0.209],[0.624,0.279],[0.623,0.416],[0.593,0.434],[0.573,0.423],[0.545,0.471],[0.562,0.488],[0.596,0.44],[0.579,0.513],[0.587,0.59],[0.409,0.591],[0.407,0.434],[0.393,0.415],[0.374,0.437],[0.351,0.423],[0.334,0.341],[0.379,0.234],[0.441,0.193],[0.466,0.226],[0.504,0.179]], productId: "pl-polo-oxford", exactness: "exact", confidence: 0.95 },
      { id: "l1-bag", label: "나일론 크로스백", x: 0.421, y: 0.201, w: 0.161, h: 0.241, polygon: [[0.443,0.173],[0.509,0.173],[0.599,0.227],[0.598,0.471],[0.402,0.47],[0.402,0.218],[0.44,0.196],[0.441,0.174]], productId: "pl-prada-bag", exactness: "exact", confidence: 0.92 },
      { id: "l1-jeans", label: "라이트 데님", x: 0.398, y: 0.479, w: 0.206, h: 0.426, polygon: [[0.405,0.427],[0.568,0.427],[0.551,0.488],[0.568,0.482],[0.588,0.427],[0.604,0.427],[0.58,0.509],[0.602,0.837],[0.602,0.884],[0.585,0.904],[0.551,0.904],[0.538,0.877],[0.524,0.713],[0.493,0.613],[0.479,0.679],[0.496,0.887],[0.463,0.893],[0.432,0.874],[0.404,0.429]], productId: "pl-levis-501", exactness: "exact", confidence: 0.93 },
      { id: "l1-shoes", label: "더비 슈즈", x: 0.388, y: 0.874, w: 0.205, h: 0.115, polygon: [[0.365,0.86],[0.616,0.86],[0.618,0.998],[0.365,0.999],[0.363,0.862]], productId: "pl-dm-1461", exactness: "exact", confidence: 0.94 },
      { id: "l1-watch", label: "손목시계", x: 0.545, y: 0.448, w: 0.034, h: 0.03, polygon: [[0.535,0.438],[0.59,0.438],[0.588,0.487],[0.535,0.488],[0.534,0.44]], productId: null, exactness: "similar", confidence: 0.6 },
    ],
  },
  {
    id: "post-look2",
    creatorId: "c-minu",
    image: "/looks/look2.jpg",
    ratio: 1,
    caption: "모던 클래식 — 바버는 10년을 입는 옷이에요. 로우 데님과 왈라비로 마무리",
    category: "fashion",
    likes: 9412,
    createdAt: "2026-08-12T12:00:00+09:00",
    objects: [
      { id: "l2-jacket", label: "왁스 자켓", x: 0.364, y: 0.163, w: 0.301, h: 0.39, polygon: [[0.526,0.166],[0.618,0.23],[0.654,0.371],[0.63,0.421],[0.663,0.521],[0.579,0.545],[0.574,0.599],[0.416,0.599],[0.407,0.529],[0.366,0.524],[0.393,0.251],[0.457,0.185],[0.47,0.213],[0.505,0.207],[0.524,0.168]], productId: "pl-barbour-bedale", exactness: "exact", confidence: 0.96 },
      { id: "l2-tee", label: "화이트 티셔츠", x: 0.442, y: 0.198, w: 0.096, h: 0.273, polygon: [[0.526,0.166],[0.549,0.188],[0.549,0.43],[0.516,0.455],[0.549,0.47],[0.549,0.502],[0.432,0.504],[0.43,0.21],[0.457,0.185],[0.47,0.213],[0.502,0.209],[0.524,0.168]], productId: "pl-uniqlo-tee", exactness: "similar", confidence: 0.78 },
      { id: "l2-jeans", label: "로우 데님", x: 0.411, y: 0.451, w: 0.175, h: 0.444, polygon: [[0.391,0.398],[0.607,0.399],[0.607,0.538],[0.576,0.548],[0.566,0.652],[0.584,0.795],[0.574,0.895],[0.527,0.888],[0.499,0.67],[0.516,0.871],[0.485,0.884],[0.46,0.87],[0.416,0.546],[0.39,0.524],[0.39,0.399]], productId: "pl-apc-jeans", exactness: "exact", confidence: 0.9 },
      { id: "l2-shoes", label: "왈라비", x: 0.403, y: 0.876, w: 0.178, h: 0.087, polygon: [[0.462,0.865],[0.515,0.865],[0.521,0.89],[0.526,0.865],[0.582,0.865],[0.574,0.954],[0.526,0.962],[0.518,0.932],[0.41,0.946],[0.409,0.924],[0.438,0.91],[0.46,0.866]], productId: "pl-clarks-wallabee", exactness: "exact", confidence: 0.93 },
      { id: "l2-watch", label: "크로노그래프 시계", x: 0.531, y: 0.425, w: 0.03, h: 0.033, polygon: [[0.523,0.413],[0.571,0.415],[0.57,0.47],[0.521,0.468],[0.521,0.415]], productId: "pl-omega-speedmaster", exactness: "similar", confidence: 0.62 },
    ],
  },
  {
    id: "post-look3",
    creatorId: "c-minu",
    image: "/looks/look3.jpg",
    ratio: 1,
    caption: "미니멀 컨템포러리. 채도를 낮추면 실루엣이 보입니다",
    category: "fashion",
    likes: 15204,
    createdAt: "2026-08-12T09:00:00+09:00",
    objects: [
      { id: "l3-scarf", label: "울 스카프", x: 0.43, y: 0.191, w: 0.129, h: 0.23, polygon: [[0.47,0.198],[0.574,0.235],[0.573,0.449],[0.415,0.448],[0.415,0.235],[0.47,0.199]], productId: "pl-acne-scarf", exactness: "exact", confidence: 0.9 },
      { id: "l3-sweat", label: "스웨트셔츠", x: 0.357, y: 0.211, w: 0.27, h: 0.302, polygon: [[0.47,0.198],[0.58,0.237],[0.613,0.284],[0.623,0.44],[0.607,0.49],[0.577,0.512],[0.574,0.549],[0.388,0.548],[0.388,0.485],[0.36,0.451],[0.371,0.348],[0.404,0.248],[0.47,0.199]], productId: "pl-acne-sweat", exactness: "exact", confidence: 0.92 },
      { id: "l3-pants", label: "와이드 트라우저", x: 0.379, y: 0.472, w: 0.205, h: 0.479, polygon: [[0.36,0.415],[0.609,0.416],[0.609,0.487],[0.576,0.521],[0.568,0.804],[0.574,0.923],[0.609,0.946],[0.607,0.966],[0.487,0.945],[0.479,0.88],[0.441,0.962],[0.401,0.954],[0.384,0.87],[0.387,0.493],[0.362,0.46],[0.359,0.416]], productId: "pl-cos-pants", exactness: "similar", confidence: 0.8 },
      { id: "l3-shoes", label: "저먼 트레이너", x: 0.397, y: 0.914, w: 0.216, h: 0.054, polygon: [[0.393,0.907],[0.573,0.907],[0.612,0.963],[0.466,0.94],[0.416,0.965],[0.393,0.909]], productId: "pl-margiela-replica", exactness: "exact", confidence: 0.9 },
    ],
  },
  {
    id: "post-look4",
    creatorId: "c-minu",
    image: "/looks/look4.jpg",
    ratio: 1,
    caption: "시티보이 아웃도어. 레트로X에 보스턴이면 가을 준비 끝 🍂",
    category: "fashion",
    likes: 8931,
    createdAt: "2026-08-11T19:00:00+09:00",
    objects: [
      { id: "l4-fleece", label: "플리스 자켓", x: 0.381, y: 0.196, w: 0.261, h: 0.317, polygon: [[0.524,0.201],[0.576,0.223],[0.615,0.268],[0.638,0.421],[0.598,0.502],[0.568,0.507],[0.584,0.524],[0.576,0.551],[0.401,0.551],[0.393,0.279],[0.455,0.204],[0.482,0.238],[0.523,0.202]], productId: "pl-patagonia-retrox", exactness: "exact", confidence: 0.95 },
      { id: "l4-backpack", label: "백팩", x: 0.539, y: 0.218, w: 0.127, h: 0.335, polygon: [[0.524,0.198],[0.598,0.24],[0.638,0.366],[0.638,0.421],[0.585,0.509],[0.576,0.593],[0.524,0.591],[0.524,0.199]], productId: "pl-arc-heliad", exactness: "similar", confidence: 0.75 },
      { id: "l4-pants", label: "카고 팬츠", x: 0.381, y: 0.491, w: 0.206, h: 0.385, polygon: [[0.398,0.445],[0.612,0.446],[0.598,0.504],[0.568,0.507],[0.584,0.524],[0.577,0.659],[0.541,0.877],[0.502,0.862],[0.496,0.804],[0.471,0.841],[0.46,0.835],[0.399,0.738],[0.382,0.674],[0.404,0.513],[0.396,0.446]], productId: "pl-tnf-pants", exactness: "similar", confidence: 0.77 },
      { id: "l4-clogs", label: "스웨이드 클로그", x: 0.419, y: 0.829, w: 0.124, h: 0.11, polygon: [[0.466,0.84],[0.541,0.879],[0.541,0.913],[0.498,0.938],[0.452,0.938],[0.421,0.896],[0.466,0.841]], productId: "pl-birken-boston", exactness: "exact", confidence: 0.93 },
    ],
  },
  {
    id: "post-look5",
    creatorId: "c-minu",
    image: "/looks/look5.jpg",
    ratio: 1,
    caption: "프렌치 럭셔리 스트리트. 아미 니트는 크림이 정답입니다",
    category: "fashion",
    likes: 11562,
    createdAt: "2026-08-11T15:00:00+09:00",
    objects: [
      { id: "l5-knit", label: "크루넥 니트", x: 0.378, y: 0.213, w: 0.268, h: 0.301, polygon: [[0.535,0.215],[0.596,0.238],[0.623,0.273],[0.641,0.352],[0.637,0.434],[0.612,0.468],[0.587,0.452],[0.574,0.477],[0.598,0.499],[0.598,0.551],[0.43,0.551],[0.424,0.495],[0.441,0.477],[0.432,0.47],[0.421,0.49],[0.398,0.463],[0.382,0.404],[0.395,0.285],[0.446,0.235],[0.471,0.224],[0.512,0.24],[0.534,0.216]], productId: "pl-ami-knit", exactness: "exact", confidence: 0.94 },
      { id: "l5-jeans", label: "슬림 진", x: 0.423, y: 0.486, w: 0.183, h: 0.431, polygon: [[0.402,0.434],[0.627,0.435],[0.595,0.512],[0.59,0.876],[0.627,0.94],[0.626,0.968],[0.538,0.93],[0.529,0.72],[0.512,0.727],[0.526,0.929],[0.451,0.966],[0.424,0.957],[0.473,0.896],[0.471,0.837],[0.424,0.496],[0.401,0.435]], productId: "pl-ysl-jeans", exactness: "exact", confidence: 0.9 },
      { id: "l5-shoes", label: "삼바 OG", x: 0.421, y: 0.891, w: 0.223, h: 0.086, polygon: [[0.47,0.88],[0.521,0.88],[0.529,0.904],[0.535,0.88],[0.588,0.88],[0.618,0.932],[0.593,0.955],[0.518,0.94],[0.434,0.966],[0.424,0.945],[0.47,0.882]], productId: "pl-samba", exactness: "exact", confidence: 0.95 },
      { id: "l5-watch", label: "탱크 워치", x: 0.579, y: 0.458, w: 0.031, h: 0.028, polygon: [[0.57,0.448],[0.621,0.449],[0.596,0.496],[0.568,0.495],[0.568,0.449]], productId: "pl-cartier-tank", exactness: "similar", confidence: 0.6 },
    ],
  },

  // ── 여성 룩 6~10 ──────────────────────────────────────
  {
    id: "post-look6",
    creatorId: "c-eun",
    image: "/looks/look6.jpg",
    ratio: 1,
    caption: "프레피 스마트 캐주얼 — 하늘색 옥스포드에 연청, 그리고 화이트 삼바 🤍",
    category: "fashion",
    likes: 18420,
    createdAt: "2026-08-13T10:30:00+09:00",
    objects: [
      { id: "l6-shirt", label: "옥스포드 셔츠", x: 0.346, y: 0.185, w: 0.258, h: 0.321, polygon: [[0.482,0.19],[0.554,0.218],[0.602,0.323],[0.577,0.396],[0.546,0.412],[0.565,0.543],[0.384,0.545],[0.371,0.448],[0.426,0.416],[0.374,0.387],[0.357,0.404],[0.349,0.391],[0.36,0.268],[0.421,0.202],[0.424,0.245],[0.452,0.277],[0.48,0.191]], productId: "plw-polo-oxford", exactness: "exact", confidence: 0.96 },
      { id: "l6-bag", label: "숄더백", x: 0.51, y: 0.202, w: 0.074, h: 0.21, polygon: [[0.502,0.177],[0.509,0.199],[0.56,0.226],[0.593,0.305],[0.582,0.387],[0.546,0.413],[0.551,0.437],[0.501,0.435],[0.501,0.179]], productId: "plw-prada-re2005", exactness: "exact", confidence: 0.93 },
      { id: "l6-jeans", label: "라이트 워시 진", x: 0.371, y: 0.406, w: 0.222, h: 0.463, polygon: [[0.355,0.351],[0.593,0.351],[0.577,0.396],[0.546,0.416],[0.59,0.655],[0.577,0.855],[0.563,0.877],[0.607,0.924],[0.507,0.91],[0.524,0.723],[0.515,0.66],[0.499,0.684],[0.459,0.693],[0.474,0.874],[0.43,0.924],[0.391,0.923],[0.43,0.837],[0.37,0.476],[0.377,0.43],[0.348,0.39],[0.354,0.352]], productId: "plw-levis-ribcage", exactness: "exact", confidence: 0.95 },
      { id: "l6-shoes", label: "삼바 OG 화이트", x: 0.388, y: 0.833, w: 0.238, h: 0.129, polygon: [[0.48,0.818],[0.504,0.829],[0.512,0.866],[0.557,0.868],[0.582,0.891],[0.62,0.955],[0.584,0.959],[0.51,0.923],[0.496,0.885],[0.396,0.93],[0.393,0.907],[0.423,0.863],[0.468,0.876],[0.457,0.837],[0.47,0.843],[0.479,0.82]], productId: "plw-samba-white", exactness: "exact", confidence: 0.96 },
      { id: "l6-necklace", label: "하트 펜던트 목걸이", x: 0.421, y: 0.215, w: 0.044, h: 0.038, polygon: [[0.416,0.202],[0.479,0.202],[0.48,0.265],[0.407,0.266],[0.415,0.204]], productId: "plw-tiffany-heart", exactness: "similar", confidence: 0.68 },
      { id: "l6-earrings", label: "실버 후프 귀걸이", x: 0.408, y: 0.135, w: 0.026, h: 0.032, polygon: [[0.401,0.124],[0.443,0.126],[0.441,0.179],[0.399,0.177],[0.399,0.126]], productId: "plw-silver-hoop", exactness: "similar", confidence: 0.6 },
    ],
  },
  {
    id: "post-look7",
    creatorId: "c-rin",
    image: "/looks/look7.jpg",
    ratio: 1,
    caption: "브리티시 헤리티지. 왁스 자켓 + 로우 데님 + 왈라비, 비 오는 날에도 좋아요",
    category: "fashion",
    likes: 13780,
    createdAt: "2026-08-13T08:00:00+09:00",
    objects: [
      { id: "l7-jacket", label: "왁스 자켓", x: 0.343, y: 0.148, w: 0.315, h: 0.386, polygon: [[0.451,0.149],[0.471,0.182],[0.552,0.171],[0.596,0.191],[0.657,0.307],[0.649,0.357],[0.593,0.42],[0.607,0.58],[0.518,0.58],[0.499,0.527],[0.491,0.58],[0.407,0.58],[0.402,0.524],[0.346,0.513],[0.368,0.245],[0.388,0.196],[0.449,0.151]], productId: "plw-barbour-beadnell", exactness: "exact", confidence: 0.96 },
      { id: "l7-tee", label: "아이보리 티셔츠", x: 0.449, y: 0.174, w: 0.109, h: 0.225, polygon: [[0.451,0.149],[0.471,0.182],[0.571,0.179],[0.571,0.38],[0.521,0.41],[0.57,0.426],[0.435,0.424],[0.435,0.168],[0.449,0.151]], productId: "pl-uniqlo-tee", exactness: "similar", confidence: 0.74 },
      { id: "l7-jeans", label: "다크 인디고 진", x: 0.401, y: 0.392, w: 0.213, h: 0.524, polygon: [[0.377,0.329],[0.64,0.33],[0.64,0.368],[0.593,0.42],[0.613,0.507],[0.601,0.874],[0.61,0.926],[0.64,0.952],[0.635,0.976],[0.535,0.948],[0.53,0.699],[0.499,0.71],[0.509,0.891],[0.485,0.966],[0.445,0.963],[0.455,0.904],[0.44,0.845],[0.376,0.841],[0.376,0.588],[0.391,0.585],[0.376,0.568],[0.376,0.33]], productId: "plw-cos-dark-jeans", exactness: "similar", confidence: 0.79 },
      { id: "l7-shoes", label: "왈라비", x: 0.44, y: 0.898, w: 0.202, h: 0.078, polygon: [[0.535,0.888],[0.604,0.888],[0.64,0.971],[0.518,0.948],[0.534,0.89]], productId: "pl-clarks-wallabee", exactness: "exact", confidence: 0.94 },
      { id: "l7-bag", label: "나일론 토트백", x: 0.299, y: 0.554, w: 0.149, h: 0.297, polygon: [[0.391,0.549],[0.437,0.718],[0.443,0.81],[0.435,0.841],[0.404,0.849],[0.302,0.809],[0.32,0.688],[0.351,0.668],[0.355,0.585],[0.39,0.551]], productId: "plw-longchamp", exactness: "exact", confidence: 0.92 },
      { id: "l7-earrings", label: "골드 후프 귀걸이", x: 0.5, y: 0.107, w: 0.024, h: 0.03, polygon: [[0.493,0.096],[0.532,0.098],[0.53,0.148],[0.491,0.146],[0.491,0.098]], productId: "plw-gold-hoop", exactness: "similar", confidence: 0.58 },
      { id: "l7-rings", label: "실버 레이어드 링", x: 0.353, y: 0.543, w: 0.035, h: 0.028, productId: "plw-silver-rings", exactness: "similar", confidence: 0.55 },
    ],
  },
  {
    id: "post-look8",
    creatorId: "c-eun",
    image: "/looks/look8.jpg",
    ratio: 1,
    caption: "그레이지 + 블랙 + 골드. 미니멀은 색을 줄이고 소재를 남기는 일 ✧",
    category: "fashion",
    likes: 21350,
    createdAt: "2026-08-12T20:10:00+09:00",
    objects: [
      { id: "l8-sweat", label: "오버사이즈 스웨트셔츠", x: 0.35, y: 0.17, w: 0.3, h: 0.25, polygon: [[0.549,0.171],[0.574,0.176],[0.604,0.216],[0.645,0.299],[0.645,0.359],[0.626,0.387],[0.593,0.382],[0.598,0.348],[0.56,0.301],[0.549,0.384],[0.579,0.42],[0.566,0.451],[0.38,0.451],[0.379,0.42],[0.399,0.405],[0.377,0.388],[0.38,0.216],[0.438,0.188],[0.526,0.19],[0.548,0.173]], productId: "plw-acne-sweat-oat", exactness: "similar", confidence: 0.82 },
      { id: "l8-pants", label: "와이드 트라우저", x: 0.37, y: 0.4, w: 0.23, h: 0.47, polygon: [[0.379,0.343],[0.557,0.343],[0.568,0.363],[0.551,0.391],[0.57,0.421],[0.587,0.405],[0.595,0.343],[0.627,0.345],[0.623,0.398],[0.571,0.487],[0.568,0.691],[0.591,0.926],[0.416,0.924],[0.377,0.62],[0.377,0.345]], productId: "pl-cos-pants", exactness: "exact", confidence: 0.93 },
      { id: "l8-shoes", label: "화이트 스니커즈", x: 0.39, y: 0.91, w: 0.23, h: 0.07, polygon: [[0.565,0.932],[0.593,0.932],[0.624,0.985],[0.579,0.988],[0.516,0.96],[0.563,0.934]], productId: "pl-margiela-replica", exactness: "similar", confidence: 0.72 },
      { id: "l8-bag", label: "블랙 숄더백", x: 0.545, y: 0.3, w: 0.105, h: 0.13, polygon: [[0.534,0.285],[0.64,0.29],[0.654,0.33],[0.64,0.427],[0.532,0.445],[0.532,0.287]], productId: "plw-celine-bag", exactness: "similar", confidence: 0.66 },
      { id: "l8-necklace", label: "골드 체인 목걸이", x: 0.44, y: 0.185, w: 0.06, h: 0.03, polygon: [[0.421,0.174],[0.52,0.174],[0.521,0.224],[0.421,0.226],[0.42,0.176]], productId: "plw-gold-chain", exactness: "similar", confidence: 0.64 },
      { id: "l8-earrings", label: "골드 후프 귀걸이", x: 0.435, y: 0.105, w: 0.022, h: 0.028, polygon: [[0.429,0.095],[0.465,0.096],[0.463,0.143],[0.427,0.141],[0.427,0.096]], productId: "plw-gold-hoop", exactness: "similar", confidence: 0.56 },
      { id: "l8-bracelet", label: "골드 브레이슬릿", x: 0.565, y: 0.425, w: 0.035, h: 0.028, productId: "plw-gold-bracelet", exactness: "similar", confidence: 0.54 },
    ],
  },
  {
    id: "post-look9",
    creatorId: "c-rin",
    image: "/looks/look9.jpg",
    ratio: 1,
    caption: "아웃도어 시티. 레트로X에 카고, 발은 보스턴으로 편하게 🤎",
    category: "fashion",
    likes: 16240,
    createdAt: "2026-08-12T16:40:00+09:00",
    objects: [
      { id: "l9-fleece", label: "플리스 자켓", x: 0.36, y: 0.155, w: 0.28, h: 0.315, polygon: [[0.532,0.14],[0.557,0.171],[0.524,0.227],[0.551,0.296],[0.56,0.174],[0.605,0.22],[0.637,0.348],[0.607,0.41],[0.63,0.416],[0.626,0.443],[0.596,0.468],[0.576,0.457],[0.577,0.507],[0.393,0.507],[0.368,0.371],[0.396,0.209],[0.452,0.149],[0.484,0.165],[0.53,0.141]], productId: "pl-patagonia-retrox", exactness: "exact", confidence: 0.96 },
      { id: "l9-pants", label: "카고 팬츠", x: 0.37, y: 0.45, w: 0.23, h: 0.38, polygon: [[0.376,0.404],[0.609,0.404],[0.627,0.416],[0.616,0.459],[0.577,0.482],[0.582,0.601],[0.562,0.826],[0.543,0.874],[0.499,0.873],[0.482,0.83],[0.495,0.734],[0.482,0.668],[0.466,0.837],[0.413,0.854],[0.384,0.818],[0.391,0.459],[0.376,0.405]], productId: "pl-tnf-pants", exactness: "exact", confidence: 0.91 },
      { id: "l9-clogs", label: "스웨이드 클로그", x: 0.36, y: 0.86, w: 0.19, h: 0.095, polygon: [[0.424,0.852],[0.448,0.855],[0.465,0.896],[0.498,0.874],[0.541,0.88],[0.538,0.924],[0.46,0.966],[0.432,0.963],[0.418,0.941],[0.373,0.955],[0.363,0.929],[0.423,0.854]], productId: "pl-birken-boston", exactness: "exact", confidence: 0.94 },
      { id: "l9-backpack", label: "백팩", x: 0.55, y: 0.29, w: 0.09, h: 0.18, polygon: [[0.541,0.268],[0.618,0.268],[0.645,0.36],[0.629,0.44],[0.577,0.491],[0.54,0.49],[0.54,0.27]], productId: "pl-arc-heliad", exactness: "exact", confidence: 0.88 },
      { id: "l9-socks", label: "화이트 크루 삭스", x: 0.4, y: 0.855, w: 0.14, h: 0.04, polygon: [[0.412,0.851],[0.554,0.857],[0.538,0.899],[0.391,0.899],[0.41,0.852]], productId: "plw-socks", exactness: "similar", confidence: 0.7 },
      { id: "l9-earrings", label: "실버 스터드", x: 0.465, y: 0.082, w: 0.02, h: 0.025, productId: "plw-silver-stud", exactness: "similar", confidence: 0.52 },
    ],
  },
  {
    id: "post-look10",
    creatorId: "c-eun",
    image: "/looks/look10.jpg",
    ratio: 1,
    caption: "프렌치 럭셔리 캐주얼 — 크림 니트에 블랙 데님, 삼바로 마무리 🖤",
    category: "fashion",
    likes: 19870,
    createdAt: "2026-08-12T11:20:00+09:00",
    objects: [
      { id: "l10-knit", label: "하트 로고 니트", x: 0.35, y: 0.25, w: 0.25, h: 0.28, polygon: [[0.504,0.251],[0.551,0.259],[0.579,0.284],[0.609,0.357],[0.607,0.415],[0.576,0.448],[0.552,0.429],[0.493,0.466],[0.521,0.496],[0.57,0.459],[0.557,0.479],[0.568,0.562],[0.357,0.563],[0.36,0.393],[0.385,0.291],[0.502,0.252]], productId: "pl-ami-knit", exactness: "exact", confidence: 0.95 },
      { id: "l10-jeans", label: "블랙 슬림 진", x: 0.4, y: 0.48, w: 0.17, h: 0.4, polygon: [[0.38,0.432],[0.59,0.434],[0.57,0.455],[0.565,0.524],[0.573,0.927],[0.529,0.926],[0.521,0.746],[0.498,0.723],[0.476,0.726],[0.496,0.899],[0.482,0.927],[0.44,0.926],[0.457,0.876],[0.423,0.726],[0.379,0.729],[0.379,0.434]], productId: "pl-ysl-jeans", exactness: "exact", confidence: 0.9 },
      { id: "l10-shoes", label: "삼바 OG 블랙", x: 0.41, y: 0.875, w: 0.17, h: 0.07, polygon: [[0.391,0.866],[0.457,0.874],[0.44,0.923],[0.452,0.949],[0.501,0.905],[0.499,0.866],[0.521,0.868],[0.538,0.94],[0.568,0.912],[0.579,0.87],[0.599,0.866],[0.601,0.952],[0.391,0.954],[0.39,0.868]], productId: "pl-samba", exactness: "exact", confidence: 0.95 },
      { id: "l10-bag", label: "구조적 핸드백", x: 0.31, y: 0.59, w: 0.11, h: 0.14, polygon: [[0.393,0.59],[0.42,0.72],[0.396,0.734],[0.329,0.72],[0.313,0.701],[0.327,0.635],[0.354,0.596],[0.393,0.591]], productId: "plw-polene-bag", exactness: "similar", confidence: 0.7 },
      { id: "l10-watch", label: "탱크 워치", x: 0.525, y: 0.44, w: 0.033, h: 0.033, productId: "pl-cartier-tank", exactness: "similar", confidence: 0.6 },
      { id: "l10-necklace", label: "골드 펜던트 목걸이", x: 0.44, y: 0.28, w: 0.05, h: 0.035, polygon: [[0.424,0.268],[0.505,0.268],[0.507,0.326],[0.424,0.327],[0.423,0.27]], productId: "plw-gold-chain", exactness: "similar", confidence: 0.62 },
      { id: "l10-earrings", label: "골드 귀걸이", x: 0.428, y: 0.188, w: 0.02, h: 0.025, polygon: [[0.423,0.179],[0.455,0.18],[0.454,0.221],[0.421,0.22],[0.421,0.18]], productId: "plw-gold-hoop", exactness: "similar", confidence: 0.54 },
    ],
  },
];

/** 피드 = 실사 룩 게시물 (최신순) */
export const POSTS: Post[] = [...LOOK_POSTS].sort(
  (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
);

export const productById = (id: string | null | undefined) =>
  PRODUCTS.find((p) => p.id === id);

export const creatorById = (id: string) => CREATORS.find((c) => c.id === id)!;

export const CATEGORY_LABEL: Record<string, string> = {
  fashion: "패션",
  beauty: "뷰티",
  interior: "인테리어",
  tech: "테크",
  lifestyle: "라이프",
};
