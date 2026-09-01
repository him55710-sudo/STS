import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(new URL("../../supabase/migrations/0003_social_community.sql", import.meta.url), "utf8");

function policyBlock(sql: string, policyName: string): string {
  const policyStart = sql.indexOf(`create policy ${policyName}`);
  const nextPolicyStart = sql.indexOf("create policy ", policyStart + 1);

  expect(policyStart, `${policyName} should exist`).toBeGreaterThanOrEqual(0);
  return sql.slice(policyStart, nextPolicyStart < 0 ? undefined : nextPolicyStart);
}

function sqlStatements(sql: string): readonly string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function functionBlock(sql: string, functionName: string): string {
  const functionStart = sql.indexOf(`create or replace function ${functionName}`);
  const functionEnd = sql.indexOf("\n$$;", functionStart);

  expect(functionStart, `${functionName} should exist`).toBeGreaterThanOrEqual(0);
  expect(functionEnd, `${functionName} should terminate`).toBeGreaterThan(functionStart);
  return sql.slice(functionStart, functionEnd);
}

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
    const rightsPolicy = policyBlock(migrationSql, "content_rights_admin_review");
    const rightsInsertPolicy = policyBlock(migrationSql, "content_rights_owner_insert");

    expect(postInsertPolicy).toContain("display_state = 'pending'");
    expect(postUpdatePolicy).toContain("display_state = 'pending'");
    expect(storyGroupPolicy).toContain("display_state = 'pending'");
    expect(commentInsertPolicy).toContain("moderation_state = 'pending'");
    expect(commentUpdatePolicy).toContain("moderation_state = 'pending'");
    expect(repostPolicy).toContain("permission_state = 'pending'");
    expect(mediaAssetPolicy).toContain("processing_state in ('uploaded', 'processing', 'failed')");
    expect(mediaVariantPolicy).toContain("processing_state in ('uploaded', 'processing', 'failed')");
    expect(postObjectPolicy).toContain("content_rights.can_use_for_commerce_matching = true");
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
    expect(migrationSql).not.toMatch(/grant\s+insert[\s\S]*public\.analytics_events[\s\S]*\bto\s+anon\b/i);
    expect(migrationSql).not.toMatch(/grant\s+insert[\s\S]*public\.analytics_events[\s\S]*\bto\s+authenticated\b/i);
    expect(migrationSql).toContain("No client insert policy by design");
  });
});
