import type { ImageVariant, StockState } from "../commerce/types";
import type { Category } from "../types";

export type CatalogSource = string;

export type CatalogSourceIdentity = {
  readonly source: CatalogSource;
  readonly sourceProductId: string;
};

export type CatalogStockStatus = StockState["status"];

export type CatalogRow = {
  readonly source: CatalogSource;
  readonly sourceProductId: string;
  readonly sourceIdentity: CatalogSourceIdentity;
  readonly brand: string | null;
  readonly title: string;
  readonly merchant: string;
  readonly variant: string | null;
  readonly category: Category;
  readonly price: number | null;
  readonly currency: string | null;
  readonly stock: CatalogStockStatus;
  readonly availability: CatalogStockStatus;
  readonly sku: string | null;
  readonly model: string | null;
  readonly gtin: string | null;
  readonly detailUrl: string;
  readonly affiliateUrl: string | null;
  readonly images: readonly string[];
  readonly imageVariants: readonly ImageVariant[];
};

export type FixtureRecord = Readonly<Record<string, unknown>>;

export type FixtureInput = {
  readonly rows?: readonly FixtureRecord[];
  readonly json?: string;
  readonly csv?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly hasNextPage?: boolean;
  readonly nextPage?: number;
  readonly checkpoint?: string;
  readonly currentCheckpoint?: string;
};

export type CatalogPagination = {
  readonly page: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
  readonly nextPage: number | null;
};

export type CatalogCheckpoint = {
  readonly current: string | null;
  readonly next: string | null;
};

export type CatalogRowErrorCode =
  | "malformed_json"
  | "malformed_csv"
  | "malformed_row"
  | "missing_source_product_id"
  | "missing_title"
  | "missing_merchant"
  | "missing_detail_url"
  | "invalid_detail_url"
  | "search_url"
  | "missing_images"
  | "invalid_images"
  | "missing_category"
  | "invalid_category"
  | "invalid_price";

export type CatalogRowError = {
  readonly kind: "quarantine";
  readonly rowNumber: number;
  readonly code: CatalogRowErrorCode;
  readonly field: string | null;
  readonly message: string;
};

export type CatalogRowResult =
  | { readonly kind: "accepted"; readonly rowNumber: number; readonly row: CatalogRow }
  | { readonly kind: "quarantine"; readonly rowNumber: number; readonly error: CatalogRowError };

export type CatalogPage = {
  readonly rows: readonly CatalogRow[];
  readonly rowResults: readonly CatalogRowResult[];
  readonly errors: readonly CatalogRowError[];
  readonly pagination: CatalogPagination;
  readonly checkpoint: CatalogCheckpoint;
};

export interface CatalogSourceAdapter {
  readonly source: CatalogSource;
  fetchPage(): Promise<CatalogPage>;
}

export type FixtureAdapterOptions = {
  readonly source: CatalogSource;
  readonly input: FixtureInput;
};
