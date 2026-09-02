import { describe, expect, it } from "vitest";
import { functionBlock, migrationSql } from "./social-rls-fixtures";

describe("social RLS source integrity", () => {
  it("keeps content source kind immutable after creation", () => {
    const immutableSourceKindBlock = functionBlock(migrationSql, "public.prevent_content_source_kind_update");

    expect(immutableSourceKindBlock).toContain("new.source_kind is distinct from old.source_kind");
    expect(immutableSourceKindBlock).toContain("raise exception");
    expect(immutableSourceKindBlock).toContain("errcode = '23514'");
    expect(migrationSql).toContain("create trigger content_sources_prevent_source_kind_update");
    expect(migrationSql).toContain("before update of source_kind on public.content_sources");
  });

  it("prevents official and display-only source divergence with database triggers", () => {
    const rightsAlignmentBlock = functionBlock(migrationSql, "public.enforce_content_rights_source_alignment");
    const postAlignmentBlock = functionBlock(migrationSql, "public.enforce_posts_source_alignment");

    expect(rightsAlignmentBlock).toContain("posts.source_id");
    expect(rightsAlignmentBlock).toContain("new.source_id");
    expect(rightsAlignmentBlock).toContain("license_scope in ('display_only', 'public_embed')");
    expect(rightsAlignmentBlock).toContain("source_kind = 'official_embed'");
    expect(rightsAlignmentBlock).toContain("raise exception");
    expect(rightsAlignmentBlock).toContain("errcode = '23514'");

    expect(postAlignmentBlock).toContain("content_rights.source_id");
    expect(postAlignmentBlock).toContain("new.source_id");
    expect(postAlignmentBlock).toContain("license_scope in ('display_only', 'public_embed')");
    expect(postAlignmentBlock).toContain("source_kind = 'official_embed'");
    expect(postAlignmentBlock).toContain("raise exception");

    expect(migrationSql).toContain("create trigger content_rights_enforce_source_alignment");
    expect(migrationSql).toContain("before insert or update of post_id, source_id, license_scope");
    expect(migrationSql).toContain("create trigger posts_enforce_source_alignment");
    expect(migrationSql).toContain("before update of source_id on public.posts");
  });

  it("keeps post and rights source identity immutable after insert", () => {
    const postSourceTrigger = functionBlock(migrationSql, "public.prevent_posts_source_id_update");
    const rightsSourceTrigger = functionBlock(migrationSql, "public.prevent_content_rights_source_id_update");

    expect(postSourceTrigger).toContain("new.source_id is distinct from old.source_id");
    expect(postSourceTrigger).toContain("raise exception");
    expect(rightsSourceTrigger).toContain("new.source_id is distinct from old.source_id");
    expect(rightsSourceTrigger).toContain("raise exception");
    expect(migrationSql).toContain("create trigger posts_source_id_immutable");
    expect(migrationSql).toContain("before update of source_id on public.posts");
    expect(migrationSql).toContain("create trigger content_rights_source_id_immutable");
    expect(migrationSql).toContain("before update of source_id on public.content_rights");
  });
});
