import "./globals.css";
import { ReactNode } from "react";
import { QueryProvider } from "@/components/ui/query-provider";

export const metadata = {
  title: "Football Analysis",
  description: "Goal analytics for professional staff"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <QueryProvider>
          <div className="min-h-screen">
            <header className="border-b border-border bg-card/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="font-semibold text-lg">Football Analysis</div>
              <nav className="flex gap-4 text-sm text-muted-foreground">
                <a href="/goals" className="hover:text-foreground">Capture Goal</a>
                <a href="/teams" className="hover:text-foreground">Team Stats</a>
              </nav>
            </header>
            <main className="p-6 max-w-6xl mx-auto">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

