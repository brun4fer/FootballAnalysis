import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";

type HeaderProps = {
  user: {
    username: string;
    workspaceName: string;
  };
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-[#0a0f1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/icon-192.png"
            alt="AP - Goals Scored"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-lg shadow-emerald-500/30"
            priority
          />
          <div className="text-sm font-semibold tracking-tight md:text-lg">AP - Goals Scored</div>
        </div>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link href="/manage/config" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            Settings
          </Link>
          <Link href="/manage/teams" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            Teams
          </Link>
          <Link href="/manage/players" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            Players
          </Link>
          <Link href="/goals" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            Record Goal
          </Link>
          <Link href="/teams" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            Statistics
          </Link>
          <Link href="/rankings" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            Rankings
          </Link>
          <Link
            href="/account"
            className="ml-2 rounded-lg border border-border/70 px-3 py-1.5 text-right leading-tight hover:bg-white/5"
          >
            <span className="block text-xs font-semibold text-foreground">{user.username}</span>
            <span className="block text-[10px] text-muted-foreground">{user.workspaceName}</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
