import { describe, expect, it } from "vitest";
import {
  createBrandFeedAdapter,
  createDemoSeedAdapter,
  createInMemorySocialSourceRepository,
  createLicensedEditorialAdapter,
  createOfficialEmbedAdapter,
  createUserUploadAdapter,
} from "../../lib/social-ingest";
import type { SocialOEmbedResponse } from "../../lib/social-ingest";

const activeExpiry = "2027-01-01T00:00:00.000Z";

function licensedRow() {
  return {
    externalId: "look-001",
    canonicalUrl: "https://editorial.example.test/lookbooks/look-001",
    title: "Autumn city look",
    mediaUrl: "https://cdn.editorial.example.test/look-001.jpg",
    contentKind: "lookbook",
    mediaKind: "image",
    licenseEvidence: "contract:editorial-2026-08",
    territory: "KR,US",
    expiresAt: activeExpiry,
    takedown: false,
    canRedistribute: true,
    canUseForCommerceMatching: true,
  };
}

describe("social source adapters", () => {
  it("normalizes a licensed editorial JSON row and upserts it idempotently", async () => {
    // Given
    const adapter = createLicensedEditorialAdapter({
      provider: "style-partner",
      input: { rows: [licensedRow()] },
      now: new Date("2026-09-01T00:00:00.000Z"),
    });
    const repository = createInMemorySocialSourceRepository();

    // When
    const firstPage = await adapter.fetchPage();
    const firstUpsert = repository.upsertPage(firstPage);
    const secondUpsert = repository.upsertPage(firstPage);

    // Then
    expect(firstPage.records).toHaveLength(1);
    expect(firstPage.records[0]?.sourceRecord).toMatchObject({
      kind: "licensed_editorial",
      provider: "style-partner",
      externalId: "look-001",
      canonicalUrl: "https://editorial.example.test/lookbooks/look-001",
    });
    expect(firstPage.records[0]?.rights).toMatchObject({
      kind: "licensed",
      status: "approved",
      evidence: "contract:editorial-2026-08",
      expiresAt: activeExpiry,
      canUseForCommerceMatching: true,
      canRedistribute: true,
    });
    expect(firstPage.records[0]?.rightsTerritory).toEqual(["KR", "US"]);
    expect(firstPage.records[0]?.takedown).toBe(false);
    expect(firstUpsert).toEqual({ inserted: 1, updated: 0, total: 1 });
    expect(secondUpsert).toEqual({ inserted: 0, updated: 1, total: 1 });
  });

  it("normalizes brand feed CSV rows with the same rights evidence contract", async () => {
    // Given
    const csv = [
      "externalId,canonicalUrl,title,mediaUrl,contentKind,mediaKind,licenseEvidence,territory,expiresAt,takedown,canRedistribute,canUseForCommerceMatching",
      `brand-7,https://brand.example.test/posts/7,Brand launch,https://cdn.brand.example.test/7.mp4,reel,video,contract:brand-feed,global,${activeExpiry},false,true,false`,
    ].join("\n");

    // When
    const page = await createBrandFeedAdapter({
      provider: "brand-owned",
      input: { csv },
      now: new Date("2026-09-01T00:00:00.000Z"),
    }).fetchPage();

    // Then
    expect(page.records[0]?.sourceRecord.kind).toBe("brand_feed");
    expect(page.records[0]?.rights.evidence).toBe("contract:brand-feed");
    expect(page.records[0]?.localMediaAssets).toHaveLength(1);
    expect(page.errors).toHaveLength(0);
  });

  it("creates user upload and demo seed records without production commerce eligibility", async () => {
    // Given
    const userUpload = createUserUploadAdapter({
      provider: "local-upload",
      uploads: [{ uploadId: "upload-1", ownerId: "creator-1", mediaUrl: "https://cdn.example.test/upload-1.jpg" }],
    });
    const demoSeed = createDemoSeedAdapter({
      provider: "sts-demo",
      seeds: [{ seedId: "demo-1", mediaUrl: "/looks/look1.jpg", title: "Demo only" }],
    });

    // When
    const [uploadPage, demoPage] = await Promise.all([userUpload.fetchPage(), demoSeed.fetchPage()]);

    // Then
    expect(uploadPage.records[0]?.rights.canUseForCommerceMatching).toBe(false);
    expect(uploadPage.records[0]?.sourceRecord.kind).toBe("user_upload");
    expect(demoPage.records[0]?.rights.kind).toBe("demo");
    expect(demoPage.records[0]?.sourceRecord.identity).toBe("demo_seed:sts-demo:demo-1");
  });

  it("keeps an official Instagram URL as display-only embed HTML with no media mirroring or commerce job", async () => {
    // Given
    const oembed: SocialOEmbedResponse = {
      html: "<blockquote class=\"instagram-media\" data-instgrm-permalink=\"https://www.instagram.com/p/ABC123/\"></blockquote>",
      provider_name: "Instagram",
      provider_url: "https://www.instagram.com/",
      type: "rich",
      version: "1.0",
      width: 540,
    };
    const requestedUrls: string[] = [];
    const request = async (url: URL): Promise<SocialOEmbedResponse> => {
      requestedUrls.push(url.toString());
      return oembed;
    };

    // When
    const page = await createOfficialEmbedAdapter({
      provider: "instagram",
      urls: [{ url: "https://www.instagram.com/p/ABC123/", canRedistribute: true }],
      request,
    }).fetchPage();

    // Then
    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("graph.facebook.com/v26.0/instagram_oembed");
    expect(page.records[0]?.embed?.html).toBe(oembed.html);
    expect(page.records[0]?.providerId).toBe("instagram:p:ABC123");
    expect(page.records[0]?.rights.canRedistribute).toBe(false);
    expect(page.records[0]?.rights.canUseForCommerceMatching).toBe(false);
    expect(page.records[0]?.localMediaAssets).toEqual([]);
    expect(page.records[0]?.commerceMatchJobs).toEqual([]);
  });

  it("quarantines oEmbed HTML that does not match the requested official Instagram URL", async () => {
    // Given
    const request = async (): Promise<SocialOEmbedResponse> => ({
      html: "<blockquote class=\"instagram-media\" data-instgrm-permalink=\"https://www.instagram.com/p/OTHER/\"></blockquote>",
      provider_name: "Instagram",
      provider_url: "https://www.instagram.com/",
      type: "rich",
      version: "1.0",
    });

    // When
    const page = await createOfficialEmbedAdapter({
      provider: "instagram",
      urls: [{ url: "https://www.instagram.com/p/ABC123/" }],
      request,
    }).fetchPage();

    // Then
    expect(page.records).toEqual([]);
    expect(page.errors[0]).toMatchObject({ code: "oembed_failed", rowNumber: 1, field: "url" });
  });

  it("quarantines oEmbed media identity that differs from the requested canonical Instagram URL", async () => {
    // Given
    const request = async (): Promise<SocialOEmbedResponse> => ({
      html: [
        '<a href="https://www.instagram.com/p/ABC123/">requested post</a>',
        '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/OTHER/"></blockquote>',
      ].join(""),
      provider_name: "Instagram",
      provider_url: "https://www.instagram.com/",
      type: "rich",
      version: "1.0",
    });

    // When
    const page = await createOfficialEmbedAdapter({
      provider: "instagram",
      urls: [{ url: "https://www.instagram.com/p/ABC123/" }],
      request,
    }).fetchPage();

    // Then
    expect(page.records).toEqual([]);
    expect(page.errors[0]).toMatchObject({ code: "oembed_failed", rowNumber: 1, field: "url" });
  });

  it("quarantines oEmbed responses from a non-Instagram provider", async () => {
    // Given
    const request = async (): Promise<SocialOEmbedResponse> => ({
      html: "<blockquote class=\"instagram-media\" data-instgrm-permalink=\"https://www.instagram.com/p/ABC123/\"></blockquote>",
      provider_name: "Meta",
      provider_url: "https://www.instagram.com/",
      type: "rich",
      version: "1.0",
    });

    // When
    const page = await createOfficialEmbedAdapter({
      provider: "instagram",
      urls: [{ url: "https://www.instagram.com/p/ABC123/" }],
      request,
    }).fetchPage();

    // Then
    expect(page.records).toEqual([]);
    expect(page.errors[0]).toMatchObject({ code: "oembed_failed", rowNumber: 1, field: "url" });
  });
});
