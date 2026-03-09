import { and, eq, inArray } from "drizzle-orm";
import { config } from "dotenv";

type ActionSeed = {
  name: string;
  context: "field" | "field_goal";
};

type SubMomentSeed = {
  name: string;
  actions: ActionSeed[];
};

type MomentSeed = {
  name: string;
  subMoments: SubMomentSeed[];
};

const MOMENT_SEEDS: MomentSeed[] = [
  {
    name: "Organiza\u00e7\u00e3o Ofensiva",
    subMoments: [
      {
        name: "Sa\u00edda do GR",
        actions: [
          { name: "Em organiza\u00e7\u00e3o", context: "field" },
          { name: "Curto para longo", context: "field" },
          { name: "Bola longa", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Constru\u00e7\u00e3o",
        actions: [
          { name: "Liga\u00e7\u00e3o por dentro", context: "field" },
          { name: "Liga\u00e7\u00e3o na largura", context: "field" },
          { name: "Bola longa no corredor central", context: "field" },
          { name: "Bola longa na largura", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Cria\u00e7\u00e3o",
        actions: [
          { name: "Liga\u00e7\u00e3o no corredor central", context: "field" },
          { name: "Liga\u00e7\u00e3o na largura", context: "field" },
          { name: "Bola longa", context: "field" },
          { name: "Profundidade", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Finaliza\u00e7\u00e3o",
        actions: [
          { name: "Cruzamento Direita", context: "field" },
          { name: "Cruzamento Esquerda", context: "field" },
          { name: "Remate de fora da \u00e1rea", context: "field_goal" },
          { name: "Profundidade", context: "field" },
          { name: "Segunda bola", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      }
    ]
  },
  {
    name: "Transi\u00e7\u00e3o Ofensiva",
    subMoments: [
      {
        name: "Recupera\u00e7\u00e3o meio campo defensivo",
        actions: [
          { name: "Cruzamento Direita", context: "field" },
          { name: "Cruzamento Esquerda", context: "field" },
          { name: "Remate Fora de \u00c1rea", context: "field_goal" },
          { name: "Profundidade", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Recupera\u00e7\u00e3o meio campo ofensivo",
        actions: [
          { name: "Cruzamento Direita", context: "field" },
          { name: "Cruzamento Esquerda", context: "field" },
          { name: "Remate Fora de \u00c1rea", context: "field_goal" },
          { name: "Profundidade", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      }
    ]
  },
  {
    name: "Bolas Paradas",
    subMoments: [
      {
        name: "Lan\u00e7amento Lateral",
        actions: [
          { name: "Marcador do lan\u00e7amento", context: "field_goal" },
          { name: "Lan\u00e7amento para a \u00e1rea", context: "field" },
          { name: "Passagem para organiza\u00e7\u00e3o", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Canto",
        actions: [
          { name: "Marcador do canto", context: "field_goal" },
          { name: "Canto aberto", context: "field" },
          { name: "Canto fechado", context: "field" },
          { name: "Canto combinado", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Livre",
        actions: [
          { name: "Marcador da falta", context: "field_goal" },
          { name: "Livre aberto", context: "field" },
          { name: "Livre fechado", context: "field" },
          { name: "Livre combinado", context: "field" },
          { name: "Falta sobre", context: "field" },
          { name: "Momento anterior", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Livre Direto",
        actions: [
          { name: "Marcador da falta", context: "field_goal" },
          { name: "Falta sobre", context: "field" },
          { name: "Momento anterior", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      },
      {
        name: "Pen\u00e1lti",
        actions: [
          { name: "Marcador do pen\u00e1lti", context: "field_goal" },
          { name: "Falta sobre", context: "field" },
          { name: "Momento anterior", context: "field" },
          { name: "Jogador Refer\u00eancia", context: "field" }
        ]
      }
    ]
  }
];

config({ path: ".env.local" });
config();

async function main() {
  const [{ db, pool }, { moments, subMoments, actions }] = await Promise.all([
    import("./index"),
    import("../schema/schema")
  ]);

  const momentNames = MOMENT_SEEDS.map((moment) => moment.name);
  const createdMoments = await db
    .insert(moments)
    .values(momentNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: moments.name })
    .returning({ id: moments.id });

  const momentRows = await db
    .select({ id: moments.id, name: moments.name })
    .from(moments)
    .where(inArray(moments.name, momentNames));

  const momentIdByName = new Map(momentRows.map((row) => [row.name, row.id]));
  for (const momentSeed of MOMENT_SEEDS) {
    if (!momentIdByName.has(momentSeed.name)) {
      throw new Error(`Nao foi possivel encontrar o momento '${momentSeed.name}' apos o seed.`);
    }
  }

  let createdSubMomentsCount = 0;
  let createdActionsCount = 0;

  for (const momentSeed of MOMENT_SEEDS) {
    const momentId = momentIdByName.get(momentSeed.name);
    if (!momentId) {
      throw new Error(`ID em falta para o momento '${momentSeed.name}'.`);
    }

    const subMomentNames = momentSeed.subMoments.map((subMoment) => subMoment.name);
    const insertedSubMoments = await db
      .insert(subMoments)
      .values(subMomentNames.map((name) => ({ momentId, name })))
      .onConflictDoNothing({ target: [subMoments.momentId, subMoments.name] })
      .returning({ id: subMoments.id });
    createdSubMomentsCount += insertedSubMoments.length;

    const subMomentRows = await db
      .select({ id: subMoments.id, name: subMoments.name })
      .from(subMoments)
      .where(and(eq(subMoments.momentId, momentId), inArray(subMoments.name, subMomentNames)));

    const subMomentIdByName = new Map(subMomentRows.map((row) => [row.name, row.id]));

    for (const subMomentSeed of momentSeed.subMoments) {
      const subMomentId = subMomentIdByName.get(subMomentSeed.name);
      if (!subMomentId) {
        throw new Error(`Nao foi possivel encontrar o sub-momento '${subMomentSeed.name}' apos o seed.`);
      }

      const insertedActions = await db
        .insert(actions)
        .values(subMomentSeed.actions.map((action) => ({ subMomentId, name: action.name, context: action.context })))
        .onConflictDoNothing({ target: [actions.subMomentId, actions.name] })
        .returning({ id: actions.id });

      createdActionsCount += insertedActions.length;
    }
  }

  console.log(
    `Seed concluido. Momentos novos: ${createdMoments.length}. Sub-momentos novos: ${createdSubMomentsCount}. Acoes novas: ${createdActionsCount}.`
  );

  await pool.end();
}

main().catch(async (error) => {
  console.error("Erro ao executar seed:", error);

  try {
    const { pool } = await import("./index");
    await pool.end();
  } catch {
    // Ignora erro ao fechar ligacao em falhas iniciais.
  }

  process.exit(1);
});
