"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Selection = {
  seasonId?: number;
  seasonName?: string;
  championshipId?: number;
  championshipName?: string;
  championshipLogo?: string | null;
  teamId?: number;
};

type AppContextValue = {
  selection: Selection;
  setSelection: (sel: Selection) => void;
  updatePartial: (partial: Partial<Selection>) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({
  children,
  storageNamespace = "default"
}: {
  children: React.ReactNode;
  storageNamespace?: string;
}) {
  const storageKey = `fa.selection.${storageNamespace}`;
  // Start empty on both server and client to keep SSR/CSR markup aligned; then hydrate from localStorage.
  const [selection, setSelectionState] = useState<Selection>({});
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);

  const setSelection = (sel: Selection) => {
    setSelectionState(sel);
  };

  const updatePartial = (partial: Partial<Selection>) => {
    setSelectionState((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setSelectionState(JSON.parse(raw) as Selection);
      } else {
        setSelectionState({});
      }
    } catch {
      setSelectionState({});
    } finally {
      setHydratedStorageKey(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || hydratedStorageKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(selection));
    } catch {
      /* ignore */
    }
  }, [hydratedStorageKey, selection, storageKey]);

  const value = useMemo(() => ({ selection, setSelection, updatePartial }), [selection]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
