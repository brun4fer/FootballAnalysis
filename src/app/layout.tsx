import "./globals.css";
import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/ui/query-provider";
import { AppProvider } from "@/components/ui/app-context";
import { Header } from "@/components/ui/header";
import { Sidebar } from "@/components/ui/sidebar";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Space_Grotesk } from "next/font/google";

const font = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Football Analysis",
  description: "Análise de golos para equipas técnicas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Football Analysis",
    statusBarStyle: "default"
  },
  icons: {
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" className={font.variable}>
      <body className="bg-background text-foreground">
        <ServiceWorkerRegister />
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

