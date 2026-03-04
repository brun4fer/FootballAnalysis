"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleBar } from "@/components/ui/charts";
import { FileText, PlayCircle, X, Eye } from "lucide-react";
import { useAppContext } from "@/components/ui/app-context";
import { GoalWizard } from "../goals/goal-wizard";

type Team = {
  id: number;
  name: string;
  championshipId?: number | null;
  radiographyPdfUrl?: string | null;
  videoReportUrl?: string | null;
  emblemPath?: string | null;
  coach?: string | null;
  stadium?: string | null;
  pitchDimensions?: string | null;
};
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

const getInitials = (value?: string | null) => {
  if (!value) return "TR";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

function GoalNetPinMap({ goals }: { goals: GoalEvent[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; minute: number } | null>(null);
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
                  const label = `${g.scorerName ?? "Marcador"} —`;
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    label,
                    minute: g.minute
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
            {tooltip.label}{" "}
            <span>
              {tooltip.minute}
              &apos;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamDashboard({ initialTeams }: { initialTeams: Team[] }) {
  const { selection } = useAppContext();
  const PAGE_SIZE = 5;
  const [seasonId, setSeasonId] = useState<string>(selection.seasonId ? String(selection.seasonId) : "");
  const [championshipId, setChampionshipId] = useState<string>(selection.championshipId ? String(selection.championshipId) : "");
  const [teamId, setTeamId] = useState<number | undefined>(selection.teamId);
  const [teamPage, setTeamPage] = useState(0);
  const [goalPage, setGoalPage] = useState(0);
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
  const teamPageCount = Math.ceil(filteredTeams.length / PAGE_SIZE);
  const paginatedTeams = filteredTeams.slice(teamPage * PAGE_SIZE, (teamPage + 1) * PAGE_SIZE);

  useEffect(() => {
    if (filteredTeams.length > 0 && (!teamId || !filteredTeams.some((t) => t.id === teamId))) {
      setTeamId(filteredTeams[0].id);
    }
  }, [filteredTeams, teamId]);

  useEffect(() => {
    setTeamPage(0);
  }, [seasonId, championshipId, filteredTeams.length]);

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

  const momentsQuery = useQuery({
    queryKey: ["moments", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ moment: string; goals: number }>>(`/api/stats/moments?teamId=${teamId}`)
  });

  const totalGoals = goalsQuery.data?.length ?? 0;
  const topScorers = topScorersQuery.data ?? [];
  const topScorer = topScorers.reduce<{ id: number; name: string; goals: number; assists: number } | null>(
    (best, current) => (!best || current.goals > best.goals ? current : best),
    null
  );
  const topAssistant = topScorers.reduce<{ id: number; name: string; goals: number; assists: number } | null>(
    (best, current) => (!best || current.assists > best.assists ? current : best),
    null
  );
  const topParticipation = topScorers.reduce<{ id: number; name: string; participations: number } | null>((best, current) => {
    const participations = (current.goals ?? 0) + (current.assists ?? 0);
    if (!best || participations > best.participations) {
      return { id: current.id, name: current.name, participations };
    }
    return best;
  }, null);

  const refreshAll = () => {
    goalsQuery.refetch();
    topScorersQuery.refetch();
    momentsQuery.refetch();
  };

  const goalEvents = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const goalPageCount = Math.ceil(goalEvents.length / PAGE_SIZE);
  const paginatedGoalEvents = goalEvents.slice(goalPage * PAGE_SIZE, (goalPage + 1) * PAGE_SIZE);

  useEffect(() => {
    setGoalPage(0);
  }, [seasonId, championshipId, teamId, goalEvents.length]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <Button variant="secondary" size="sm">
          <Link href="/teams/radiografia">Momentos da Equipa</Link>
        </Button>
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
                <Button variant="ghost" size="sm" className="gap-2">
                  <a href={selectedTeam.radiographyPdfUrl} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> Radiografia Ofensiva (PDF)
                  </a>
                </Button>
              )}
              {selectedTeam.videoReportUrl && (
                <Button variant="ghost" size="sm" className="gap-2">
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

          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="border-border/60 bg-slate-900/55">
                <CardHeader title="Emblema da Equipa" />
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-slate-800/60">
                    {selectedTeam?.emblemPath ? (
                      <img src={selectedTeam.emblemPath} alt={`Emblema ${selectedTeam.name}`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem imagem</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{selectedTeam?.name ?? "Equipa"}</div>
                    <div className="text-xs text-muted-foreground">Placeholder circular ativo</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-slate-900/55">
                <CardHeader title="Melhor Marcador" />
                <CardContent>
                  <div className="text-sm font-semibold text-white">{topScorer?.name ?? "Sem dados"}</div>
                  <div className="text-xs text-muted-foreground">{topScorer ? `${topScorer.goals} golos` : "Sem registos"}</div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-slate-900/55">
                <CardHeader title="Mais Assistencias" />
                <CardContent>
                  <div className="text-sm font-semibold text-white">{topAssistant?.name ?? "Sem dados"}</div>
                  <div className="text-xs text-muted-foreground">{topAssistant ? `${topAssistant.assists} assistencias` : "Sem registos"}</div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-slate-900/55">
                <CardHeader title="Mais Participacoes em Golo" />
                <CardContent>
                  <div className="text-sm font-semibold text-white">{topParticipation?.name ?? "Sem dados"}</div>
                  <div className="text-xs text-muted-foreground">{topParticipation ? `${topParticipation.participations} participacoes` : "Sem registos"}</div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-slate-900/55">
                <CardHeader title="Total de Golos" />
                <CardContent>
                  <div className="text-3xl font-semibold text-white">{totalGoals}</div>
                  <div className="text-xs text-muted-foreground">{goalEvents.length} registos</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="border-border/60 bg-slate-900/55 lg:col-span-3">
                <CardHeader title="Estadio e Dimensoes do Relvado" />
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Estadio</div>
                    <div className="rounded-md border border-border/60 bg-slate-950/35 px-3 py-2 text-sm text-white">
                      {selectedTeam?.stadium?.trim() || "Por definir"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Dimensoes</div>
                    <div className="rounded-md border border-border/60 bg-slate-950/35 px-3 py-2 text-sm text-white">
                      {selectedTeam?.pitchDimensions?.trim() || "Por definir"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-slate-900/55 lg:col-span-2">
                <CardHeader title="Treinador" />
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-slate-800/65 text-sm font-semibold text-slate-100">
                    {getInitials(selectedTeam?.coach)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{selectedTeam?.coach?.trim() || "Treinador por definir"}</div>
                    <div className="text-xs text-muted-foreground">Espaco reservado para foto</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Mapa da Baliza" description="Pinpoints de todos os golos" />
              <CardContent>{goalEvents.length ? <GoalNetPinMap goals={goalEvents} /> : <div className="text-sm text-muted-foreground">Sem dados</div>}</CardContent>
            </Card>
            <Card>
              <CardHeader title="Momentos do Golo" />
              <CardContent>
                {momentsQuery.data ? <SimpleBar data={momentsQuery.data} xKey="moment" yKey="goals" /> : <div className="text-sm text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader title="Histórico de Golos" description="Editar rapidamente qualquer golo" />
            <CardContent className="space-y-2 text-sm">
              {goalEvents.length > 0 ? (
                paginatedGoalEvents.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {g.minute}
                        &apos;
                      </span>
                      <span className="font-medium">{g.scorerName ?? `#${g.scorerId}`}</span>
                      <Badge className="bg-slate-700/60 text-slate-50">vs {g.opponentName ?? "Adversário indefinido"}</Badge>
                      {g.goalCoordinates && (
                        <Badge className="bg-cyan-500/10 text-cyan-100">
                          ({g.goalCoordinates.x.toFixed(2)}, {g.goalCoordinates.y.toFixed(2)})
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
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
              {goalPageCount > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>
                    Página {goalPage + 1} de {goalPageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setGoalPage((prev) => Math.max(prev - 1, 0))} disabled={goalPage === 0}>
                      Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGoalPage((prev) => Math.min(prev + 1, Math.max(goalPageCount - 1, 0)))}
                      disabled={goalPage >= goalPageCount - 1}
                    >
                      Seguinte
                    </Button>
                  </div>
                </div>
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
                          assistDrawing: editingGoal.assistDrawing,
                          transitionDrawing: editingGoal.transitionDrawing,
                          notes: editingGoal.notes,
                          videoPath: editingGoal.videoPath,
                          involvements: editingGoal.involvements,
                          cornerTakerId: editingGoal.cornerTakerId,
                          freekickTakerId: editingGoal.freekickTakerId,
                          penaltyTakerId: editingGoal.penaltyTakerId,
                          crossAuthorId: editingGoal.crossAuthorId,
                          throwInTakerId: editingGoal.throwInTakerId,
                          referencePlayerId: editingGoal.referencePlayerId
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
