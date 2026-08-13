/**
 * Commerce 시드 SQL 생성기 — lib/commerce/seed.ts(단일 진실)에서 DB 시드
 * 마이그레이션을 만든다. 코드 시드와 DB 시드가 어긋날 수 없다.
 *
 * 사용: npx -y tsx scripts/generate-commerce-seed.ts > supabase/migrations/20260813000005_commerce_seed.sql
 */
import {
  SEED_AFFILIATE_PROGRAMS,
  SEED_CANONICAL_PRODUCTS,
  SEED_MERCHANTS,
  SEED_OFFERS,
} from "../lib/commerce/seed";

const q = (v: string | null | undefined): string =>
  v == null ? "null" : `'${v.replace(/'/g, "''")}'`;
const n = (v: number | null | undefined): string => (v == null ? "null" : String(v));
const j = (v: unknown): string => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const lines: string[] = [
  "-- STS Phase 2 — commerce graph 시드.",
  "-- 이 파일은 scripts/generate-commerce-seed.ts가 lib/commerce/seed.ts에서 생성한다.",
  "-- 직접 수정하지 말 것 — 시드를 바꾸려면 seed.ts를 고치고 재생성한다.",
  "",
];

lines.push("insert into public.merchants (id, name, domain, logo_url, trust_score, status) values");
lines.push(
  SEED_MERCHANTS.map(
    (m) => `  (${q(m.id)}, ${q(m.name)}, ${q(m.domain)}, ${q(m.logoUrl)}, ${n(m.trustScore)}, ${q(m.status)})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
lines.push("");

lines.push(
  "insert into public.canonical_products (id, brand, model_name, sku, gtin, category, color, attributes, primary_image) values"
);
lines.push(
  SEED_CANONICAL_PRODUCTS.map(
    (c) =>
      `  (${q(c.id)}, ${q(c.brand)}, ${q(c.modelName)}, ${q(c.sku)}, ${q(c.gtin)}, ${q(c.category)}, ${q(c.color)}, ${j(c.attributes)}, ${q(c.primaryImage)})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
lines.push("");

lines.push(
  "insert into public.affiliate_programs (id, merchant_id, provider, commission_type, default_rate, cookie_window_hours, status) values"
);
lines.push(
  SEED_AFFILIATE_PROGRAMS.map(
    (p) =>
      `  (${q(p.id)}, ${q(p.merchantId)}, ${q(p.provider)}, ${q(p.commissionType)}, ${n(p.defaultRate)}, ${n(p.cookieWindowHours)}, ${q(p.status)})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
lines.push("");

lines.push(
  "insert into public.merchant_offers (id, canonical_product_id, merchant_id, external_product_id, title, price, currency, stock_status, shipping_label, product_url, affiliate_url, commission_rate, last_synced_at) values"
);
lines.push(
  SEED_OFFERS.map(
    (o) =>
      `  (${q(o.id)}, ${q(o.canonicalProductId)}, ${q(o.merchantId)}, ${q(o.externalProductId)}, ${q(o.title)}, ${n(o.price)}, ${q(o.currency)}, ${q(o.stockStatus)}, ${q(o.shippingLabel)}, ${q(o.productUrl)}, ${q(o.affiliateUrl)}, ${n(o.commissionRate)}, ${q(o.lastSyncedAt)})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
lines.push("");

process.stdout.write(lines.join("\n"));
