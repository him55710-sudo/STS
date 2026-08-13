-- STS Phase 1 — atomic publish.
-- One call inserts post + media + objects + product links in a single transaction,
-- so a failed publish never leaves a half-written post. SECURITY INVOKER: every
-- insert passes through the RLS policies of the calling user — the function grants
-- no extra privilege. Links are stamped verified_by = auth.uid(): the creator
-- reviewed and confirmed each link in the UI, and the exact_requires_verifier
-- check constraint keeps "exact" impossible without that confirmation.

create or replace function public.publish_post(
  p_caption  text,
  p_category text,
  p_media    jsonb,  -- [{media_type, storage_url, external_embed_url, width, height, duration}]
  p_objects  jsonb   -- [{label, canonical_class, bbox, polygon, polygons, confidence,
                     --   pipeline_version, link: {product_id, relationship, model_confidence, product_snapshot} | null}]
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_post_id  uuid;
  v_media_id uuid;
  m          jsonb;
  o          jsonb;
  v_obj_id   uuid;
  v_link     jsonb;
  v_pos      integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_media is null or jsonb_array_length(p_media) = 0 then
    raise exception 'at least one media item required';
  end if;

  insert into public.posts (creator_id, caption, category, status, source, published_at)
  values (
    v_uid,
    coalesce(nullif(trim(p_caption), ''), '새 콘텐츠'),
    coalesce(p_category, 'fashion'),
    'published',
    'upload',
    now()
  )
  returning id into v_post_id;

  for m in select * from jsonb_array_elements(p_media) loop
    insert into public.post_media (post_id, media_type, storage_url, external_embed_url, width, height, duration, position)
    values (
      v_post_id,
      coalesce(m ->> 'media_type', 'image'),
      m ->> 'storage_url',
      m ->> 'external_embed_url',
      (m ->> 'width')::integer,
      (m ->> 'height')::integer,
      (m ->> 'duration')::numeric,
      v_pos
    )
    returning id into v_media_id;
    v_pos := v_pos + 1;
  end loop;

  -- v_media_id holds the last (primary for single-image posts) media row
  for o in select * from jsonb_array_elements(coalesce(p_objects, '[]'::jsonb)) loop
    insert into public.objects (post_id, media_id, canonical_class, label, bbox, polygon, polygons, confidence, pipeline_version)
    values (
      v_post_id,
      v_media_id,
      o ->> 'canonical_class',
      coalesce(o ->> 'label', 'item'),
      coalesce(nullif(o -> 'bbox', 'null'::jsonb), '{}'::jsonb),
      nullif(o -> 'polygon', 'null'::jsonb),
      nullif(o -> 'polygons', 'null'::jsonb),
      coalesce((o ->> 'confidence')::real, 0),
      o ->> 'pipeline_version'
    )
    returning id into v_obj_id;

    v_link := nullif(o -> 'link', 'null'::jsonb);
    if v_link is not null and v_link ->> 'product_id' is not null then
      insert into public.object_product_links (object_id, product_id, relationship, verified_by, model_confidence, product_snapshot)
      values (
        v_obj_id,
        v_link ->> 'product_id',
        coalesce(v_link ->> 'relationship', 'similar'),
        v_uid,
        (v_link ->> 'model_confidence')::real,
        nullif(v_link -> 'product_snapshot', 'null'::jsonb)
      );
    end if;
  end loop;

  return v_post_id;
end;
$$;
