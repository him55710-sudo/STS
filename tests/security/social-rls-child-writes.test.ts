import { describe, expect, it } from "vitest";
import { functionBlock, migrationSql, policyBlock } from "./social-rls-fixtures";

describe("social RLS child writes", () => {
  it("checks referenced parent ownership, public display, rights, and takedown state before child writes", () => {
    const postObjectHelper = functionBlock(migrationSql, "public.can_write_social_post_object");
    const mediaWriteHelper = functionBlock(migrationSql, "public.can_write_social_media_for_post");
    const storyItemHelper = functionBlock(migrationSql, "public.can_write_social_story_item");
    const repostHelper = functionBlock(migrationSql, "public.can_write_social_repost");
    const interactionHelper = functionBlock(migrationSql, "public.can_write_public_social_interaction");

    expect(policyBlock(migrationSql, "media_assets_owner_write")).toContain("public.can_write_social_media_for_post");
    expect(policyBlock(migrationSql, "media_variants_owner_write")).toContain("public.can_write_social_media_for_post");
    expect(policyBlock(migrationSql, "post_objects_owner_write")).toContain("public.can_write_social_post_object");
    expect(policyBlock(migrationSql, "story_items_creator_write")).toContain("public.can_write_social_story_item");
    expect(policyBlock(migrationSql, "post_reposts_creator_insert")).toContain("public.can_write_social_repost");
    expect(policyBlock(migrationSql, "post_comments_author_insert")).toContain(
      "public.can_write_public_social_interaction",
    );
    expect(policyBlock(migrationSql, "post_reactions_actor_insert")).toContain(
      "public.can_write_public_social_interaction",
    );
    expect(policyBlock(migrationSql, "story_item_views_viewer_insert")).toContain(
      "public.can_write_social_story_item_view",
    );

    expect(postObjectHelper).toContain("posts.creator_id = target_actor_id");
    expect(postObjectHelper).toContain("public.is_public_displayable_post");
    expect(postObjectHelper).toContain("content_rights.can_use_for_commerce_matching = true");
    expect(postObjectHelper).toContain("content_rights.takedown_at is null");
    expect(postObjectHelper).toContain("license_scope not in ('display_only', 'public_embed')");
    expect(postObjectHelper).toContain("source_kind = 'official_embed'");

    expect(mediaWriteHelper).toContain("posts.creator_id = target_actor_id");
    expect(mediaWriteHelper).toContain("rights_status in ('rejected', 'expired', 'takedown')");
    expect(mediaWriteHelper).toContain("content_rights.takedown_at is not null");
    expect(mediaWriteHelper).toContain("content_rights.expires_at <= now()");

    expect(storyItemHelper).toContain("story_groups.creator_id = target_actor_id");
    expect(storyItemHelper).toContain("story_groups.display_state = 'pending'");
    expect(storyItemHelper).toContain("posts.creator_id = target_actor_id");
    expect(storyItemHelper).toContain("target_post_id is null or target_post_id = media_assets.post_id");
    expect(storyItemHelper).toContain("public.is_public_displayable_post(media_assets.post_id)");
    expect(storyItemHelper).toContain("rights_status in ('rejected', 'expired', 'takedown')");
    expect(storyItemHelper).toContain("content_rights.takedown_at is not null");

    const storyItemViewHelper = functionBlock(migrationSql, "public.can_write_social_story_item_view");
    expect(storyItemViewHelper).toContain("story_groups.visibility = 'public'");
    expect(storyItemViewHelper).toContain("story_groups.publish_state = 'published'");
    expect(storyItemViewHelper).toContain("story_groups.display_state = 'approved'");
    expect(storyItemViewHelper).toContain("story_groups.starts_at <= now()");
    expect(storyItemViewHelper).toContain("story_groups.expires_at > now()");
    expect(storyItemViewHelper).toContain("story_items.post_id is null or story_items.post_id = media_assets.post_id");
    expect(storyItemViewHelper).toContain("media_assets.processing_state = 'ready'");
    expect(storyItemViewHelper).toContain("public.is_public_displayable_post(media_assets.post_id)");

    expect(repostHelper).toContain("public.is_public_displayable_post(target_original_post_id)");
    expect(repostHelper).toContain("posts.creator_id = target_actor_id");
    expect(repostHelper).toContain("posts.display_state = 'pending'");
    expect(repostHelper).toContain("content_rights.can_redistribute = true");
    expect(policyBlock(migrationSql, "post_reposts_creator_insert")).toContain(
      "length(trim(post_reposts.attribution)) > 0",
    );
    expect(repostHelper).toContain("rights_status in ('rejected', 'expired', 'takedown')");
    expect(repostHelper).toContain("content_rights.takedown_at is not null");

    expect(interactionHelper).toContain("public.is_public_displayable_post(target_post_id)");
  });

  it("protects server-trusted media fields while preserving owner upload initiation", () => {
    const mediaAssetPolicy = policyBlock(migrationSql, "media_assets_owner_write");
    const mediaVariantPolicy = policyBlock(migrationSql, "media_variants_owner_write");
    const mediaAssetTrigger = functionBlock(migrationSql, "public.prevent_media_asset_owner_trusted_update");
    const mediaVariantTrigger = functionBlock(migrationSql, "public.prevent_media_variant_owner_trusted_update");

    expect(mediaAssetPolicy).toContain("processing_state = 'uploaded'");
    expect(mediaAssetPolicy).toContain("public.can_write_social_media_for_post");
    for (const trustedField of ["poster_url", "hls_url", "processing_error", "perceptual_hash", "content_hash"]) {
      expect(mediaAssetPolicy).toContain(`${trustedField} is null`);
    }
    expect(mediaVariantPolicy).toContain("public.can_write_social_media_for_post");
    expect(mediaVariantPolicy).toContain("processing_state = 'uploaded'");
    for (const trustedField of ["mime_type", "width", "height", "duration_ms", "byte_size", "content_hash"]) {
      expect(mediaVariantPolicy).toContain(`${trustedField} is null`);
    }

    expect(mediaAssetTrigger).toContain("auth.uid() is not null");
    expect(mediaAssetTrigger).toContain("new.poster_url is distinct from old.poster_url");
    expect(mediaAssetTrigger).toContain("new.hls_url is distinct from old.hls_url");
    expect(mediaAssetTrigger).toContain("new.processing_state is distinct from old.processing_state");
    expect(mediaAssetTrigger).toContain("raise exception");

    expect(mediaVariantTrigger).toContain("auth.uid() is not null");
    expect(mediaVariantTrigger).toContain("new.public_url is distinct from old.public_url");
    expect(mediaVariantTrigger).toContain("new.processing_state is distinct from old.processing_state");
    expect(mediaVariantTrigger).toContain("raise exception");

    expect(migrationSql).toContain("create trigger media_assets_prevent_owner_trusted_update");
    expect(migrationSql).toContain("create trigger media_variants_prevent_owner_trusted_update");
  });

  it("prevents authenticated media insert attempts from persisting trusted fields", () => {
    const mediaAssetPolicy = policyBlock(migrationSql, "media_assets_owner_write");
    const mediaVariantPolicy = policyBlock(migrationSql, "media_variants_owner_write");
    const blockedAssetFields = [
      "license_note",
      "content_hash",
      "width",
      "height",
      "poster_url",
      "hls_url",
      "duration_ms",
      "mime_type",
      "byte_size",
      "processing_error",
      "perceptual_hash",
    ];
    const blockedVariantFields = ["mime_type", "width", "height", "duration_ms", "byte_size", "content_hash"];

    expect(mediaAssetPolicy).toContain("processing_state = 'uploaded'");
    expect(mediaAssetPolicy).toContain("source = 'user_upload'");
    expect(mediaAssetPolicy).toContain("is_demo = false");
    expect(mediaAssetPolicy).toContain("media_kind in ('photo', 'video')");
    for (const field of blockedAssetFields) {
      expect(mediaAssetPolicy).toContain(`${field} is null`);
    }

    expect(mediaVariantPolicy).toContain("variant_kind = 'original'");
    expect(mediaVariantPolicy).toContain("processing_state = 'uploaded'");
    for (const field of blockedVariantFields) {
      expect(mediaVariantPolicy).toContain(`${field} is null`);
    }
  });
});
