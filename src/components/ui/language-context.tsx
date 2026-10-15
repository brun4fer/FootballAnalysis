"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translate, type AppLanguage } from "@/lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = "fa.language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      setLanguageState(saved === "pt" ? "pt" : "en");
    } catch {
      setLanguageState("en");
    } finally {
      setHydrated(true);
    }
  }, []);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      /* ignore storage restrictions */
    }
    document.documentElement.lang = language === "pt" ? "pt-PT" : "en-GB";
  }, [hydrated, language]);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key: string) => translate(key, language) }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
