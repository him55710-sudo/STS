import { z } from "zod";

export type VisualEmbeddingImage = string | Buffer;

export interface VisualEmbeddingProvider {
  readonly id: string;
  readonly modelVersion: string;
  embedImage(input: { readonly image: VisualEmbeddingImage }): Promise<number[]>;
}

export class VisualEmbeddingRequestError extends Error {
  readonly name = "VisualEmbeddingRequestError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

const responseSchema = z.union([
  z.array(z.number().finite()).min(1),
  z.object({ embedding: z.array(z.number().finite()).min(1) }),
  z.object({ vector: z.array(z.number().finite()).min(1) }),
]);

export class RemoteVisualEmbeddingProvider implements VisualEmbeddingProvider {
  readonly id = "siglip2-remote";
  readonly modelVersion = "google/siglip2-base-patch16-224";

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string | null,
    private readonly timeoutMs: number
  ) {}

  async embedImage(input: { readonly image: VisualEmbeddingImage }): Promise<number[]> {
    const encoded = typeof input.image === "string" ? input.image : input.image.toString("base64");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.modelVersion, image: encoded }),
      signal: AbortSignal.timeout(this.timeoutMs),
    }).catch((error: unknown) => {
      if (error instanceof Error) throw new VisualEmbeddingRequestError("visual embedding request failed", { cause: error });
      throw new VisualEmbeddingRequestError("visual embedding request failed");
    });
    if (!response.ok) throw new VisualEmbeddingRequestError(`visual embedding returned HTTP ${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new VisualEmbeddingRequestError("visual embedding response has no valid vector");
    if (Array.isArray(parsed.data)) return parsed.data;
    return "embedding" in parsed.data ? parsed.data.embedding : parsed.data.vector;
  }
}

export class MockVisualEmbeddingProvider implements VisualEmbeddingProvider {
  readonly id = "mock-visual-embedding";

  constructor(readonly modelVersion: string, readonly dimension = 32) {}

  async embedImage(input: { readonly image: VisualEmbeddingImage }): Promise<number[]> {
    const value = typeof input.image === "string" ? input.image : input.image.toString("base64");
    let state = 2166136261;
    for (const character of value) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
    return Array.from({ length: this.dimension }, (_, index) => {
      state = Math.imul(state ^ (index + 1), 16777619);
      return ((state >>> 0) / 4294967295) * 2 - 1;
    });
  }
}

export function createConfiguredVisualEmbeddingProvider(timeoutMs: number): VisualEmbeddingProvider | null {
  const endpoint = process.env.SIGLIP_EMBEDDING_URL?.trim();
  if (!endpoint) return null;
  return new RemoteVisualEmbeddingProvider(endpoint, process.env.SIGLIP_EMBEDDING_API_KEY?.trim() || null, timeoutMs);
}

export function normalizeEmbedding(values: readonly number[]): number[] {
  const norm = Math.sqrt(values.reduce((total, value) => total + value * value, 0));
  if (!Number.isFinite(norm) || norm === 0) return [];
  return values.map((value) => value / norm);
}

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number | null {
  const normalizedLeft = normalizeEmbedding(left);
  const normalizedRight = normalizeEmbedding(right);
  if (normalizedLeft.length === 0 || normalizedLeft.length !== normalizedRight.length) return null;
  return Math.min(1, Math.max(-1, normalizedLeft.reduce((total, value, index) => total + value * (normalizedRight[index] ?? 0), 0)));
}

export function normalizedVisualScore(similarity: number): number {
  return Math.min(1, Math.max(0, (similarity + 1) / 2));
}
