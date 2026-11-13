"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function PlayerPhoto({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    const initials = (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    return (
      <span className={cn("inline-flex items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-white", className)}>
        {initials || "?"}
      </span>
    );
  }

  return (
    // Player photos can include legacy public URLs from before the current Blob setup.
    // A plain image keeps those URLs working and falls back cleanly if a source is gone.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name || "Player"} className={cn("rounded-full object-cover", className)} onError={() => setFailed(true)} />
  );
}
