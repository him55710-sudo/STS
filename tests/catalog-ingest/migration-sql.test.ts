import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalog migration SQL", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/0002_catalog_ingestion.sql", import.meta.url), "utf8");
  const seed = readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8");

  it("adds the canonical catalog tables and admin path", () => {
    expect(sql).toContain("create table if not exists public.catalog_products");
    expect(sql).toContain("create table if not exists public.user_roles");
    expect(sql).toContain("create or replace function public.is_admin()");
    expect(sql).toMatch(/create or replace function public\.is_admin\(\)[\s\S]*?security definer[\s\S]*?set search_path = ''/i);
    expect(sql).toMatch(/from public\.user_roles[\s\S]*?role = 'admin'/i);
    expect(sql).not.toContain("for all using (exists (select 1 from public.user_roles");
    expect(sql).toContain("(select public.is_admin())");
    expect(sql).toMatch(/revoke all on table[\s\S]*?public\.catalog_products,[\s\S]*?public\.catalog_offers[\s\S]*?from anon, authenticated/i);
    expect(sql).toContain("grant select on table public.catalog_products, public.catalog_offers to anon, authenticated");
  });

  it("keeps public catalog reads limited to eligible rows", () => {
    expect(sql).toMatch(
      /create policy catalog_products_public_read[\s\S]*?to anon, authenticated[\s\S]*?using \([\s\S]*?lifecycle = 'active'[\s\S]*?verified_detail_url = true[\s\S]*?source_identity_verified = true[\s\S]*?exactness in \('exact', 'likely'\)/i
    );
    expect(sql).toMatch(
      /create policy catalog_offers_public_read[\s\S]*?to anon, authenticated[\s\S]*?using \([\s\S]*?verified = true[\s\S]*?verified_detail_url = true[\s\S]*?exactness in \('exact', 'likely'\)/i
    );
  });

  it("makes every catalog write admin or service-role controlled", () => {
    const adminPolicyNames = [
      "catalog_sources_admin_read",
      "catalog_products_admin_write",
      "catalog_source_identities_admin_read",
      "catalog_offers_admin_write",
      "catalog_batches_admin_write",
      "catalog_checkpoints_admin_write",
      "catalog_quarantine_admin_read",
      "catalog_vector_metadata_admin_write",
      "user_roles_admin_write",
    ];

    for (const policyName of adminPolicyNames) {
      const policyStart = sql.indexOf(`create policy ${policyName}`);
      const nextPolicyStart = sql.indexOf("create policy ", policyStart + 1);
      const policy = sql.slice(policyStart, nextPolicyStart < 0 ? undefined : nextPolicyStart);

      expect(policy, `${policyName} should exist`).toContain("to authenticated");
      expect(policy, `${policyName} should use the helper`).toContain("(select public.is_admin())");
      expect(policy, `${policyName} should not query user_roles directly`).not.toContain("from public.user_roles");
    }

    expect(sql).toMatch(/grant all on table[\s\S]*?public\.catalog_sources[\s\S]*?to authenticated/i);
    expect(sql).toContain("to authenticated");
  });

  it("widens post_objects exactness to the canonical state set", () => {
    expect(sql).toContain("drop constraint if exists post_objects_exactness_check");
    expect(sql).toContain("alter column exactness type public.catalog_exactness");
    expect(sql).toMatch(/add constraint post_objects_exactness_check[\s\S]*?exact[\s\S]*?likely[\s\S]*?similar[\s\S]*?review[\s\S]*?unverified/i);
  });

  it("seeds auth placeholders before roles that reference auth.users", () => {
    const authInsert = seed.indexOf("insert into auth.users");
    const roleInsert = seed.indexOf("insert into public.user_roles");

    expect(sql).toContain("user_id uuid primary key references auth.users(id) on delete cascade");
    expect(authInsert).toBeGreaterThanOrEqual(0);
    expect(roleInsert).toBeGreaterThan(authInsert);

    const authSeed = seed.slice(authInsert, roleInsert);
    expect(authSeed).toContain("(id, email, raw_user_meta_data)");
    expect(authSeed).toContain("00000000-0000-0000-0000-000000000001");
    expect(authSeed).toContain("00000000-0000-0000-0000-000000000002");
    expect(authSeed).toContain("@example.test");
    expect(authSeed).not.toMatch(/encrypted_password|password/i);
    expect(seed).toContain("('00000000-0000-0000-0000-000000000002', 'operator')");
    expect(seed).not.toContain("'creator'");
  });
});
