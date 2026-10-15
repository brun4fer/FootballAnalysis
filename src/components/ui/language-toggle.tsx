"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/ui/language-context";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-lg border border-border/70 bg-slate-950/40 p-0.5" aria-label="Language">
      <Languages className="mx-1.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      {(["pt", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase transition ${
            language === option ? "bg-cyan-400/15 text-cyan-100" : "text-muted-foreground hover:text-white"
          }`}
          aria-pressed={language === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
