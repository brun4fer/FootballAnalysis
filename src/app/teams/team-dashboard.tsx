"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleBar, SimplePie } from "@/components/ui/charts";

type Team = { id: number; name: string };

const zoneShapes = [
  { key: "Upper Left", points: "5,5 33,5 33,50 5,50" },
  { key: "Upper Center", points: "33,5 66,5 66,50 33,50" },
  { key: "Upper Right", points: "66,5 95,5 95,50 66,50" },
  { key: "Lower Left", points: "5,50 33,50 33,95 5,95" },
  { key: "Lower Center", points: "33,50 66,50 66,95 33,95" },
  { key: "Lower Right", points: "66,50 95,50 95,95 66,95" }
];

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

function StatTile({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card className="bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-emerald-900/20">
      <CardHeader title={title} />
      <CardContent className="space-y-1">
        <div className="text-3xl font-semibold text-white">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function GoalNetHeatmap({ data }: { data: Array<{ name: string; goals: number }> }) {
  const total = data.reduce((sum, z) => sum + z.goals, 0);
  const zoneMap = new Map(data.map((z) => [z.name.toLowerCase(), z.goals]));

  const intensity = (name: string) => {
    const goals = zoneMap.get(name.toLowerCase()) ?? 0;
    if (total === 0) return 0;
    return goals / total;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0c1322] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.09),transparent_28%)]" />
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full" preserveAspectRatio="xMidYMid meet">
          <rect x="2" y="2" width="96" height="96" rx="6" fill="rgba(15,23,42,0.8)" stroke="#1f2937" strokeWidth="1.4" />
          {zoneShapes.map((shape) => {
            const ratio = intensity(shape.key);
            const fill = `rgba(103,232,249,${0.15 + ratio * 0.6})`;
            const stroke = ratio > 0 ? "#67e8f9" : "rgba(148,163,184,0.35)";
            return (
              <polygon key={shape.key} points={shape.points} fill={fill} stroke={stroke} strokeWidth={1.6} />
            );
          })}
          <path d="M2 50h96M33 2v96M66 2v96" stroke="rgba(148,163,184,0.25)" strokeWidth="0.8" />
          {zoneShapes.map((shape) => {
            const goals = zoneMap.get(shape.key.toLowerCase()) ?? 0;
            return (
              <text
                key={`${shape.key}-label`}
                x={shape.points.split(" ")[1].split(",")[0]}
                y={shape.points.split(" ")[1].split(",")[1]}
                dx="4"
                dy="12"
                fontSize="7"
                fill="#e2e8f0"
              >
                {goals}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {zoneShapes.map((shape) => {
          const goals = zoneMap.get(shape.key.toLowerCase()) ?? 0;
          return (
            <Badge key={`${shape.key}-badge`} className="bg-white/5 text-white/80">
              {shape.key}: {goals}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

export function TeamDashboard({ initialTeams }: { initialTeams: Team[] }) {
  const [teamId, setTeamId] = useState<number | undefined>(initialTeams[0]?.id);

  if (initialTeams.length === 0) {
    return <div className="text-sm text-muted-foreground">Ainda não existem equipas na base de dados. Adiciona uma equipa para veres estatísticas.</div>;
  }

  const goalsQuery = useQuery({
    queryKey: ["goals", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<any[]>(`/api/goals?teamId=${teamId}`)
  });

  const topScorersQuery = useQuery({
    queryKey: ["top-scorers", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ id: number; name: string; goals: number; assists: number }>>(`/api/stats/top-scorers?teamId=${teamId}`)
  });

  const involvementQuery = useQuery({
    queryKey: ["involvement", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ id: number; name: string; involvement: number }>>(`/api/stats/involvement?teamId=${teamId}`)
  });

  const zoneQuery = useQuery({
    queryKey: ["zones", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ name: string; goals: number }>>(`/api/stats/zones?teamId=${teamId}`)
  });

  const momentsQuery = useQuery({
    queryKey: ["moments", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ moment: string; goals: number }>>(`/api/stats/moments?teamId=${teamId}`)
  });

  const actionsQuery = useQuery({
    queryKey: ["actions", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ action: string; goals: number }>>(`/api/stats/actions?teamId=${teamId}`)
  });

  const penaltiesQuery = useQuery({
    queryKey: ["penalties", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ zone: string; goals: number }>>(`/api/stats/penalties-by-zone?teamId=${teamId}`)
  });

  const totalGoals = zoneQuery.data?.reduce((sum, row) => sum + row.goals, 0) ?? 0;
  const penaltyGoals = penaltiesQuery.data?.reduce((sum, row) => sum + row.goals, 0) ?? 0;
  const openPlayGoals = totalGoals - penaltyGoals;
  const topScorer = topScorersQuery.data?.[0];
  const mostInvolved = involvementQuery.data?.[0];

  const refreshAll = () => {
    goalsQuery.refetch();
    zoneQuery.refetch();
    topScorersQuery.refetch();
    involvementQuery.refetch();
    momentsQuery.refetch();
    actionsQuery.refetch();
    penaltiesQuery.refetch();
  };

  const goalEvents = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Análises da Equipa</h1>
          <p className="text-sm text-muted-foreground">Cálculos em tempo real diretamente de PostgreSQL + Drizzle.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={teamId?.toString()} onChange={(e) => setTeamId(Number(e.target.value) || undefined)} className="w-52">
            {initialTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={refreshAll}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile title="Total de Golos" value={totalGoals} hint={`${goalEvents.length} registos de golo`} />
        <StatTile title="Bola Corrida" value={openPlayGoals} hint={`${penaltyGoals} de penálti`} />
        <StatTile title="Melhor Marcador" value={topScorer ? topScorer.name : "—"} hint={topScorer ? `${topScorer.goals} G / ${topScorer.assists} A` : "Sem golos"} />
        <StatTile title="Mais Interveniente" value={mostInvolved ? mostInvolved.name : "—"} hint={mostInvolved ? `${mostInvolved.involvement} participações` : "A aguardar dados"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mapa da Baliza" description="Distribuição por zona da baliza" />
          <CardContent>{zoneQuery.data ? <GoalNetHeatmap data={zoneQuery.data} /> : <div className="text-sm text-muted-foreground">Sem dados</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader title="Distribuição por Zona" />
          <CardContent>
            {zoneQuery.data ? <SimpleBar data={zoneQuery.data} xKey="name" yKey="goals" /> : <div className="text-sm text-muted-foreground">Sem dados</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Momentos do Golo" />
          <CardContent>
            {momentsQuery.data ? <SimpleBar data={momentsQuery.data} xKey="moment" yKey="goals" /> : <div className="text-sm text-muted-foreground">Sem dados</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Ações do Golo" />
          <CardContent>
            {actionsQuery.data ? <SimpleBar data={actionsQuery.data} xKey="action" yKey="goals" /> : <div className="text-sm text-muted-foreground">Sem dados</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Melhores Marcadores" />
          <CardContent className="space-y-3">
            {topScorersQuery.data && topScorersQuery.data.length > 0 ? (
              topScorersQuery.data.map((row, idx) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium">{row.name}</span>
                  </div>
                  <Badge>
                    {row.goals} G / {row.assists} A
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Ainda sem golos.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Mais Intervenientes" />
          <CardContent className="space-y-3">
            {involvementQuery.data && involvementQuery.data.length > 0 ? (
              involvementQuery.data.map((row, idx) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium">{row.name}</span>
                  </div>
                  <Badge>{row.involvement === "assist" ? "assistência" : row.involvement}</Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Sem participações registadas.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Penáltis por Zona" />
          <CardContent>
            {penaltiesQuery.data && penaltiesQuery.data.length > 0 ? (
              <SimplePie data={penaltiesQuery.data} labelKey="zone" valueKey="goals" />
            ) : (
              <div className="text-sm text-muted-foreground">Sem penáltis.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Golos Recentes" description="Últimos eventos capturados" />
          <CardContent className="space-y-2 text-sm">
            {goalEvents.length > 0 ? (
              goalEvents.slice(0, 6).map((g: any) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
                  <span className="text-muted-foreground">{g.minute}'</span>
                  <span className="font-medium">#{g.id}</span>
                  <Badge className="bg-cyan-500/10 text-cyan-100">Zona {g.goalZoneId}</Badge>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Ainda sem eventos.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
