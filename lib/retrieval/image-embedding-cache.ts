export interface ProductImageEmbeddingStore {
  get(imageUrl: string, modelVersion: string): Promise<number[] | null>;
  set(imageUrl: string, modelVersion: string, embedding: number[]): Promise<void>;
}

type CachedEmbedding = {
  readonly imageUrl: string;
  readonly modelVersion: string;
  readonly embedding: number[];
  readonly generatedAt: string;
};

export class InMemoryProductImageEmbeddingStore implements ProductImageEmbeddingStore {
  private readonly entries = new Map<string, CachedEmbedding>();

  async get(imageUrl: string, modelVersion: string): Promise<number[] | null> {
    return this.entries.get(cacheKey(imageUrl, modelVersion))?.embedding ?? null;
  }

  async set(imageUrl: string, modelVersion: string, embedding: number[]): Promise<void> {
    this.entries.set(cacheKey(imageUrl, modelVersion), {
      imageUrl,
      modelVersion,
      embedding: [...embedding],
      generatedAt: new Date().toISOString(),
    });
  }

  clear(): void {
    this.entries.clear();
  }
}

let defaultStore: ProductImageEmbeddingStore | null = null;

export function defaultProductImageEmbeddingStore(): ProductImageEmbeddingStore {
  if (!defaultStore) defaultStore = new InMemoryProductImageEmbeddingStore();
  return defaultStore;
}

function cacheKey(imageUrl: string, modelVersion: string): string {
  return `${modelVersion}\n${imageUrl}`;
}
