import { ReactNode } from "react";
import { Header } from "@/components/ui/header";
import { Sidebar } from "@/components/ui/sidebar";
import { AppProvider } from "@/components/ui/app-context";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <AppProvider storageNamespace={user.workspaceSlug}>
      <div className="min-h-screen">
        <Header user={user} />
        <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
