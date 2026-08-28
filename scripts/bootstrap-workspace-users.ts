import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const accountDefinitions = [
  { name: "Paulo", slug: "paulo", username: "Paulo", password: process.env.BOOTSTRAP_PAULO_PASSWORD },
  { name: "Simao", slug: "simao", username: "Simao", password: process.env.BOOTSTRAP_SIMAO_PASSWORD }
] as const;

async function main() {
  if (accountDefinitions.some((account) => !account.password)) {
    throw new Error(
      "Set BOOTSTRAP_PAULO_PASSWORD and BOOTSTRAP_SIMAO_PASSWORD only for this command. Do not commit them."
    );
  }

  const [{ db, pool }, { users, workspaces }, { hashPassword }] = await Promise.all([
    import("@/db"),
    import("@/schema"),
    import("@/lib/password")
  ]);

  try {
    await db.transaction(async (tx) => {
      for (const account of accountDefinitions) {
        const workspaceRows = await tx
          .insert(workspaces)
          .values({ name: account.name, slug: account.slug })
          .onConflictDoUpdate({ target: workspaces.slug, set: { name: account.name } })
          .returning({ id: workspaces.id });

        const workspaceId = workspaceRows[0]?.id;
        if (!workspaceId) throw new Error(`Could not prepare workspace ${account.slug}.`);

        const existing = await tx
          .select({ id: users.id, workspaceId: users.workspaceId })
          .from(users)
          .where(sql`lower(${users.username}) = lower(${account.username})`)
          .limit(1);

        if (existing[0]) {
          if (existing[0].workspaceId !== workspaceId) {
            throw new Error(`Username ${account.username} already belongs to another workspace.`);
          }
          console.log(`Account ${account.username} already exists; password was not changed.`);
          continue;
        }

        await tx.insert(users).values({
          username: account.username,
          passwordHash: await hashPassword(account.password!),
          workspaceId,
          mustChangePassword: true
        });
        console.log(`Account ${account.username} created with mandatory password change.`);
      }
    });
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
