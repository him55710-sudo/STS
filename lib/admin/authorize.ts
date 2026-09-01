import "server-only";

import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "../supabase/server";

export type AdminAuthorizationMode = "local" | "production";

export type AdminAuthorizationResult =
  | { readonly ok: true; readonly mode: AdminAuthorizationMode; readonly userId: string | null }
  | {
      readonly ok: false;
      readonly mode: AdminAuthorizationMode;
      readonly status: 401 | 403 | 503;
      readonly reason: "missing-local-token" | "missing-session" | "missing-admin-role" | "missing-config";
    };

export type AdminAuthorizationOptions = {
  readonly localAdminToken?: string;
  readonly production: boolean;
};

export async function authorizeAdminRequest(
  request: NextRequest,
  options: AdminAuthorizationOptions
): Promise<AdminAuthorizationResult> {
  if (!options.production) {
    const localAdminToken = options.localAdminToken?.trim();
    if (!localAdminToken) {
      return { ok: false, mode: "local", status: 503, reason: "missing-config" };
    }

    const requestToken = request.headers.get("x-sts-admin-token")?.trim() ?? "";
    if (requestToken.length === 0 || requestToken !== localAdminToken) {
      return { ok: false, mode: "local", status: 401, reason: "missing-local-token" };
    }

    return { ok: true, mode: "local", userId: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, mode: "production", status: 401, reason: "missing-session" };
  }

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: false, mode: "production", status: 403, reason: "missing-admin-role" };
  }

  return { ok: true, mode: "production", userId: user.id };
}
