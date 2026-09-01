create extension if not exists vector;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'catalog_exactness'
  ) then
    create type public.catalog_exactness as enum (
      'exact',
      'likely',
      'similar',
      'review',
      'unverified'
    );
  end if;
end
$$;

create table if not exists public.catalog_sources (
  id text primary key,
  provider text not null check (provider in ('fixture', 'catalog', 'feed')),
  feed_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, feed_url)
);

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  canonical_sku text not null,
  brand text,
  name text not null,
  merchant text not null,
  category text not null check (category in ('fashion', 'beauty', 'interior', 'tech', 'lifestyle')),
  currency text not null default 'KRW',
  price numeric(12,2),
  detail_url text not null,
  affiliate_url text,
  exactness public.catalog_exactness not null default 'similar',
  verified_detail_url boolean not null default false,
  source_identity_id uuid,
  fallback_source_identity_id uuid,
  source_identity_verified boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  image_count integer not null default 0 check (image_count >= 0),
  image_primary_url text,
  image_alt_urls jsonb not null default '[]'::jsonb,
  vector_metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  lifecycle text not null default 'active' check (lifecycle in ('active', 'stale', 'quarantined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_sku),
  unique (source_identity_id),
  unique (fallback_source_identity_id)
);

create table if not exists public.catalog_source_identities (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.catalog_sources(id) on delete cascade,
  source_product_id text not null,
  fallback_source_product_id text,
  canonical_product_id uuid references public.catalog_products(id) on delete set null,
  verified boolean not null default false,
  verified_detail_url boolean not null default false,
  detail_url text not null,
  affiliate_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, source_product_id),
  unique (source_id, fallback_source_product_id)
);

create table if not exists public.catalog_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  source_identity_id uuid not null references public.catalog_source_identities(id) on delete cascade,
  detail_url text not null,
  affiliate_url text,
  exactness public.catalog_exactness not null default 'similar',
  verified_detail_url boolean not null default false,
  verified boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  vector_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_identity_id, detail_url)
);

create table if not exists public.catalog_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.catalog_sources(id) on delete cascade,
  checkpoint_current text,
  checkpoint_next text,
  preview boolean not null default false,
  row_count integer not null default 0 check (row_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  quarantined_count integer not null default 0 check (quarantined_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_import_checkpoints (
  source_id text primary key references public.catalog_sources(id) on delete cascade,
  current_checkpoint text,
  next_checkpoint text,
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_quarantine (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.catalog_import_batches(id) on delete cascade,
  source_id text not null references public.catalog_sources(id) on delete cascade,
  source_product_id text,
  row_number integer not null check (row_number > 0),
  code text not null,
  field text,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_vector_metadata (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  source_identity_id uuid references public.catalog_source_identities(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, source_identity_id)
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'operator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.catalog_sources enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_source_identities enable row level security;
alter table public.catalog_offers enable row level security;
alter table public.catalog_import_batches enable row level security;
alter table public.catalog_import_checkpoints enable row level security;
alter table public.catalog_quarantine enable row level security;
alter table public.catalog_vector_metadata enable row level security;
alter table public.user_roles enable row level security;

revoke all on table
  public.catalog_sources,
  public.catalog_products,
  public.catalog_source_identities,
  public.catalog_offers,
  public.catalog_import_batches,
  public.catalog_import_checkpoints,
  public.catalog_quarantine,
  public.catalog_vector_metadata,
  public.user_roles
from anon, authenticated;

grant select on table public.catalog_products, public.catalog_offers to anon, authenticated;
grant all on table
  public.catalog_sources,
  public.catalog_products,
  public.catalog_source_identities,
  public.catalog_offers,
  public.catalog_import_batches,
  public.catalog_import_checkpoints,
  public.catalog_quarantine,
  public.catalog_vector_metadata,
  public.user_roles
to authenticated;

drop trigger if exists catalog_sources_set_updated_at on public.catalog_sources;
create trigger catalog_sources_set_updated_at before update on public.catalog_sources for each row execute function public.set_updated_at();
drop trigger if exists catalog_products_set_updated_at on public.catalog_products;
create trigger catalog_products_set_updated_at before update on public.catalog_products for each row execute function public.set_updated_at();
drop trigger if exists catalog_source_identities_set_updated_at on public.catalog_source_identities;
create trigger catalog_source_identities_set_updated_at before update on public.catalog_source_identities for each row execute function public.set_updated_at();
drop trigger if exists catalog_offers_set_updated_at on public.catalog_offers;
create trigger catalog_offers_set_updated_at before update on public.catalog_offers for each row execute function public.set_updated_at();
drop trigger if exists catalog_vector_metadata_set_updated_at on public.catalog_vector_metadata;
create trigger catalog_vector_metadata_set_updated_at before update on public.catalog_vector_metadata for each row execute function public.set_updated_at();
drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at before update on public.user_roles for each row execute function public.set_updated_at();

drop policy if exists catalog_sources_admin_read on public.catalog_sources;
create policy catalog_sources_admin_read on public.catalog_sources
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_products_public_read on public.catalog_products;
create policy catalog_products_public_read on public.catalog_products
for select to anon, authenticated
using (
  lifecycle = 'active'
  and verified_detail_url = true
  and source_identity_verified = true
  and exactness in ('exact', 'likely')
);

drop policy if exists catalog_products_admin_write on public.catalog_products;
create policy catalog_products_admin_write on public.catalog_products
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_source_identities_admin_read on public.catalog_source_identities;
create policy catalog_source_identities_admin_read on public.catalog_source_identities
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_offers_public_read on public.catalog_offers;
create policy catalog_offers_public_read on public.catalog_offers
for select to anon, authenticated
using (
  verified = true
  and verified_detail_url = true
  and exactness in ('exact', 'likely')
);

drop policy if exists catalog_offers_admin_write on public.catalog_offers;
create policy catalog_offers_admin_write on public.catalog_offers
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_batches_admin_write on public.catalog_import_batches;
create policy catalog_batches_admin_write on public.catalog_import_batches
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_checkpoints_admin_write on public.catalog_import_checkpoints;
create policy catalog_checkpoints_admin_write on public.catalog_import_checkpoints
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_quarantine_admin_read on public.catalog_quarantine;
create policy catalog_quarantine_admin_read on public.catalog_quarantine
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists catalog_vector_metadata_admin_write on public.catalog_vector_metadata;
create policy catalog_vector_metadata_admin_write on public.catalog_vector_metadata
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

alter table public.post_objects
  drop constraint if exists post_objects_exactness_check;

alter table public.post_objects
  alter column exactness drop default,
  alter column exactness type public.catalog_exactness using (
    case exactness
      when 'exact' then 'exact'::public.catalog_exactness
      when 'similar' then 'similar'::public.catalog_exactness
      else 'unverified'::public.catalog_exactness
    end
  ),
  alter column exactness set default 'similar'::public.catalog_exactness;

alter table public.post_objects
  add constraint post_objects_exactness_check
  check (exactness in ('exact', 'likely', 'similar', 'review', 'unverified'));

create index if not exists catalog_sources_provider_idx on public.catalog_sources (provider);
create index if not exists catalog_products_exactness_idx on public.catalog_products (exactness, created_at desc);
create index if not exists catalog_products_brand_idx on public.catalog_products (brand);
create index if not exists catalog_source_identities_product_idx on public.catalog_source_identities (canonical_product_id);
create index if not exists catalog_offers_product_idx on public.catalog_offers (product_id, created_at desc);
create index if not exists catalog_batches_source_idx on public.catalog_import_batches (source_id, created_at desc);
create index if not exists catalog_quarantine_batch_idx on public.catalog_quarantine (batch_id, row_number);
create index if not exists catalog_vector_metadata_product_idx on public.catalog_vector_metadata (product_id);
