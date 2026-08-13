/**
 * 실행 모드 설정 — 데모 모드와 백엔드 모드는 독립 축이다.
 *
 *  backend configured : NEXT_PUBLIC_SUPABASE_URL + ANON KEY 존재 → 실 영속화 사용 가능
 *  demo mode          : NEXT_PUBLIC_DEMO_MODE=true → 시드 콘텐츠 노출 + 데모 로그인 허용
 *
 * 백엔드가 설정되지 않았으면 앱이 죽지 않도록 데모 모드로 자연 강등된다.
 * 단, 백엔드가 설정된 프로덕션(NEXT_PUBLIC_DEMO_MODE!==true)에서는
 * 가짜 로그인 성공이 절대 허용되지 않는다.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Supabase 연결 정보가 있어 실 영속화가 가능한가 */
export const isBackendConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** 시드/데모 콘텐츠를 노출하는가 (백엔드 미설정 시 자동 데모) */
export const isDemoMode = () =>
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !isBackendConfigured();

/** 데모(가짜) 로그인 허용 여부 — 데모 모드에서만. 프로덕션에서는 절대 불가 */
export const isDemoLoginAllowed = () => isDemoMode();

/** 백엔드 엔티티 id 판별 (서버 행은 uuid, 시드/로컬 데모 행은 문자열 id) */
export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** post-media 버킷 공개 URL */
export const storagePublicUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/post-media/${path}`;
