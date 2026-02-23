"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleBar, SimplePie } from "@/components/ui/charts";
import { FileText, PlayCircle, X, Eye } from "lucide-react";
import { useAppContext } from "@/components/ui/app-context";
import { GoalWizard } from "../goals/goal-wizard";

type Team = { id: number; name: string; championshipId?: number | null; radiographyPdfUrl?: string | null; videoReportUrl?: string | null; emblemPath?: string | null };
type Season = { id: number; name: string };
type Championship = { id: number; name: string; seasonId: number };
type GoalEvent = {
  id: number;
  minute: number;
  scorerId: number;
  scorerName?: string | null;
  opponentTeamId?: number | null;
  opponentName?: string | null;
  goalCoordinates?: { x: number; y: number } | null;
  fieldDrawing?: { x: number; y: number } | null;
  action?: string;
};

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

function GoalNetPinMap({ goals }: { goals: GoalEvent[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0c1322] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.09),transparent_28%)]" />
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox="0 0 120 80"
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setTooltip(null)}
        >
          <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b1220" stroke="#1f2937" strokeWidth="1.4" />
          <rect x="8" y="10" width="104" height="60" rx="5" fill="url(#netPattern)" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 3" />
          <path d="M8 22h104M8 36h104M8 50h104M8 64h104" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />
          <path d="M26 10v60M46 10v60M66 10v60M86 10v60" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />
          {goals
            .filter((g) => g.goalCoordinates)
            .map((g) => (
              <g
                key={g.id}
                transform={`translate(${(g.goalCoordinates!.x ?? 0) * 120}, ${(g.goalCoordinates!.y ?? 0) * 80})`}
                onMouseEnter={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const text = `${g.scorerName ?? "Marcador"} — ${g.minute}'`;
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    text
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle r="8" fill="transparent" />
                <circle r="4.2" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />
                <circle r="2.2" fill="#0f172a" />
                <circle r="1.1" fill="#f97316" />
              </g>
            ))}
          <defs>
            <pattern id="netPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M0 0h6M0 0v6" stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />
            </pattern>
          </defs>
        </svg>
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md bg-slate-900/95 px-2 py-1 text-xs text-white shadow-lg border border-slate-700"
            style={{ left: tooltip.x + 6, top: tooltip.y - 10 }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamDashboard({ initialTeams }: { initialTeams: Team[] }) {
  const { selection } = useAppContext();
  const [seasonId, setSeasonId] = useState<string>(selection.seasonId ? String(selection.seasonId) : "");
  const [championshipId, setChampionshipId] = useState<string>(selection.championshipId ? String(selection.championshipId) : "");
  const [teamId, setTeamId] = useState<number | undefined>(selection.teamId);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);

  const lookupsQuery = useQuery({
    queryKey: ["lookups"],
    queryFn: () => fetcher<{ teams: Team[]; seasons: Season[]; championships: Championship[] }>(`/api/lookups`)
  });

  const teams = lookupsQuery.data?.teams ?? initialTeams;
  const seasons = lookupsQuery.data?.seasons ?? [];
  const championships = lookupsQuery.data?.championships ?? [];

  const filteredChamps = championships.filter((c) => (!seasonId ? true : c.seasonId === Number(seasonId)));
  const filteredTeams = teams.filter((t) => (!championshipId ? true : t.championshipId === Number(championshipId)));

  useEffect(() => {
    if (filteredTeams.length > 0 && (!teamId || !filteredTeams.some((t) => t.id === teamId))) {
      setTeamId(filteredTeams[0].id);
    }
  }, [filteredTeams, teamId]);

  const selectedTeam = useMemo(() => filteredTeams.find((t) => t.id === teamId), [filteredTeams, teamId]);

  const goalsQuery = useQuery({
    queryKey: ["goals", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<GoalEvent[]>(`/api/goals?teamId=${teamId}`)
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

  const totalGoals = goalsQuery.data?.length ?? 0;
  const penaltyGoals = penaltiesQuery.data?.reduce((sum, row) => sum + row.goals, 0) ?? 0;
  const openPlayGoals = Math.max(0, totalGoals - penaltyGoals);
  const topScorer = topScorersQuery.data?.[0];
  const mostInvolved = involvementQuery.data?.[0];

  const refreshAll = () => {
    goalsQuery.refetch();
    topScorersQuery.refetch();
    involvementQuery.refetch();
    momentsQuery.refetch();
    actionsQuery.refetch();
    penaltiesQuery.refetch();
  };

  const goalEvents = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  const loadGoalForEdit = async (id: number) => {
    setEditingGoalId(id);
    setEditingGoal(null);
    const res = await fetch(`/api/goals/${id}`);
    if (res.ok) {
      const json = await res.json();
      setEditingGoal(json);
    } else {
      setEditingGoalId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Análises da Equipa</h1>
        <p className="text-sm text-muted-foreground">
          {seasonId && championshipId
            ? `${seasons.find((s) => s.id === Number(seasonId))?.name ?? "Época"} · ${
                championships.find((c) => c.id === Number(championshipId))?.name ?? "Campeonato"
              }`
            : "Seleciona época > campeonato > equipa para carregar as estatísticas."}
        </p>
      </div>

      <Card>
        <CardHeader title="Filtros" description="Seleciona o contexto antes de ver as métricas" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Época</label>
            <Select
              value={seasonId}
              onChange={(e) => {
                setSeasonId(e.target.value);
                setChampionshipId("");
                setTeamId(undefined);
              }}
            >
              <option value="">Selecionar época</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id} className="text-black">
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Campeonato</label>
            <Select
              value={championshipId}
              onChange={(e) => {
                setChampionshipId(e.target.value);
                setTeamId(undefined);
              }}
              disabled={!seasonId}
            >
              <option value="">Selecionar campeonato</option>
              {filteredChamps.map((c) => (
                <option key={c.id} value={c.id} className="text-black">
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Equipa</label>
            <Select value={teamId?.toString() ?? ""} onChange={(e) => setTeamId(Number(e.target.value) || undefined)} disabled={!championshipId}>
              <option value="">Selecionar equipa</option>
              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id} className="text-black">
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {!teamId && (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-4 text-muted-foreground">Seleciona uma equipa para ver as estatísticas.</div>
      )}

      {teamId && (
        <>
          {selectedTeam && (selectedTeam.radiographyPdfUrl || selectedTeam.videoReportUrl) && (
            <div className="flex flex-wrap gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
              {selectedTeam.emblemPath && <img src={selectedTeam.emblemPath} alt="Emblema" className="h-8 w-8 rounded-full border border-border/50 bg-white/10" />}
              {selectedTeam.radiographyPdfUrl && (
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <a href={selectedTeam.radiographyPdfUrl} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> Radiografia Ofensiva (PDF)
                  </a>
                </Button>
              )}
              {selectedTeam.videoReportUrl && (
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <a href={selectedTeam.videoReportUrl} target="_blank" rel="noreferrer">
                    <PlayCircle className="h-4 w-4" /> Vídeo de Análise
                  </a>
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contexto pronto</div>
            <Button variant="secondary" onClick={refreshAll} disabled={goalsQuery.isFetching}>
              Atualizar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatTile title="Total de Golos" value={totalGoals} hint={`${goalEvents.length} registos de golo`} />
            <StatTile title="Bola Corrida" value={openPlayGoals} hint={`${penaltyGoals} de penálti`} />
            <StatTile title="Melhor Marcador" value={topScorer ? topScorer.name : "—"} hint={topScorer ? `${topScorer.goals} G / ${topScorer.assists} A` : "Sem golos"} />
            <StatTile title="Mais Interveniente" value={mostInvolved ? mostInvolved.name : "—"} hint={mostInvolved ? `${mostInvolved.involvement} participações` : "A aguardar dados"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Mapa da Baliza" description="Pinpoints de todos os golos" />
              <CardContent>{goalEvents.length ? <GoalNetPinMap goals={goalEvents} /> : <div className="text-sm text-muted-foreground">Sem dados</div>}</CardContent>
            </Card>
            <Card>
              <CardHeader title="Distribuição por Ação" />
              <CardContent>
                {actionsQuery.data ? <SimpleBar data={actionsQuery.data} xKey="action" yKey="goals" /> : <div className="text-sm text-muted-foreground">Sem dados</div>}
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
              <CardHeader title="Penáltis por Zona" />
              <CardContent>
                {penaltiesQuery.data && penaltiesQuery.data.length > 0 ? (
                  <SimplePie data={penaltiesQuery.data} labelKey="zone" valueKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem penáltis.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title="Histórico de Golos" description="Editar rapidamente qualquer golo" />
            <CardContent className="space-y-2 text-sm">
              {goalEvents.length > 0 ? (
                goalEvents.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{g.minute}'</span>
                      <span className="font-medium">{g.scorerName ?? `#${g.scorerId}`}</span>
                      <Badge className="bg-slate-700/60 text-slate-50">vs {g.opponentName ?? "Adversário indefinido"}</Badge>
                      {g.goalCoordinates && (
                        <Badge className="bg-cyan-500/10 text-cyan-100">
                          ({g.goalCoordinates.x.toFixed(2)}, {g.goalCoordinates.y.toFixed(2)})
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/stats/goal/${g.id}`} className="flex items-center gap-1">
                          <Eye className="h-4 w-4" /> Ver
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => loadGoalForEdit(g.id)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">Ainda sem eventos.</div>
              )}
            </CardContent>
          </Card>

          {editingGoalId && (
            <div className="fixed inset-0 z-50 bg-black/80">
              <div className="absolute inset-0 overflow-y-auto p-4">
                <div className="relative mx-auto w-full max-w-6xl rounded-2xl border border-border/60 bg-[#0b1220] p-4 shadow-2xl">
                  <div className="flex justify-end pb-2">
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg"
                      onClick={() => {
                        setEditingGoalId(null);
                        setEditingGoal(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-[85vh] overflow-y-auto rounded-xl border border-border/50 bg-[#0b1220]/80 p-2">
                    {editingGoal ? (
                      <GoalWizard
                        existingGoal={{
                          id: editingGoal.id,
                          opponentTeamId: editingGoal.opponentTeamId,
                          teamId: editingGoal.teamId,
                          scorerId: editingGoal.scorerId,
                          assistId: editingGoal.assistId,
                          minute: editingGoal.minute,
                          momentId: editingGoal.momentId,
                          subMomentId: editingGoal.subMomentId,
                          actionId: editingGoal.actionId,
                          goalCoordinates: editingGoal.goalCoordinates,
                          fieldDrawing: editingGoal.fieldDrawing,
                          notes: editingGoal.notes,
                          videoPath: editingGoal.videoPath,
                          involvements: editingGoal.involvements,
                          cornerTakerId: editingGoal.cornerTakerId,
                          freekickTakerId: editingGoal.freekickTakerId,
                          penaltyTakerId: editingGoal.penaltyTakerId,
                          crossAuthorId: editingGoal.crossAuthorId
                        }}
                        onSaved={() => {
                          refreshAll();
                          setEditingGoalId(null);
                          setEditingGoal(null);
                        }}
                      />
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-card/70 p-6 text-center text-white">
                        A carregar golo #{editingGoalId}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
