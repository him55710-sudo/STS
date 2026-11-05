"use client";

import dynamic from "next/dynamic";

const AuthProvider = dynamic(() => import("@/components/SupabaseAuthProvider"), { ssr: false });

export function BeautyAuthBoundary({ children }: { readonly children: React.ReactNode }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <>{configured && <AuthProvider>{null}</AuthProvider>}{children}</>;
}
