import "./globals.css";
import { ReactNode } from "react";
import { QueryProvider } from "@/components/ui/query-provider";
import { AppProvider } from "@/components/ui/app-context";
import { Header } from "@/components/ui/header";
import { Sidebar } from "@/components/ui/sidebar";
import { Space_Grotesk } from "next/font/google";

const font = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body"
});

export const metadata = {
  title: "Football Analysis",
  description: "Análise de golos para equipas técnicas"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" className={font.variable}>
      <body className="bg-background text-foreground">
        <QueryProvider>
          <AppProvider>
            <div className="min-h-screen">
              <Header />
              <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
                <Sidebar />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
