import type { SocialActor, SocialContentRow } from "../../lib/social-repository/content-repository";

export const now = new Date("2026-09-01T00:00:00.000Z");
export const anonymousActor: SocialActor = { kind: "anonymous" };
export const wrongOwnerActor: Extract<SocialActor, { readonly kind: "user" }> = { kind: "user", userId: "user-wrong" };
export const ownerActor: Extract<SocialActor, { readonly kind: "user" }> = { kind: "user", userId: "user-owner" };
export const adminActor: SocialActor = { kind: "admin", userId: "user-admin" };
export const serviceActor: SocialActor = { kind: "service_role" };

export const publishedRow: SocialContentRow = {
  id: "post-public",
  creatorId: "user-owner",
  visibility: "public",
  publishState: "published",
  displayState: "approved",
  publishedAt: "2026-08-31T00:00:00.000Z",
  expiresAt: null,
  rightsStatus: "approved",
  rightsExpiresAt: null,
  canDisplay: true,
  canUseForCommerceMatching: false,
  takedownAt: null,
};
