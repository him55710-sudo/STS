"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_BEAUTY_PROFILE, parsePersonalProfile } from "@/lib/beauty-commerce/fit";
import type { PersonalBeautyProfile } from "@/lib/beauty-commerce/fit";

const KEY = "sts-personal-beauty-v1";
type ProfileContext = {
  readonly profile: PersonalBeautyProfile;
  readonly updateProfile: (patch: Partial<PersonalBeautyProfile>) => void;
  readonly storageAvailable: boolean;
};
const Context = createContext<ProfileContext | null>(null);

export function PersonalBeautyProvider({ children }: { readonly children: ReactNode }) {
  const [profile, setProfile] = useState(DEFAULT_BEAUTY_PROFILE);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try { setProfile(parsePersonalProfile(localStorage.getItem(KEY))); }
    catch (error) { if (!(error instanceof Error)) throw error; setStorageAvailable(false); }
    setReady(true);
    const receive = (event: StorageEvent) => { if (event.key === KEY || event.key === null) setProfile(parsePersonalProfile(event.newValue)); };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);
  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try { localStorage.setItem(KEY, JSON.stringify(profile)); }
    catch (error) { if (!(error instanceof Error)) throw error; setStorageAvailable(false); }
  }, [profile, ready, storageAvailable]);
  const value = useMemo(() => ({ profile, storageAvailable, updateProfile: (patch: Partial<PersonalBeautyProfile>) => setProfile((current) => ({ ...current, ...patch })) }), [profile, storageAvailable]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

class MissingPersonalBeautyProviderError extends Error {
  constructor() { super("Personal beauty comparisons require their provider."); this.name = "MissingPersonalBeautyProviderError"; }
}
export function usePersonalBeauty() {
  const value = useContext(Context);
  if (!value) throw new MissingPersonalBeautyProviderError();
  return value;
}
