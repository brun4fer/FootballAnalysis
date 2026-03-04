"use client";

import Link from "next/link";
import { BarChart3, Trophy, Home, Users } from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const items: NavItem[] = [
  { href: "/teams", label: "Estatísticas", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/goals", label: "Registar Golo", icon: <Trophy className="h-4 w-4" /> },
  { href: "/rankings", label: "Rankings", icon: <Trophy className="h-4 w-4" /> },
  { href: "/manage/teams", label: "Equipas", icon: <Users className="h-4 w-4" /> }
];

export function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 space-y-2 rounded-xl border border-border/60 bg-[#0c1527]/60 p-3 md:block">
      <div className="flex items-center gap-2 px-2 text-sm font-semibold text-muted-foreground">
        <Home className="h-4 w-4" />
        Navegação
      </div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-white"
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </aside>
  );
}
