-- STS Phase 1 — media storage.
-- Bucket "post-media": public read (posts are public content), 10MB/object,
-- images only for now. Writes are restricted to the uploader's own folder:
-- every object path must start with the uploader's auth.uid().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "users upload into own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete own media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
