require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const seeds = [
  {
    name: "Organizacao Ofensiva",
    sub: [
      {
        name: "Saida do GR",
        actions: [
          { name: "Curto para longo", context: "field" },
          { name: "Ligacao por dentro", context: "field" },
          { name: "Ligacao por fora", context: "field" }
        ]
      },
      {
        name: "Construcao",
        actions: [
          { name: "Atrair pressao / 3o homem", context: "field" },
          { name: "Mudanca corredor", context: "field" },
          { name: "Passe vertical", context: "field" }
        ]
      },
      {
        name: "Criacao",
        actions: [
          { name: "Ligacao por dentro", context: "field" },
          { name: "Ligacao por fora", context: "field" },
          { name: "Terceiro homem", context: "field" }
        ]
      },
      {
        name: "Finalizacao",
        actions: [
          { name: "Cruzamento", context: "field_goal" },
          { name: "Remate exterior", context: "field_goal" },
          { name: "Segunda bola", context: "field_goal" }
        ]
      }
    ]
  },
  {
    name: "Transicao Ofensiva",
    sub: [
      {
        name: "Recuperacao meio campo defensivo",
        actions: [
          { name: "Primeiro passe", context: "field" },
          { name: "Jogadores referencia", context: "field" },
          { name: "Espacos que atacam", context: "field" }
        ]
      },
      {
        name: "Recuperacao meio campo ofensivo",
        actions: [
          { name: "Primeiro passe", context: "field" },
          { name: "Ataque rapido", context: "field_goal" },
          { name: "Finalizacao imediata", context: "field_goal" }
        ]
      }
    ]
  },
  {
    name: "Bola Parada Ofensiva",
    sub: [
      {
        name: "Penalty",
        actions: [{ name: "Penalty direto", context: "field_goal" }]
      },
      {
        name: "Livre",
        actions: [
          { name: "Livre aberto", context: "field_goal" },
          { name: "Livre fechado", context: "field_goal" },
          { name: "Livre combinado", context: "field_goal" }
        ]
      },
      {
        name: "Canto",
        actions: [
          { name: "Canto aberto", context: "field_goal" },
          { name: "Canto fechado", context: "field_goal" },
          { name: "Canto combinado", context: "field_goal" }
        ]
      },
      {
        name: "Livre Direto",
        actions: [
          { name: "Remate direto", context: "field_goal" },
          { name: "Rebote/segunda bola", context: "field_goal" }
        ]
      },
      {
        name: "Lancamento Lateral",
        actions: [
          { name: "Lancamento curto", context: "field" },
          { name: "Lancamento longo", context: "field_goal" },
          { name: "Combinado lancamento", context: "field_goal" }
        ]
      }
    ]
  }
];

async function upsertMoment(name) {
  const { rows } = await pool.query(
    "INSERT INTO moments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
    [name]
  );
  return rows[0].id;
}

async function upsertSub(momentId, name) {
  const { rows } = await pool.query(
    "INSERT INTO sub_moments (moment_id, name) VALUES ($1,$2) ON CONFLICT (moment_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
    [momentId, name]
  );
  return rows[0].id;
}

async function upsertAction(subId, name, context) {
  const { rows } = await pool.query(
    "INSERT INTO actions (sub_moment_id, name, context) VALUES ($1,$2,$3) ON CONFLICT (sub_moment_id, name) DO UPDATE SET context = EXCLUDED.context RETURNING id",
    [subId, name, context]
  );
  return rows[0].id;
}

async function main() {
  for (const m of seeds) {
    const momentId = await upsertMoment(m.name);
    for (const s of m.sub) {
      const subId = await upsertSub(momentId, s.name);
      for (const a of s.actions) {
        await upsertAction(subId, a.name, a.context);
      }
    }
  }
}

main()
  .then(() => {
    console.log("Seed completed");
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
