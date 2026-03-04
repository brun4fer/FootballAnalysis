import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  if (process.env.RESET_MOMENTS_CONFIRM !== "YES") {
    throw new Error("Define RESET_MOMENTS_CONFIRM=YES para confirmar a limpeza.");
  }

  const [{ db, pool }, { goalActions, goalInvolvements, goals, actions, subMoments, moments }] = await Promise.all([
    import("./index"),
    import("../schema/schema")
  ]);

  await db.transaction(async (tx) => {
    await tx.delete(goalActions);
    await tx.delete(goalInvolvements);
    await tx.delete(goals);
    await tx.delete(actions);
    await tx.delete(subMoments);
    await tx.delete(moments);
  });

  console.log("Limpeza concluida: goals + taxonomy (moments/sub_moments/actions) removidos.");
  await pool.end();
}

main().catch(async (error) => {
  console.error("Erro ao limpar taxonomy:", error);

  try {
    const { pool } = await import("./index");
    await pool.end();
  } catch {
    // ignora
  }

  process.exit(1);
});
