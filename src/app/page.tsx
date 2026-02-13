import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-[#0f1729] via-[#0a0f1a] to-[#0f1729] px-8 py-10 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Análises profissionais</p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
              Inteligência tática, construída sobre dados de eventos em tempo real.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Regista golos com contexto estruturado, gere plantéis e obtém insights de alto valor sem depender de estatísticas pré-computadas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-emerald-500/20 text-emerald-200">UI Dark Ops</Badge>
              <Badge className="bg-cyan-500/20 text-cyan-100">Agregação em tempo real</Badge>
              <Badge className="bg-white/10 text-white/80">PostgreSQL / Drizzle</Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/goals">
              <Button size="lg">Registar Golo</Button>
            </Link>
            <Link href="/teams">
              <Button variant="secondary" size="lg">
                Estatísticas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Wizard de Golo" description="Fluxo guiado para registar eventos de forma consistente" />
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Equipa → marcador → participações → contexto tático → zona da baliza com validação em tempo real.</p>
            <Link href="/goals">
              <Button size="sm" className="mt-2">
                Abrir Wizard
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Plantéis" description="Gerir equipas e jogadores da Liga Portugal 2" />
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Clubes pré-carregados, entrada rápida de jogadores e pipelines de estatísticas prontos a usar.</p>
            <div className="flex gap-2">
              <Link href="/manage/teams">
                <Button variant="secondary" size="sm">
                  Equipas
                </Button>
              </Link>
              <Link href="/manage/players">
                <Button variant="ghost" size="sm">
                  Jogadores
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
