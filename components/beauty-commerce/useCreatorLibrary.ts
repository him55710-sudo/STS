"use client";

import { useCallback, useEffect, useState } from "react";
import { CREATOR_LIBRARY_KEY, creatorRecordSchema, INITIAL_CREATOR_RECORDS, parseCreatorLibrary } from "@/lib/beauty-commerce/tiktok";
import type { CreatorRecord } from "@/lib/beauty-commerce/tiktok";

export function useCreatorLibrary() {
  const [records, setRecords] = useState<readonly CreatorRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try { const raw = window.localStorage.getItem(CREATOR_LIBRARY_KEY); setRecords(raw === null ? INITIAL_CREATOR_RECORDS : parseCreatorLibrary(raw)); }
    catch (error) { if (error instanceof Error) { setStorageAvailable(false); setRecords(INITIAL_CREATOR_RECORDS); } else throw error; }
    setHydrated(true);
    function receive(event: StorageEvent) {
      if (event.key === CREATOR_LIBRARY_KEY || event.key === null) setRecords(parseCreatorLibrary(event.newValue));
    }
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);
  useEffect(() => {
    if (!hydrated || !storageAvailable) return;
    try { window.localStorage.setItem(CREATOR_LIBRARY_KEY, JSON.stringify(records)); }
    catch (error) { if (error instanceof Error) setStorageAvailable(false); else throw error; }
  }, [records, hydrated, storageAvailable]);

  const addRecords = useCallback((incoming: readonly CreatorRecord[]) => {
    setRecords((current) => {
      const merged = new Map(current.map((record) => [record.url, record]));
      for (const record of incoming) {
        if (merged.size < 20 && !merged.has(record.url)) merged.set(record.url, record);
      }
      return [...merged.values()];
    });
  }, []);
  const updateRecord = useCallback((record: CreatorRecord) => {
    const parsed = creatorRecordSchema.safeParse(record);
    if (parsed.success) setRecords((current) => current.map((item) => item.url === record.url ? parsed.data : item));
  }, []);
  const removeRecord = useCallback((url: string) => setRecords((current) => current.filter((record) => record.url !== url)), []);
  const updateMetadata = useCallback((url: string, metadata: { readonly title: string; readonly author: string }) => {
    setRecords((current) => current.map((record) => record.url === url ? {
      ...record,
      title: metadata.title || record.title,
      titleOrigin: metadata.title ? "oembed" : record.titleOrigin,
      author: metadata.author || record.author,
    } : record));
  }, []);
  return { records, hydrated, storageAvailable, addRecords, updateRecord, updateMetadata, removeRecord };
}
