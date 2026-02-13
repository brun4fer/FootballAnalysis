"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Selection = {
  seasonId?: number;
  seasonName?: string;
  championshipId?: number;
  championshipName?: string;
  championshipLogo?: string | null;
};

type AppContextValue = {
  selection: Selection;
  setSelection: (sel: Selection) => void;
  updatePartial: (partial: Partial<Selection>) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_KEY = "fa.selection";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelectionState] = useState<Selection>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Selection) : {};
    } catch {
      return {};
    }
  });

  const setSelection = (sel: Selection) => {
    setSelectionState(sel);
  };

  const updatePartial = (partial: Partial<Selection>) => {
    setSelectionState((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      /* ignore */
    }
  }, [selection]);

  const value = useMemo(() => ({ selection, setSelection, updatePartial }), [selection]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
