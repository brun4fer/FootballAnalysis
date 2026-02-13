"use client";

import { useAppContext } from "./app-context";

export function Header() {
  const { selection } = useAppContext();
  const subtitle =
    selection.championshipName && selection.seasonName
      ? `${selection.championshipName} (${selection.seasonName})`
      : "";

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-[#0a0f1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400/70 to-emerald-500/70 shadow-lg shadow-emerald-500/30" />
          <div>
            <div className="text-lg font-semibold tracking-tight">Football Analysis{subtitle ? " - " + subtitle : ""}</div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{subtitle || " "}</div>
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm font-medium">
          <a href="/manage/teams" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
            Equipas
          </a>
          <a href="/manage/players" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
            Jogadores
          </a>
          <a href="/manage/config" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
            Configurações
          </a>
          <a href="/goals" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
            Registar Golo
          </a>
          <a href="/teams" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
            Estatísticas
          </a>
        </nav>
      </div>
    </header>
  );
}
