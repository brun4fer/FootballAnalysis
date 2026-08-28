import Image from "next/image";
import { redirect } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form action={loginAction} className="glass w-full max-w-sm space-y-5 rounded-2xl p-7">
        <div className="flex items-center gap-3">
          <Image src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl" priority />
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">AP Football</p>
            <h1 className="text-xl font-semibold">Goals Scored</h1>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the account assigned to your workspace. Your data is kept separate from every other client.
          </p>
        </div>
        {searchParams.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            The username or password is incorrect.
          </p>
        )}
        <label className="block space-y-1.5 text-sm">
          <span>Username</span>
          <input name="username" autoComplete="username" maxLength={80} required autoFocus className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" maxLength={256} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
        </label>
        <button className="h-11 w-full rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary/90">
          Sign in
        </button>
      </form>
    </main>
  );
}
