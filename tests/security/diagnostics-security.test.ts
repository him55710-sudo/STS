import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  authorizeAdminRequestMock,
  probeAllMock,
  probeChatMock,
  probeDiagnosticMock,
  probeBasePathSweepMock,
  probeManagementMock,
  visionJsonMock,
  naverSearchMock,
  searchImagesMock,
  searchWebkrProductsMock,
  searchImageTitleProductsMock,
  searchNaverProductsMock,
} = vi.hoisted(() => ({
  authorizeAdminRequestMock: vi.fn(),
  probeAllMock: vi.fn(),
  probeChatMock: vi.fn(),
  probeDiagnosticMock: vi.fn(),
  probeBasePathSweepMock: vi.fn(),
  probeManagementMock: vi.fn(),
  visionJsonMock: vi.fn(),
  naverSearchMock: vi.fn(),
  searchImagesMock: vi.fn(),
  searchWebkrProductsMock: vi.fn(),
  searchImageTitleProductsMock: vi.fn(),
  searchNaverProductsMock: vi.fn(),
}));

vi.mock("../../lib/admin/authorize", () => ({
  authorizeAdminRequest: authorizeAdminRequestMock,
}));

vi.mock("../../lib/llm/letsur", () => ({
  letsurKey: vi.fn(() => undefined),
  letsurKeyRaw: vi.fn(() => undefined),
  sanitizeKey: vi.fn((value?: string) => value),
  keyWarning: vi.fn(() => null),
  configuredAuthStyle: vi.fn(() => null),
  configuredBase: vi.fn(() => null),
  letsurModel: vi.fn(() => "fixture-model"),
  letsurManagementKey: vi.fn(() => undefined),
  probeAll: probeAllMock,
  probeChat: probeChatMock,
  probeDiagnostic: probeDiagnosticMock,
  interpretDiagnostic: vi.fn(() => "fixture diagnosis"),
  probeBasePathSweep: probeBasePathSweepMock,
  interpretSweep: vi.fn(() => "fixture sweep"),
  probeManagement: probeManagementMock,
}));

vi.mock("../../lib/llm", () => ({
  providerChain: vi.fn(() => [{ name: "fixture-provider" }]),
  visionJson: visionJsonMock,
  extractJson: vi.fn(() => null),
}));

vi.mock("../../lib/naver/api-hub", () => ({
  isNaverConfigured: vi.fn(() => true),
  searchImages: searchImagesMock,
  contractConfigs: vi.fn(() => []),
  naverSearch: naverSearchMock,
  HUB_SEARCH_TYPES: ["webkr", "image"],
}));

vi.mock("../../lib/naver/product-provider", () => ({
  searchWebkrProducts: searchWebkrProductsMock,
  searchImageTitleProducts: searchImageTitleProductsMock,
  searchNaverProducts: searchNaverProductsMock,
}));

vi.mock("../../lib/affiliate/aliexpress", () => ({
  isAliExpressConfigured: vi.fn(() => false),
}));

import { POST as detect } from "../../app/api/detect/route";
import { GET as naverProbe } from "../../app/api/naver-probe/route";
import { GET as visionHealth } from "../../app/api/vision-health/route";

afterEach(() => {
  vi.clearAllMocks();
});

describe("operational diagnostics security", () => {
  it("rejects an unauthenticated vision health request before any live probe", async () => {
    authorizeAdminRequestMock.mockResolvedValue({ ok: false, mode: "production", status: 401, reason: "missing-session" });

    const response = await visionHealth(new NextRequest("https://example.com/api/vision-health"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "missing-session" });
    expect(probeAllMock).not.toHaveBeenCalled();
    expect(searchImagesMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated Naver probe before any provider call", async () => {
    authorizeAdminRequestMock.mockResolvedValue({ ok: false, mode: "production", status: 401, reason: "missing-session" });

    const response = await naverProbe(new NextRequest("https://example.com/api/naver-probe?type=shopcheck"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "missing-session" });
    expect(naverSearchMock).not.toHaveBeenCalled();
    expect(searchImagesMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized detect payload before invoking the vision provider", async () => {
    visionJsonMock.mockResolvedValue({ data: null, status: "unavailable", provider: "none" });
    const image = `data:image/png;base64,${"A".repeat(136_540)}`;
    const request = new NextRequest("https://example.com/api/detect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
    });

    const response = await detect(request);

    expect(response.status).toBe(413);
    expect(visionJsonMock).not.toHaveBeenCalled();
  });

  it("rejects an image whose decompressed pixel count exceeds the detect cap", async () => {
    visionJsonMock.mockResolvedValue({ data: null, status: "unavailable", provider: "none" });
    const header = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header, 0);
    header.write("IHDR", 12, "ascii");
    header.writeUInt32BE(4_000_001, 16);
    header.writeUInt32BE(1, 20);
    const image = `data:image/png;base64,${header.toString("base64")}`;
    const request = new NextRequest("https://example.com/api/detect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
    });

    const response = await detect(request);

    expect(response.status).toBe(413);
    expect(visionJsonMock).not.toHaveBeenCalled();
  });

  it("redacts provider and credential diagnostics even for an authorized health request", async () => {
    authorizeAdminRequestMock.mockResolvedValue({ ok: true, mode: "local", userId: null });
    probeAllMock.mockResolvedValue([
      {
        base: "https://secret-provider.example",
        status: 200,
        auth: "secret",
        authStyle: "bearer",
        models: ["secret-model"],
        detail: "provider response body",
      },
    ]);
    probeManagementMock.mockResolvedValue([{ url: "https://secret-provider.example/v1/models", status: 200, preview: "secret body" }]);
    searchImagesMock.mockResolvedValue({
      ok: true,
      contract: "apihub",
      httpStatus: 200,
      elapsedMs: 4,
      items: [{ title: "secret provider sample", thumbnail: "https://secret.example/image" }],
    });

    const response = await visionHealth(new NextRequest("https://example.com/api/vision-health"));
    const payload = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(payload).not.toContain("secret-provider.example");
    expect(payload).not.toContain("secret provider sample");
    expect(payload).not.toContain("provider response body");
    expect(payload).not.toContain("keyPreview");
    expect(payload).not.toContain("envKeysPresent");
  });

  it("does not return raw Naver provider samples after authorization", async () => {
    authorizeAdminRequestMock.mockResolvedValue({ ok: true, mode: "local", userId: null });
    naverSearchMock.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      total: 1,
      contract: "legacy",
      items: [{ title: "secret raw title", link: "https://secret.example/item", description: "secret description" }],
    });
    searchWebkrProductsMock.mockResolvedValue([]);

    const response = await naverProbe(new NextRequest("https://example.com/api/naver-probe?type=webkr"));
    const payload = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(payload).not.toContain("secret raw title");
    expect(payload).not.toContain("secret.example");
    expect(payload).not.toContain("secret description");
  });
});
