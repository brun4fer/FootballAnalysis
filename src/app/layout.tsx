import "./globals.css";
import { ReactNode } from "react";
import { QueryProvider } from "@/components/ui/query-provider";
import { Space_Grotesk } from "next/font/google";

const font = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body"
});

export const metadata = {
  title: "Football Analysis",
  description: "Goal analytics for professional staff"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="bg-background text-foreground">
        <QueryProvider>
          <div className="min-h-screen">
            <header className="sticky top-0 z-20 border-b border-border/60 bg-[#0a0f1a]/80 backdrop-blur-xl">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400/70 to-emerald-500/70 shadow-lg shadow-emerald-500/30" />
                  <div>
                    <div className="text-lg font-semibold tracking-tight">Football Analysis</div>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Liga Portugal 2</div>
                  </div>
                </div>
                <nav className="flex items-center gap-3 text-sm font-medium">
                  <a href="/manage/teams" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
                    Teams
                  </a>
                  <a href="/manage/players" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
                    Players
                  </a>
                  <a href="/goals" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
                    Capture Goal
                  </a>
                  <a href="/teams" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
                    Team Stats
                  </a>
                </nav>
              </div>
            </header>
            <main className="p-6 max-w-6xl mx-auto">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
