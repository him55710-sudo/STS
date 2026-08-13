-- STS Phase 2 — Commerce Product Graph.
-- "이게 무슨 상품인가"(canonical_products)와 "어디서 살 수 있는가"(merchant_offers)를 분리한다.
-- CanonicalProduct 1 : N MerchantOffer.
--
-- id는 text다: 시드 canonical id가 기존 product id("pl-polo-oxford")를 계승해
-- object_product_links.product_id·저장·키워드 맵과 전부 호환되기 때문. 신규 행은
-- 기본값(gen_random_uuid()::text)으로 생성된다.
--
-- 쓰기 정책이 없다: Phase 2에서 상품 그래프는 시드/운영자 관리 데이터이고,
-- 클라이언트(anon/authenticated)는 읽기만 한다. 판매자 도구가 생기는 시점에
-- 역할 기반 쓰기 정책이 추가된다.

create table public.canonical_products (
  id            text primary key default gen_random_uuid()::text,
  brand         text not null,
  model_name    text not null,
  sku           text,
  gtin          text,
  category      text not null default 'fashion'
                check (category in ('fashion','beauty','interior','tech','lifestyle')),
  color         text,
  attributes    jsonb not null default '{}'::jsonb,
  primary_image text not null,
  created_at    timestamptz not null default now()
);

create index canonical_products_brand_idx on public.canonical_products (brand);

create table public.merchants (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  domain      text not null,
  logo_url    text,
  trust_score real not null default 0.5 check (trust_score >= 0 and trust_score <= 1),
  status      text not null default 'active' check (status in ('active','paused','delisted'))
);

create table public.affiliate_programs (
  id                  text primary key default gen_random_uuid()::text,
  merchant_id         text not null references public.merchants (id) on delete cascade,
  provider            text not null,
  commission_type     text not null default 'percentage'
                      check (commission_type in ('percentage','fixed')),
  default_rate        numeric not null default 0 check (default_rate >= 0),
  cookie_window_hours integer not null default 720 check (cookie_window_hours > 0),
  status              text not null default 'pending'
                      check (status in ('active','pending','ended'))
);

create index affiliate_programs_merchant_idx on public.affiliate_programs (merchant_id);

create table public.merchant_offers (
  id                   text primary key default gen_random_uuid()::text,
  canonical_product_id text not null references public.canonical_products (id) on delete cascade,
  merchant_id          text not null references public.merchants (id) on delete cascade,
  external_product_id  text,          -- 실연동 전까지 null
  title                text not null,
  price                integer not null check (price >= 0),
  currency             text not null default 'KRW',
  stock_status         text not null default 'in_stock'
                       check (stock_status in ('in_stock','low_stock','out_of_stock')),
  shipping_label       text,
  product_url          text not null,
  affiliate_url        text,          -- 제휴 딥링크 — 네트워크 연동 전까지 null
  commission_rate      numeric check (commission_rate >= 0 and commission_rate <= 1),
  last_synced_at       timestamptz,   -- 동기화 파이프라인 도입 전까지 null
  unique (canonical_product_id, merchant_id)
);

create index merchant_offers_product_idx on public.merchant_offers (canonical_product_id);
create index merchant_offers_merchant_idx on public.merchant_offers (merchant_id);

-- 읽기 전용 RLS — 상품 그래프는 공개 데이터, 쓰기는 클라이언트 경로가 없다
alter table public.canonical_products enable row level security;
alter table public.merchants enable row level security;
alter table public.affiliate_programs enable row level security;
alter table public.merchant_offers enable row level security;

create policy "canonical products are publicly readable"
  on public.canonical_products for select using (true);
create policy "merchants are publicly readable"
  on public.merchants for select using (true);
create policy "affiliate programs are publicly readable"
  on public.affiliate_programs for select using (true);
create policy "merchant offers are publicly readable"
  on public.merchant_offers for select using (true);
