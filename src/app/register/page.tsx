import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  workspace: "Enter a workspace or club name containing 2 to 120 characters.",
  username: "The username must contain 3 to 40 letters, numbers or the characters . _ -",
  password: "The password must contain at least 10 characters and both entries must match.",
  taken: "That username is already registered. Choose another one.",
  setup: "The database update is still pending. Please contact the administrator and try again shortly."
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: { error?: string } }) {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form action={registerAction} className="glass w-full max-w-md space-y-5 rounded-2xl p-7">
        <div className="flex items-center gap-3">
          <Image src="/icon-192.png" alt="" width={48} height={48} className="rounded-xl" priority />
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">AP Football</p>
            <h1 className="text-xl font-semibold">Create account</h1>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Your private workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registration creates a separate workspace. Only this account can access the data saved inside it.
          </p>
        </div>
        {searchParams.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {errorMessages[searchParams.error] ?? "The account could not be created."}
          </p>
        )}
        <label className="block space-y-1.5 text-sm">
          <span>Workspace or club name</span>
          <input name="workspaceName" minLength={2} maxLength={120} required autoFocus className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Username</span>
          <input name="username" autoComplete="username" minLength={3} maxLength={40} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={256} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Confirm password</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={256} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
        </label>
        <button className="h-11 w-full rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary/90">
          Create private workspace
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
