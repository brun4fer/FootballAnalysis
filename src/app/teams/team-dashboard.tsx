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

const TECH_LABEL_OVERRIDES: Record<string, string> = {
  organizacao: "Organização",
  curto_para_longo: "Curto para longo",
  bola_longa: "Bola longa",
  area: "Área",
  aberto: "Aberto",
  fechado: "Fechado",
  combinado: "Combinado",
  cruzamento: "Cruzamento",
  "canto aberto": "Canto Aberto",
  "canto fechado": "Canto Fechado"
};

const normalizeChartLabel = (value?: string | null) => {
  const raw = value?.toString().trim();
  if (!raw) return null;
  if (raw.toLowerCase() === "indefinido") return null;
  return raw;
};

const formatTechnicalLabel = (value?: string | null) => {
  const normalized = normalizeChartLabel(value);
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (TECH_LABEL_OVERRIDES[lower]) return TECH_LABEL_OVERRIDES[lower];
  const words = normalized.replace(/_/g, " ").split(" ");
  return words
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : ""))
    .join(" ")
    .trim();
};

const cleanChartData = <T extends Record<string, any>>(
  data: T[] | undefined,
  labelKey: keyof T,
  valueKey: keyof T,
  labelFormatter?: (value?: string | null) => string | null
) => {
  const formatter = labelFormatter ?? normalizeChartLabel;
  return (data ?? [])
    .map((entry) => {
      const rawLabel = entry[labelKey];
      const label = formatter(rawLabel ?? null);
      const value = Number(entry[valueKey]);
      if (!label || !Number.isFinite(value) || value <= 0) return null;
      return { ...entry, [labelKey]: label };
    })
    .filter((entry): entry is T => entry !== null);
};

const EMPTY_GRAPH_MESSAGE = "Não há golos desta maneira";

function EmptyGraphState() {
  return (
    <div className="flex min-h-[220px] w-full items-center justify-center text-sm text-muted-foreground">
      {EMPTY_GRAPH_MESSAGE}
    </div>
  );
}

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
  const HISTORY_PAGE_LIMIT = 5;
  const [historyPage, setHistoryPage] = useState(0);
  const historyPageCount = Math.max(1, Math.ceil(goalEvents.length / HISTORY_PAGE_LIMIT));
  const pagedGoalEvents = goalEvents.slice(historyPage * HISTORY_PAGE_LIMIT, (historyPage + 1) * HISTORY_PAGE_LIMIT);
  const historyCanPrev = historyPage > 0;
  const historyCanNext = historyPage < historyPageCount - 1;

  useEffect(() => {
    setHistoryPage(0);
  }, [goalEvents.length]);

  const actionsData = useMemo(
    () => cleanChartData(actionsQuery.data, "action", "goals", formatTechnicalLabel),
    [actionsQuery.data]
  );
  const momentsData = useMemo(
    () => cleanChartData(momentsQuery.data, "moment", "goals"),
    [momentsQuery.data]
  );
  const penaltiesData = useMemo(
    () => cleanChartData(penaltiesQuery.data, "zone", "goals"),
    [penaltiesQuery.data]
  );

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
          <Link href="/teams/radiografia">Radiografia da Equipa</Link>
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
              <CardContent className="w-full px-0 py-0">
                {actionsData.length > 0 ? (
                  <SimpleBar data={actionsData} xKey="action" yKey="goals" />
                ) : (
                  <EmptyGraphState />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Momentos do Golo" />
              <CardContent className="w-full px-0 py-0">
                {momentsData.length > 0 ? (
                  <SimpleBar data={momentsData} xKey="moment" yKey="goals" />
                ) : (
                  <EmptyGraphState />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Penáltis por Zona" />
              <CardContent>
                {penaltiesData.length > 0 ? (
                  <SimplePie data={penaltiesData} labelKey="zone" valueKey="goals" />
                ) : (
                  <EmptyGraphState />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title="Histórico de Golos" description="Editar rapidamente qualquer golo" />
            <CardContent className="space-y-2 text-sm">
              {goalEvents.length > 0 ? (
                pagedGoalEvents.map((g) => (
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
              {historyPageCount > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
                  <span>
                    Página {historyPage + 1} de {historyPageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 0))} disabled={!historyCanPrev}>
                      Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryPage((prev) => Math.min(prev + 1, historyPageCount - 1))}
                      disabled={!historyCanNext}
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
