# STS Watch — video and product prototype

The `/watch` page is a mobile-first web application experience. The selected Beauty Edit homepage remains the primary site. `/designs/landing`, `/designs/editorial`, `/designs/commerce`, `/designs/brand`, and `/designs/zvzo` preserve older designs for comparison; archived claims, prices, and statistics are examples.

## Viewing and routines

The vertically scrolling feed uses two locally licensed Pexels technique clips and the user's creator library. Imported TikTok posts appear through the official embedded player. Only the active player runs. A viewer can save a video and open its steps and product layers inside STS. Reviewed segments seek, play, and stop at the selected end; unknown timestamps are labeled rather than invented. For the reviewed iam.chae clip the product label visible at 1:03 can be opened from its selected product detail.

TikTok's player contains its own attribution and controls. Its availability and navigation cannot be fully controlled by STS. `LocalVideoPreview` plays a creator-provided video file directly on the device for the current session without uploading or saving it. It is not a shared hosting or publishing system.

## Preferences and privacy

Visitors can select a skin type, finish, climate, skin tone, undertone, interest areas and creators. A transparent rule-based ranking prioritizes selected creators and relevant areas; it uses verified look-description cues when available. It does not claim a medical diagnosis, image-derived skin type, or verified shade/ingredient compatibility. Tone and undertone are currently self-selected and are not used to predict shades without supporting product data.

The optional selfie input requires an explicit opt-in. A local object URL displays the photo only inside the setup sheet, and the URL is revoked on replacement or closing. The image is not uploaded or persisted; the selections are saved in browser local storage. Users can skip setup. The current recommendation model is an explainable prototype, not a trained model or a multi-device account service.

## Hosting rights and launch

A public TikTok post or enabled download button does not establish STS's right to rehost and commercially promote a creator's video and music. TikTok's Vietnam-applicable terms and applicable creator/music rights must be checked before commercial operation. The current embed is a technical prototype, not a clearance determination. For a fully controlled STS player, obtain original files directly from rights holders with website, territory, term, edit, thumbnail, and music permissions, then build authenticated upload, moderation, durable storage, transcoding, rights expiry and takedown handling. No automatic TikTok extraction or public upload was implemented.

Sources: https://www.tiktok.com/legal/page/row/terms-of-service/en and https://developers.tiktok.com/docs/en/embed-player .

## Verification

- Production build and TypeScript passed; full Vitest suite: 81 files, 432 passed, 1 pre-existing skip.
- Retained browser checks: 10 beauty-commerce and 11 creator-routine scenarios passed on production.
- Watch privacy and behavior review passed: consented local photo, revocation and no upload; native video segment; in-sheet product to timestamp; imported video save/reload; delayed-player mute state. See `output/beauty-commerce-qa/watch/integrity-review.json`.
- Mobile, tablet and desktop screens were checked in English and Korean. Real licensed media played to a chosen segment end without looping. TikTok message behavior was checked with a controlled official-origin player harness; actual TikTok availability still depends on the service.
