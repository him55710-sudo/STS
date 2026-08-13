-- STS Phase 1 foundation — persistence for identity, content, objects, product links, social.
-- All tables RLS-enabled. Public (anon) may read published content; only owners may write their rows.
-- Canonical products/offers arrive in Phase 2 — until then product_id is a text id into the
-- app catalog namespace and non-catalog products travel as product_snapshot on the link.

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  display_name text not null default '크리에이터',
  bio          text not null default '',
  avatar_url   text,
  role         text not null default 'user' check (role in ('user', 'creator', 'admin')),
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select using (true);

create policy "users insert own profile"
  on public.profiles for insert with check (id = (select auth.uid()));

-- self-service updates may not escalate role to admin
create policy "users update own profile"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role in ('user', 'creator'));

-- auto-provision a profile row for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    'user_' || replace(substr(new.id::text, 1, 13), '-', ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      '크리에이터'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── posts ───────────────────────────────────────────────────────────────────
create table public.posts (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references public.profiles (id) on delete cascade,
  caption            text not null default '',
  category           text not null default 'fashion'
                     check (category in ('fashion','beauty','interior','tech','lifestyle')),
  status             text not null default 'published'
                     check (status in ('draft','published','removed')),
  source             text not null default 'upload'
                     check (source in ('upload','import_tiktok','seed')),
  source_external_id text,
  created_at         timestamptz not null default now(),
  published_at       timestamptz
);

create index posts_feed_idx on public.posts (status, published_at desc);
create index posts_creator_idx on public.posts (creator_id, published_at desc);

alter table public.posts enable row level security;

create policy "published posts are publicly readable"
  on public.posts for select
  using (status = 'published' or creator_id = (select auth.uid()));

create policy "creators insert own posts"
  on public.posts for insert with check (creator_id = (select auth.uid()));

create policy "creators update own posts"
  on public.posts for update
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

create policy "creators delete own posts"
  on public.posts for delete using (creator_id = (select auth.uid()));

-- ── post_media ──────────────────────────────────────────────────────────────
create table public.post_media (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references public.posts (id) on delete cascade,
  media_type         text not null default 'image' check (media_type in ('image','video')),
  storage_url        text,          -- path inside the post-media bucket
  external_embed_url text,          -- future: TikTok embeds etc.
  width              integer,
  height             integer,
  duration           numeric,       -- seconds, video only
  position           integer not null default 0,
  created_at         timestamptz not null default now(),
  check (storage_url is not null or external_embed_url is not null)
);

create index post_media_post_idx on public.post_media (post_id, position);

alter table public.post_media enable row level security;

create policy "media of visible posts is readable"
  on public.post_media for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and (p.status = 'published' or p.creator_id = (select auth.uid()))
  ));

create policy "creators write media on own posts"
  on public.post_media for insert
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id and p.creator_id = (select auth.uid())
  ));

create policy "creators delete media on own posts"
  on public.post_media for delete
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.creator_id = (select auth.uid())
  ));

-- ── objects (detected shoppable objects; geometry preserved verbatim) ───────
create table public.objects (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references public.posts (id) on delete cascade,
  media_id         uuid references public.post_media (id) on delete cascade,
  canonical_class  text,
  label            text not null,
  bbox             jsonb not null,  -- {x,y,w,h} normalized 0..1
  polygon          jsonb,           -- [[x,y],...] single silhouette ring
  polygons         jsonb,           -- [[[x,y],...],...] multi-ring (e.g. shoe pair)
  confidence       real not null default 0,
  pipeline_version text,
  created_at       timestamptz not null default now()
);

create index objects_post_idx on public.objects (post_id);

alter table public.objects enable row level security;

create policy "objects of visible posts are readable"
  on public.objects for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and (p.status = 'published' or p.creator_id = (select auth.uid()))
  ));

create policy "creators write objects on own posts"
  on public.objects for insert
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id and p.creator_id = (select auth.uid())
  ));

create policy "creators delete objects on own posts"
  on public.objects for delete
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.creator_id = (select auth.uid())
  ));

-- ── object_product_links ────────────────────────────────────────────────────
-- exact relationship structurally requires a human verifier (creator confirmation
-- is the product's immutable rule — AI alone can never mark exact).
create table public.object_product_links (
  id               uuid primary key default gen_random_uuid(),
  object_id        uuid not null references public.objects (id) on delete cascade,
  product_id       text not null,
  relationship     text not null check (relationship in ('exact','similar','likely')),
  -- 검증자는 현 스키마에서 항상 게시물 작성자 — 작성자 삭제 시 게시물이 캐스케이드되므로
  -- cascade가 올바르다 (set null은 exact_requires_verifier와 충돌해 계정 삭제를 막는다)
  verified_by      uuid references public.profiles (id) on delete cascade,
  model_confidence real,
  product_snapshot jsonb,           -- {brand,name,price,currency,retailer,url,image,...} for non-catalog products
  created_at       timestamptz not null default now(),
  constraint exact_requires_verifier check (relationship <> 'exact' or verified_by is not null)
);

create index object_product_links_object_idx on public.object_product_links (object_id);
create index object_product_links_product_idx on public.object_product_links (product_id);

alter table public.object_product_links enable row level security;

create policy "links of visible posts are readable"
  on public.object_product_links for select
  using (exists (
    select 1 from public.objects o join public.posts p on p.id = o.post_id
    where o.id = object_id and (p.status = 'published' or p.creator_id = (select auth.uid()))
  ));

create policy "creators write links on own posts"
  on public.object_product_links for insert
  with check (exists (
    select 1 from public.objects o join public.posts p on p.id = o.post_id
    where o.id = object_id and p.creator_id = (select auth.uid())
  ));

create policy "creators delete links on own posts"
  on public.object_product_links for delete
  using (exists (
    select 1 from public.objects o join public.posts p on p.id = o.post_id
    where o.id = object_id and p.creator_id = (select auth.uid())
  ));

-- ── social: follows / post_likes / post_saves / product_saves ───────────────
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

create index follows_creator_idx on public.follows (creator_id);

alter table public.follows enable row level security;
create policy "follows are publicly readable" on public.follows for select using (true);
create policy "users follow as themselves"
  on public.follows for insert with check (follower_id = (select auth.uid()));
create policy "users unfollow as themselves"
  on public.follows for delete using (follower_id = (select auth.uid()));

create table public.post_likes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_likes_post_idx on public.post_likes (post_id);

alter table public.post_likes enable row level security;
create policy "likes are publicly readable" on public.post_likes for select using (true);
create policy "users like as themselves"
  on public.post_likes for insert with check (user_id = (select auth.uid()));
create policy "users unlike as themselves"
  on public.post_likes for delete using (user_id = (select auth.uid()));

create table public.post_saves (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_saves enable row level security;
create policy "users read own post saves"
  on public.post_saves for select using (user_id = (select auth.uid()));
create policy "users save posts as themselves"
  on public.post_saves for insert with check (user_id = (select auth.uid()));
create policy "users unsave posts as themselves"
  on public.post_saves for delete using (user_id = (select auth.uid()));

create table public.product_saves (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.product_saves enable row level security;
create policy "users read own product saves"
  on public.product_saves for select using (user_id = (select auth.uid()));
create policy "users save products as themselves"
  on public.product_saves for insert with check (user_id = (select auth.uid()));
create policy "users unsave products as themselves"
  on public.product_saves for delete using (user_id = (select auth.uid()));

-- ── comments (schema + RLS now; UI ships in the social phase) ───────────────
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_post_idx on public.comments (post_id, created_at);

alter table public.comments enable row level security;

create policy "comments on visible posts are readable"
  on public.comments for select
  using (deleted_at is null and exists (
    select 1 from public.posts p
    where p.id = post_id and (p.status = 'published' or p.creator_id = (select auth.uid()))
  ));

create policy "users comment as themselves"
  on public.comments for insert with check (author_id = (select auth.uid()));

create policy "authors soft-delete own comments"
  on public.comments for update
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- 트리거 전용 함수 — PostgREST RPC로 호출되지 않도록 잠근다 (security advisor 0028/0029)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
