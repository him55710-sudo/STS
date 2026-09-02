import { describe, expect, it } from "vitest";
import { migrationSql, policyBlock, sqlStatements, functionBlock } from "./social-rls-fixtures";

describe("social RLS migration", () => {
  it("rejects anonymous inserts into content, comments, reactions, follows, and reposts", () => {
    const writeTables = [
      "public.posts",
      "public.media_assets",
      "public.post_comments",
      "public.post_reactions",
      "public.creator_follows",
      "public.post_reposts",
    ];

    for (const tableName of writeTables) {
      expect(migrationSql).toContain(`revoke all on table ${tableName} from anon`);
    }

    expect(sqlStatements(migrationSql).some((statement) => /grant\s+insert[\s\S]*\bto\s+anon\b/i.test(statement))).toBe(false);
    expect(policyBlock(migrationSql, "posts_creator_insert")).toContain("to authenticated");
    expect(policyBlock(migrationSql, "post_comments_author_insert")).toContain("(select auth.uid()) = author_id");
    expect(policyBlock(migrationSql, "post_reactions_actor_insert")).toContain("(select auth.uid()) = actor_id");
    expect(policyBlock(migrationSql, "creator_follows_follower_insert")).toContain("(select auth.uid()) = follower_id");
    expect(policyBlock(migrationSql, "post_reposts_creator_insert")).toContain("(select auth.uid()) = creator_id");
  });

  it("allows public selects only for published, displayable, non-expired content", () => {
    const postPolicy = policyBlock(migrationSql, "posts_public_published_select");
    const mediaPolicy = policyBlock(migrationSql, "media_assets_public_published_select");

    expect(postPolicy).toContain("visibility = 'public'");
    expect(postPolicy).toContain("publish_state = 'published'");
    expect(postPolicy).toContain("display_state = 'approved'");
    expect(postPolicy).toContain("published_at is not null");
    expect(postPolicy).toContain("expires_at is null or expires_at > now()");
    expect(postPolicy).toContain("can_display = true");
    expect(postPolicy).toContain("rights_status = 'approved'");
    expect(postPolicy).toContain("takedown_at is null");
    expect(mediaPolicy).toContain("processing_state = 'ready'");
  });

  it("reuses complete displayable-post visibility for public child selects", () => {
    const visibilityHelper = functionBlock(migrationSql, "public.is_public_displayable_post");
    const childPolicies = [
      "media_assets_public_published_select",
      "media_variants_public_ready_select",
      "story_groups_public_active_select",
      "story_items_public_active_select",
      "post_comments_public_approved_select",
      "post_reposts_public_select",
      "post_objects_public_published_select",
    ];

    expect(visibilityHelper).toContain("posts.visibility = 'public'");
    expect(visibilityHelper).toContain("posts.publish_state = 'published'");
    expect(visibilityHelper).toContain("posts.display_state = 'approved'");
    expect(visibilityHelper).toContain("posts.published_at is not null");
    expect(visibilityHelper).toContain("posts.expires_at is null or posts.expires_at > now()");
    expect(visibilityHelper).toContain("content_rights.can_display = true");
    expect(visibilityHelper).toContain("content_rights.rights_status = 'approved'");
    expect(visibilityHelper).toContain("content_rights.takedown_at is null");
    expect(visibilityHelper).toContain("content_rights.expires_at is null or content_rights.expires_at > now()");

    for (const policyName of childPolicies) {
      expect(policyBlock(migrationSql, policyName), `${policyName} should use the shared helper`).toContain(
        "public.is_public_displayable_post",
      );
    }

    expect(policyBlock(migrationSql, "post_reposts_public_select")).toContain(
      "public.is_public_displayable_post(post_reposts.original_post_id)",
    );
    expect(policyBlock(migrationSql, "post_reposts_public_select")).toContain(
      "public.is_public_displayable_post(post_reposts.repost_post_id)",
    );

    const storyGroupPolicy = policyBlock(migrationSql, "story_groups_public_active_select");
    expect(storyGroupPolicy).toContain("story_items.story_group_id = story_groups.id");
    expect(storyGroupPolicy).toContain("media_assets.id = story_items.media_asset_id");
    expect(storyGroupPolicy).toContain("media_assets.processing_state = 'ready'");
    expect(storyGroupPolicy).toContain("public.is_public_displayable_post(media_assets.post_id)");
  });

  it("rejects owner attempts to self-approve review, moderation, processing, or rights states", () => {
    const postInsertPolicy = policyBlock(migrationSql, "posts_creator_insert");
    const postUpdatePolicy = policyBlock(migrationSql, "posts_creator_update");
    const mediaAssetPolicy = policyBlock(migrationSql, "media_assets_owner_write");
    const mediaVariantPolicy = policyBlock(migrationSql, "media_variants_owner_write");
    const storyGroupPolicy = policyBlock(migrationSql, "story_groups_creator_write");
    const commentInsertPolicy = policyBlock(migrationSql, "post_comments_author_insert");
    const commentUpdatePolicy = policyBlock(migrationSql, "post_comments_author_update");
    const repostPolicy = policyBlock(migrationSql, "post_reposts_creator_insert");
    const postObjectPolicy = policyBlock(migrationSql, "post_objects_owner_write");
    const postObjectHelper = functionBlock(migrationSql, "public.can_write_social_post_object");
    const rightsPolicy = policyBlock(migrationSql, "content_rights_admin_review");
    const rightsInsertPolicy = policyBlock(migrationSql, "content_rights_owner_insert");

    expect(postInsertPolicy).toContain("display_state = 'pending'");
    expect(postUpdatePolicy).toContain("display_state = 'pending'");
    expect(storyGroupPolicy).toContain("display_state = 'pending'");
    expect(commentInsertPolicy).toContain("moderation_state = 'pending'");
    expect(commentUpdatePolicy).toContain("moderation_state = 'pending'");
    expect(repostPolicy).toContain("permission_state = 'pending'");
    expect(mediaAssetPolicy).toContain("processing_state = 'uploaded'");
    expect(mediaVariantPolicy).toContain("processing_state = 'uploaded'");
    expect(postObjectPolicy).toContain("public.can_write_social_post_object");
    expect(postObjectHelper).toContain("content_rights.can_use_for_commerce_matching = true");
    expect(rightsInsertPolicy).toContain("rights_status = 'pending'");
    expect(rightsInsertPolicy).toContain("can_display = false");
    expect(rightsInsertPolicy).toContain("can_use_for_commerce_matching = false");

    expect(rightsPolicy).toContain("to authenticated");
    expect(rightsPolicy).toContain("(select public.is_admin())");
    expect(rightsPolicy).not.toContain("from public.user_roles");
    expect(migrationSql).not.toContain("content_rights_owner_update");
  });

  it("persists official embeds as displayable but never commerce matchable", () => {
    const triggerBlock = migrationSql.slice(
      migrationSql.indexOf("create or replace function public.enforce_content_rights_commerce_matching"),
      migrationSql.indexOf("create trigger content_rights_enforce_commerce_matching"),
    );

    expect(triggerBlock).toContain("can_use_for_commerce_matching = false");
    expect(triggerBlock).toContain("license_scope in ('display_only', 'public_embed')");
    expect(triggerBlock).toContain("source_kind = 'official_embed'");
    expect(migrationSql).toContain("before insert or update on public.content_rights");
  });

  it("does not grant public analytics writes", () => {
    const grants = sqlStatements(migrationSql).filter((statement) => /^grant\s+insert\b/i.test(statement));

    expect(grants.some((statement) => /\bpublic\.analytics_events\b[\s\S]*\bto\s+anon\b/i.test(statement))).toBe(false);
    expect(grants.some((statement) => /\bpublic\.analytics_events\b[\s\S]*\bto\s+authenticated\b/i.test(statement))).toBe(false);
    expect(migrationSql).toContain("No client insert policy by design");
  });

  it("defines server-owned social interaction persistence RPCs with idempotency storage", () => {
    const recordInteractionFunction = functionBlock(migrationSql, "public.record_social_interaction");
    const getInteractionFunction = functionBlock(migrationSql, "public.get_social_interaction_by_idempotency_key");

    expect(migrationSql).toContain("create table if not exists public.social_interactions");
    expect(migrationSql).toContain("unique (actor_id, idempotency_key)");
    expect(migrationSql).toContain("alter table public.social_interactions enable row level security");
    expect(migrationSql).toContain("revoke all on table public.social_interactions from anon, authenticated");
    expect(recordInteractionFunction).toContain("insert into public.social_interactions");
    expect(recordInteractionFunction).toContain("on conflict (actor_id, idempotency_key)");
    expect(getInteractionFunction).toContain("where social_interactions.actor_id = p_actor_id");
    expect(getInteractionFunction).toContain("social_interactions.idempotency_key = p_idempotency_key");
  });
});
