import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { VISUAL_RERANK_POLICY } from "../vision-config";

export type RemoteImage = {
  readonly bytes: Buffer;
  readonly mimeType: "image/jpeg" | "image/png" | "image/webp";
};

export async function fetchRemoteProductImage(urlValue: string): Promise<RemoteImage | null> {
  let currentUrl = await allowedRemoteImageUrl(urlValue);
  if (!currentUrl) return null;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(VISUAL_RERANK_POLICY.requestTimeoutMs),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        currentUrl = await allowedRemoteImageUrl(new URL(location, currentUrl).toString());
        if (!currentUrl) return null;
        continue;
      }
      if (!response.ok) return null;
      const mimeType = imageMime(response.headers.get("content-type"));
      if (!mimeType) return null;
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (declaredLength > VISUAL_RERANK_POLICY.maxCandidateImageBytes) return null;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > VISUAL_RERANK_POLICY.maxCandidateImageBytes) return null;
      return { bytes, mimeType };
    }
  } catch (error: unknown) {
    if (error instanceof Error) return null;
    return null;
  }
  return null;
}

export async function allowedRemoteImageUrl(value: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || isIP(host) !== 0) return null;
  try {
    const resolved = await lookup(host);
    if (isPrivateIpv4(resolved.address)) return null;
  } catch {
    return null;
  }
  return url.toString();
}

function imageMime(value: string | null): RemoteImage["mimeType"] | null {
  const normalized = value?.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/png" || normalized === "image/webp") return normalized;
  return null;
}

function isPrivateIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  const [first, second] = octets;
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  return first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second !== undefined && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}
