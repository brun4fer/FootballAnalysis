import "./globals.css";
import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/ui/query-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Space_Grotesk } from "next/font/google";

const font = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body"
});

export const metadata: Metadata = {
  applicationName: "AP - Goals Scored",
  title: {
    default: "AP - Goals Scored",
    template: "%s | AP - Goals Scored"
  },
  description: "Goalscoring and tactical analysis platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "AP - Goals Scored",
    statusBarStyle: "default"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={font.variable}>
      <body className="bg-background text-foreground">
        <ServiceWorkerRegister />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
