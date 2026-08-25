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
- Body font: Pretendard Variable, Pretendard, Inter, system sans fallback
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
