import Image from "next/image";
import { logoutAction, updateCredentialsAction } from "@/actions/auth";
import { requireUser } from "@/lib/auth";
import { MediaLibraryLinkPanel } from "@/components/media-library-link-panel";

const errorMessages: Record<string, string> = {
  username: "The username must contain 3 to 40 letters, numbers or the characters . _ -",
  password: "The new password must contain at least 10 characters and both entries must match.",
  current: "The current password is incorrect.",
  taken: "That username is already being used by another account."
};

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await requireUser({ allowPasswordChange: true });

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <Image src="/icon-192.png" alt="" width={44} height={44} className="rounded-xl" priority />
          <div>
            <h1 className="text-2xl font-semibold">Account security</h1>
            <p className="text-sm text-muted-foreground">Workspace: {user.workspaceName}</p>
          </div>
        </div>
        {user.mustChangePassword && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="font-semibold text-amber-100">Change your temporary password</p>
            <p className="mt-1 text-sm text-amber-100/80">
              For security, you must choose a private password before accessing the software. This only happens on your first sign-in.
            </p>
          </div>
        )}
        {searchParams.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {errorMessages[searchParams.error] ?? "The account could not be updated."}
          </p>
        )}
        <form action={updateCredentialsAction} className="glass space-y-4 rounded-2xl p-6">
          <label className="block space-y-1.5 text-sm">
            <span>Username</span>
            <input name="username" defaultValue={user.username} minLength={3} maxLength={40} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span>Current password</span>
            <input name="currentPassword" type="password" autoComplete="current-password" maxLength={256} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span>New password</span>
            <input name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={256} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span>Confirm new password</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={256} required className="h-11 w-full rounded-lg border border-input bg-background/80 px-3" />
          </label>
          <button className="h-11 w-full rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary/90">
            Save and continue
          </button>
        </form>
        {!user.mustChangePassword && <MediaLibraryLinkPanel />}
        <form action={logoutAction} className="text-center">
          <button className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Sign out and use another account
          </button>
        </form>
      </div>
    </main>
  );
}
