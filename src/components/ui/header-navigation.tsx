"use client";

import Link from "next/link";
import { useLanguage } from "@/components/ui/language-context";

const links = [
  ["/manage/config", "Settings"],
  ["/manage/teams", "Teams"],
  ["/manage/players", "Players"],
  ["/goals", "Record Goal"],
  ["/teams", "Statistics"],
  ["/rankings", "Rankings"],
  ["/reports", "Reports"]
] as const;

export function HeaderNavigation() {
  const { t } = useLanguage();

  return links.map(([href, label]) => (
    <Link key={href} href={href} className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
      {t(label)}
    </Link>
  ));
}
