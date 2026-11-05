"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";
import { getLook, getProduct } from "./catalog";
import type { Locale } from "./types";

const STORAGE_KEY = "sts-beauty-v1";
const idSchema = z.string().min(1).max(120);
const preferencesSchema = z.strictObject({
  locale: z.enum(["en", "vi", "ko"]),
  localeVersion: z.literal(2).optional(),
  savedLookIds: z.array(idSchema).max(500),
  savedProductIds: z.array(idSchema).max(500),
  selectedShades: z.record(idSchema, z.string().min(1).max(120)).default({}),
});

type BeautyPreferences = {
  readonly locale: Locale;
  readonly localeVersion: 2;
  readonly savedLookIds: readonly string[];
  readonly savedProductIds: readonly string[];
  readonly selectedShades: Readonly<Record<string, string>>;
};

const INITIAL_PREFERENCES: BeautyPreferences = {
  locale: "en", localeVersion: 2, savedLookIds: [], savedProductIds: [], selectedShades: {},
};

function isValidShade(productId: string, shadeName: string): boolean {
  return getProduct(productId)?.shades.some((shade) => shade.name === shadeName) === true;
}

export function parseBeautyPreferences(raw: string | null): BeautyPreferences {
  if (raw === null) return INITIAL_PREFERENCES;
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return INITIAL_PREFERENCES;
    throw error;
  }
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return INITIAL_PREFERENCES;
  return {
    locale: parsed.data.localeVersion === 2 ? parsed.data.locale : "en",
    localeVersion: 2,
    savedLookIds: [...new Set(parsed.data.savedLookIds)].filter((id) => getLook(id) !== undefined),
    savedProductIds: [...new Set(parsed.data.savedProductIds)].filter((id) => getProduct(id) !== undefined),
    selectedShades: Object.fromEntries(Object.entries(parsed.data.selectedShades).filter(([id, name]) => isValidShade(id, name))),
  };
}

type BeautyCommerceContextValue = BeautyPreferences & {
  readonly hydrated: boolean;
  readonly storageAvailable: boolean;
  readonly setLocale: (locale: Locale) => void;
  readonly toggleLook: (id: string) => void;
  readonly toggleProduct: (id: string) => void;
  readonly selectShade: (productId: string, shadeName: string) => void;
};

const BeautyCommerceContext = createContext<BeautyCommerceContextValue | null>(null);

function toggled(ids: readonly string[], id: string): readonly string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

export function BeautyCommerceProvider({ children }: { readonly children: ReactNode }) {
  const [preferences, setPreferences] = useState<BeautyPreferences>(INITIAL_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      setPreferences(parseBeautyPreferences(window.localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setStorageAvailable(false);
    }
    setHydrated(true);
    function receiveStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        setPreferences(parseBeautyPreferences(event.newValue));
      }
    }
    window.addEventListener("storage", receiveStorage);
    return () => window.removeEventListener("storage", receiveStorage);
  }, []);

  useEffect(() => {
    if (!hydrated || !storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setStorageAvailable(false);
    }
  }, [preferences, hydrated, storageAvailable]);

  const setLocale = useCallback((locale: Locale) => {
    setPreferences((current) => ({ ...current, locale }));
  }, []);
  const toggleLook = useCallback((id: string) => {
    if (!getLook(id)) return;
    setPreferences((current) => ({ ...current, savedLookIds: toggled(current.savedLookIds, id) }));
  }, []);
  const toggleProduct = useCallback((id: string) => {
    if (!getProduct(id)) return;
    setPreferences((current) => ({ ...current, savedProductIds: toggled(current.savedProductIds, id) }));
  }, []);
  const selectShade = useCallback((productId: string, shadeName: string) => {
    if (!isValidShade(productId, shadeName)) return;
    setPreferences((current) => ({ ...current, selectedShades: { ...current.selectedShades, [productId]: shadeName } }));
  }, []);
  const contextValue = useMemo<BeautyCommerceContextValue>(() => ({
    ...preferences, hydrated, storageAvailable, setLocale, toggleLook, toggleProduct, selectShade,
  }), [preferences, hydrated, storageAvailable, setLocale, toggleLook, toggleProduct, selectShade]);

  return (
    <BeautyCommerceContext.Provider value={contextValue}>
      {children}
    </BeautyCommerceContext.Provider>
  );
}

class MissingBeautyCommerceProviderError extends Error {
  constructor() {
    super("Beauty commerce components require BeautyCommerceProvider.");
    this.name = "MissingBeautyCommerceProviderError";
  }
}

export function useBeautyCommerce(): BeautyCommerceContextValue {
  const context = useContext(BeautyCommerceContext);
  if (context === null) throw new MissingBeautyCommerceProviderError();
  return context;
}
