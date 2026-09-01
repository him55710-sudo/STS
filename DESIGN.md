# STS Design System

## Product direction

STS is a photography-first visual discovery product. The interface stays quiet so the image and the object-level product interaction carry the attention.

## Foundations

- Canvas: `#F7F7F6`
- Surface: `#FFFFFF`
- Secondary surface: `#EEEFED`
- Border: `#E7E9EC`
- Ink: `#111214`
- Secondary text: `#6B6F76`
- Accent: `#5B556E`
- Stone surface: `#EFEDE8`
- Dark surface: `#1A1A18`
- Dark raised surface: `#22221F`
- Soft lilac accent: `#D5C8E2`
- Brand wine: `#73132D`
- Brand coral: `#E27C7D`
- Brand night: `#12080D`
- Brand blush: `#FBF8F8`
- Brand line: `#EDE2E4`
- Brand peach: `#FFF1E5`
- Brand peach ink: `#BF5B26`
- Brand wash: `#FFF9F2`
- Brand live: `#20C987`
- Body font: Pretendard Variable, Pretendard, Inter, system sans fallback
- Editorial display font: system serif stack via `font-serif`, reserved for hero and section headlines
- Base spacing: 4px; common spacing uses 8px increments

## Type scale

- Display: 30px / 800
- Title: 24px / 700
- Heading: 18px / 700
- Body: 15px / 400
- Caption: 12px / 500
- Price: 17px / 700

## Shape and depth

- Buttons: 10–12px radius
- Cards: 12–16px radius
- Product imagery: 8–12px radius
- Bottom sheets: 20–24px top radius
- Depth is primarily borders and tonal shifts; shadows are reserved for overlays and remain diffuse.
- Brand landing primitives use shared `rounded-brand-*` radii and `shadow-brand-*` elevations for the capsule nav, device shell, evidence panels, floating proof, and conversion surfaces.

## Interaction rules

- Object selection uses a subtle mask and outline, never a heavy bounding box.
- Primary product action is a single strong CTA.
- Animations use `transform`, `opacity`, or `filter` only.
- External product navigation always goes through the tracked same-origin `/go/{productId}` path.

## Content rules

- Use real, licensed, or user-owned photography.
- Demo-seeded content must remain distinguishable in data with `is_demo` and `source` metadata.
- Affiliate relationships remain visible next to the purchase action.

## Accessibility and responsive behavior

- Use semantic buttons and links with accessible labels.
- Preserve visible focus states and readable contrast.
- Mobile is the primary layout; the desktop shell adds navigation and content width without changing the object interaction.

## STS Beauty process-commerce mode

- Beauty is an isolated, presentation-ready media surface. Its hierarchy is `result → region → real process → exact product → complete routine`; commerce never precedes the watched process.
- Beauty accent: `#A8757D`, with `#7A4F57` as its accessible small-text companion. Use the accent only for selected regions, progress, and the primary revealed action; use the darker companion for small labels. The canvas remains STS canvas/surface/ink rather than becoming pink or cosmetic-store-like.
- The creator video is the dominant visual. Chrome uses translucent dark video controls and white tonal sheets with hairline separators; product imagery and sales copy never compete with the initial final-look view.
- The primary mobile canvas is `390 × 844`. Desktop centers the same mobile experience in one restrained device frame instead of expanding it into a dashboard.
- Process sheets use the existing 20–24px top radius and 220–280ms transform/opacity motion. Reduced-motion keeps all state changes while removing travel and overshoot.
- Manually curated timestamps, hotspots, products, and usage details must remain visibly distinguishable from future automatic extraction. Missing source data renders a neutral unavailable state and is never inferred.
- Reusable Beauty patterns: `BeautyDemoHeader` for isolated navigation, `BeautyProcessTimeline` for region/step selection, and `BeautySheet`-style bottom surfaces for step, product, routine, and presenter guidance.

## Marketing shell

- Desktop marketing rail: `232px` sticky width, visible from the wide desktop breakpoint.
- Mobile marketing rail: horizontal scroll navigation with the same destinations as desktop.
- Rail groups: `쇼핑 경험`, `함께 성장하기`, and `운영 안내`.
- Rail items use a tonal selected surface and one accent icon; avoid a second competing CTA in the rail.
- Creator and affiliate guidance lives in real landing sections, not placeholder routes.

## Marketing editorial homepage

- `/home` is a separate promotional surface from the platform feed; the marketing shell does not inherit the product sidebar.
- Hero composition is edge-to-edge and image-led, with a restrained serif display headline over a calm crop and only two primary actions.
- Navigation uses three role-based menus: `쇼핑하기`, `크리에이터`, and `브랜드`. Desktop menus open as editorial mega menus; mobile uses a single readable drawer.
- Content sequence follows `큐레이터 → 서클 → 카테고리 → 브랜드 → 파트너십`, using photography grids and full-bleed moments instead of dashboard card mosaics.
- Marketing palette adds warm stone `#EFEDE8`-style surfaces, ink `#111214`, white, and the existing STS violet accent `#5B556E`; keep image overlays dark and quiet.
- Creator and brand CTAs must resolve to an existing platform route or the visible partnership inquiry surface; avoid placeholder destination links.

## Creator commerce homepage

- Homepage claims read from `lib/marketing-home.ts`; `CREATOR_REVENUE_SHARE` is the single configurable source for the creator share claim.
- Hero demo uses real local catalog imagery from `public/looks` and existing tracked outbound paths. Generated artwork and unverified marketplace screenshots are not used as product proof.
- Homepage cards use a double-bezel outer shell only for interactive product previews; editorial image tiles remain edge-to-edge to preserve magazine composition.
- Homepage motion is limited to opacity and transform with `prefers-reduced-motion` coverage.

## STS brand landing mode

- The marketing homepage may switch into a brand-led, partner-facing mode inspired by the supplied ZVZO reference: a dark hero, floating capsule navigation, live commerce ticker, numbered chapters, proof, and one final conversion action.
- Dark hero surfaces use `brand-night` and `brand-wine`; coral is reserved for emphasized words and conversion moments. The rest of the page stays on `brand-blush` / `surface` with hairline dividers.
- The hero device is a real DOM composition backed by local STS photography, never a screenshot pasted as a visual.
- Chapter rhythm is alternating text and product evidence. Oversized low-contrast numbers act as navigation anchors, not decorative card labels.
- The partner-facing CTA resolves to the visible inquiry form; product discovery and creator CTAs resolve to existing routes.

## TACTILE keycap product mode

### Visual thesis

TACTILE is a quiet specimen table for tiny industrial objects. The product frame is warm, editorial, and nearly flat; depth is concentrated inside the keycaps, where material, profile, and switch travel must feel physically believable. The playable board is the first screen and the primary product, not a dashboard wrapped around it.

### Content hierarchy

1. First run: one hero keycap, the instruction `Press it.`, and no competing task.
2. Board: the playable multi-touch instrument, current XP, and the next unlock.
3. Collection: owned, discovered, and locked specimens grouped by rarity and collection.
4. Studio: a large live object preview beside material, legend, profile, finish, and sound controls.
5. Rewards: transparent progress toward a physical drop with clearly labeled local/demo verification boundaries.

### Core tokens

- Product canvas: `#F3F0EA`; raised canvas: `#FBFAF7`; ink: `#171714`; muted ink: `#6D6A63`; line: `rgba(23, 23, 20, 0.10)`.
- Progress accent: `#6E655E`; unlock accent: `#CA715B`; collection violet: `#756E92`; success: `#387A55`.
- Display and UI typography: Pretendard Variable with compact tracking. Labels use 10–11px uppercase metadata; product names use 18–28px; first-run instruction uses a responsive 34–56px display size.
- Spacing follows a 4px base with 12px control gaps, 16–20px surface padding, and 24–32px section rhythm.
- Frame radii are 16–24px. Keycap top radii vary by profile and must not inherit generic card radii.
- Frame depth is a hairline border plus diffuse ambient shadow. Keycap depth uses coordinated top highlight, side wall, contact shadow, and switch-well shadow.

### Keycap object anatomy

- Every keycap has a top, side wall, legend plane, and contact shadow. Removing any one layer makes the press read like a flat card animation.
- Materials change highlights and texture: PBT is matte and softly granular; ABS is smoother and brighter; frosted and resin bodies transmit light; metallic and ceramic profiles use narrower highlights and denser shadows.
- Shape and profile are independent: size controls footprint (`1U`–`2U`), while profile controls height and top sculpt (`Cherry`, `SA`, `XDA`, `DSA`).
- Collection color is data-driven per object. UI chrome never borrows the most saturated keycap color.

### Interaction thesis

Pressing is direct manipulation. Pointer-down depresses immediately; pointer-up returns through a spring. The legend, top, side wall, and shadow move together so the object appears to travel into a switch rather than scale in place.

- Downstroke: 86–110ms, 5–8px travel, slight perspective rotation, shadow compression, Web Audio attack, and short haptic pulse.
- Return: 180–240ms spring with one restrained overshoot. Reduced-motion mode keeps the state change but removes overshoot and perspective.
- The board tracks active pointer IDs so simultaneous touches can hold different keys independently. Keyboard activation mirrors pointer activation.
- First-run disclosure is progressive: the board appears after the first successful press; collection/progression context follows after repeat presses.
- Sound presets alter pitch, waveform, decay, and filter rather than replaying one identical tone.

### Component grammar

- `KeycapVisual`: the only material renderer; consumes a typed definition plus optional Studio overrides.
- `PressableKeycap`: owns pointer/keyboard press state, multi-touch identity, audio, haptics, and accessible pressed semantics.
- `ProductHeader` and `ProductNav`: compact shared chrome across Board, Collection, Studio, and Rewards.
- `SpecimenCard`: collection metadata paired with a real `KeycapVisual`, never a generic thumbnail card.
- `StudioControl`: labeled, touch-sized input with a live visual consequence. Controls are grouped into Legend, Body, Light, Profile, and Feel.
- `RewardProgress`: local progress and future server-verification hooks are visually separated; no claim is presented as server-verified without a server response.

### Responsive and accessibility contract

- Primary validation widths: 375px iPhone, 412px Android, 768px tablet, and 1440px desktop.
- Mobile keeps the board above the fold and uses a safe-area-aware four-item bottom navigation. Desktop widens the specimen table without turning it into a dense admin dashboard.
- Interactive targets are at least 44px. Every key has an accessible name, visible focus treatment, and keyboard activation.
- Dynamic counters use polite live regions only for meaningful unlocks; rapid press counts remain visually updated without repeated screen-reader announcements.
