"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Play, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { displayFootballTerm } from "@/lib/presentation";

type Lookup = {
  seasons: Array<{ id: number; name: string }>;
  championships: Array<{ id: number; name: string; seasonId: number }>;
  teams: Array<{ id: number; name: string; championshipId: number }>;
  moments: Array<{ id: number; name: string }>;
  subMoments: Array<{ id: number; name: string; momentId: number }>;
  actions: Array<{ id: number; name: string; subMomentId: number }>;
};
type Player = { id: number; name: string; teamId: number };
type ReportGoal = {
  id: number;
  minute: number;
  teamName: string;
  opponentName?: string | null;
  seasonName?: string | null;
  championshipName?: string | null;
  scorerName?: string | null;
  assistName?: string | null;
  momentName?: string | null;
  subMomentName?: string | null;
  actions: string[];
  hasVideo: boolean;
  mediaAssetId?: string | null;
  videoPath?: string | null;
  attackDirection?: "left_to_right" | "right_to_left";
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload as T;
}

export function ReportsClient() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [playAll, setPlayAll] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lookupsQuery = useQuery({
    queryKey: ["reports-lookups"],
    queryFn: () => fetchJson<Lookup>("/api/lookups?includeInactive=1")
  });
  const playersQuery = useQuery({ queryKey: ["reports-players"], queryFn: () => fetchJson<Player[]>("/api/manage/players") });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);
  const goalsQuery = useQuery({
    queryKey: ["goal-reports", queryString],
    queryFn: () => fetchJson<ReportGoal[]>(`/api/reports/goals${queryString ? `?${queryString}` : ""}`)
  });

  const lookups = lookupsQuery.data;
  const championships = (lookups?.championships ?? []).filter(
    (entry) => !filters.seasonId || entry.seasonId === Number(filters.seasonId)
  );
  const teams = (lookups?.teams ?? []).filter(
    (entry) => !filters.championshipId || entry.championshipId === Number(filters.championshipId)
  );
  const subMoments = (lookups?.subMoments ?? []).filter(
    (entry) => !filters.momentId || entry.momentId === Number(filters.momentId)
  );
  const actions = (lookups?.actions ?? []).filter(
    (entry) => !filters.subMomentId || entry.subMomentId === Number(filters.subMomentId)
  );
  const players = (playersQuery.data ?? []).filter(
    (entry) => !filters.teamId || entry.teamId === Number(filters.teamId)
  );
  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const videoGoals = useMemo(() => goals.filter((goal) => goal.hasVideo), [goals]);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? videoGoals[0] ?? goals[0] ?? null;
  const selectedPlaybackUrl = selectedGoal?.mediaAssetId
    ? `/api/media/assets/${encodeURIComponent(selectedGoal.mediaAssetId)}/playback`
    : selectedGoal?.videoPath || null;

  useEffect(() => {
    if (goals.length === 0) {
      setSelectedGoalId(null);
      setPlayAll(false);
      return;
    }
    if (!selectedGoalId || !goals.some((goal) => goal.id === selectedGoalId)) {
      setSelectedGoalId((videoGoals[0] ?? goals[0]).id);
      setPlayAll(false);
    }
  }, [goals, selectedGoalId, videoGoals]);

  useEffect(() => {
    if (!playAll || !selectedPlaybackUrl) return;
    const frame = requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => setPlayAll(false));
    });
    return () => cancelAnimationFrame(frame);
  }, [playAll, selectedGoalId, selectedPlaybackUrl]);

  const playNextVideo = () => {
    if (!selectedGoal || !playAll) return;
    const index = videoGoals.findIndex((goal) => goal.id === selectedGoal.id);
    const next = videoGoals[index + 1];
    if (!next) {
      setPlayAll(false);
      return;
    }
    setSelectedGoalId(next.id);
  };

  const startPlayAll = () => {
    if (videoGoals.length === 0) return;
    const currentIndex = selectedGoal ? videoGoals.findIndex((goal) => goal.id === selectedGoal.id) : -1;
    setSelectedGoalId((currentIndex >= 0 ? videoGoals[currentIndex] : videoGoals[0]).id);
    setPlayAll(true);
  };

  const setFilter = (name: string, value: string) => {
    setPlayAll(false);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Goal Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find and review goals using combined tactical and player filters.</p>
      </div>

      <Card>
        <CardHeader title="Filters" description="All filters can be combined." />
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Select value={filters.seasonId ?? ""} onChange={(event) => { setFilter("seasonId", event.target.value); setFilter("championshipId", ""); setFilter("teamId", ""); }}>
            <option value="">All seasons</option>
            {lookups?.seasons.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <Select value={filters.championshipId ?? ""} onChange={(event) => { setFilter("championshipId", event.target.value); setFilter("teamId", ""); }}>
            <option value="">All competitions</option>
            {championships.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <Select value={filters.teamId ?? ""} onChange={(event) => setFilter("teamId", event.target.value)}>
            <option value="">All teams</option>
            {teams.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <Select value={filters.opponentTeamId ?? ""} onChange={(event) => setFilter("opponentTeamId", event.target.value)}>
            <option value="">All opponents</option>
            {teams.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <Select value={filters.momentId ?? ""} onChange={(event) => { setFilter("momentId", event.target.value); setFilter("subMomentId", ""); setFilter("actionId", ""); }}>
            <option value="">All moments</option>
            {lookups?.moments.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{displayFootballTerm(entry.name)}</option>)}
          </Select>
          <Select value={filters.subMomentId ?? ""} onChange={(event) => { setFilter("subMomentId", event.target.value); setFilter("actionId", ""); }}>
            <option value="">All sub-moments</option>
            {subMoments.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{displayFootballTerm(entry.name)}</option>)}
          </Select>
          <Select value={filters.actionId ?? ""} onChange={(event) => setFilter("actionId", event.target.value)}>
            <option value="">All actions</option>
            {actions.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{displayFootballTerm(entry.name)}</option>)}
          </Select>
          <Select value={filters.scorerId ?? ""} onChange={(event) => setFilter("scorerId", event.target.value)}>
            <option value="">All scorers</option>
            {players.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <Select value={filters.assistId ?? ""} onChange={(event) => setFilter("assistId", event.target.value)}>
            <option value="">All assists</option>
            {players.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <Select value={filters.involvedPlayerId ?? ""} onChange={(event) => setFilter("involvedPlayerId", event.target.value)}>
            <option value="">All involved players</option>
            {players.map((entry) => <option key={entry.id} value={entry.id} className="text-black">{entry.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={0} max={130} placeholder="Minute from" value={filters.minuteFrom ?? ""} onChange={(event) => setFilter("minuteFrom", event.target.value)} />
            <Input type="number" min={0} max={130} placeholder="Minute to" value={filters.minuteTo ?? ""} onChange={(event) => setFilter("minuteTo", event.target.value)} />
          </div>
          <Select value={filters.hasVideo ?? ""} onChange={(event) => setFilter("hasVideo", event.target.value)}>
            <option value="">With or without video</option>
            <option value="true">With video</option>
            <option value="false">Without video</option>
          </Select>
          <Select value={filters.attackDirection ?? ""} onChange={(event) => setFilter("attackDirection", event.target.value)}>
            <option value="">Todos os sentidos de ataque</option>
            <option value="left_to_right">Esquerda para direita →</option>
            <option value="right_to_left">← Direita para esquerda</option>
          </Select>
          <div className="md:col-span-3 xl:col-span-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => { setFilters({}); setPlayAll(false); }}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={`${goals.length} goals found`} description="Watch the filtered videos in sequence or select an individual goal." />
        <CardContent className="space-y-4">
          {goalsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading goals...</p>}
          {goalsQuery.error && <p className="text-sm text-destructive">{(goalsQuery.error as Error).message}</p>}
          {!goalsQuery.isLoading && goals.length === 0 && <p className="text-sm text-muted-foreground">No goals match these filters.</p>}
          {goals.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-3 rounded-2xl border border-border/60 bg-slate-950/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">
                      {selectedGoal?.teamName} vs {selectedGoal?.opponentName ?? "—"} · {selectedGoal?.minute}&apos;
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedGoal?.scorerName ?? "—"}{selectedGoal?.assistName ? ` · Assist: ${selectedGoal.assistName}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={startPlayAll} disabled={videoGoals.length === 0}>
                      <Play className="mr-1 h-4 w-4" /> {playAll ? "Playing all" : `Play all (${videoGoals.length})`}
                    </Button>
                    {selectedGoal && (
                      <Link href={`/stats/goal/${selectedGoal.id}`}>
                        <Button type="button" variant="ghost" size="sm">
                          <ExternalLink className="mr-1 h-4 w-4" />Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                {selectedPlaybackUrl ? (
                  <video
                    key={selectedGoal?.id}
                    ref={videoRef}
                    controls
                    className="aspect-video w-full rounded-xl border border-border/60 bg-black object-contain"
                    src={selectedPlaybackUrl}
                    onEnded={playNextVideo}
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border/60 bg-black/40 text-sm text-muted-foreground">
                    This goal has no video.
                  </div>
                )}
              </div>

              <aside className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {goals.map((goal) => {
                  const selected = goal.id === selectedGoal?.id;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => { setSelectedGoalId(goal.id); setPlayAll(false); }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected ? "border-cyan-300/60 bg-cyan-400/10" : "border-border/60 bg-white/[.02] hover:border-cyan-300/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-white">{goal.teamName} vs {goal.opponentName ?? "—"}</span>
                        <Badge>{goal.minute}&apos;</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {goal.hasVideo ? <Video className="h-3 w-3 text-cyan-300" /> : <span className="text-amber-200">Sem vídeo ·</span>}
                        <span>{goal.scorerName ?? "—"}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {displayFootballTerm(goal.momentName)}{goal.subMomentName ? ` · ${displayFootballTerm(goal.subMomentName)}` : ""}
                      </div>
                      <div className="mt-1 text-[10px] text-cyan-200/80">
                        {goal.attackDirection === "right_to_left" ? "← Direita para esquerda" : "Esquerda para direita →"}
                      </div>
                      {goal.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {goal.actions.map((action, index) => (
                            <span key={`${action}-${index}`} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {displayFootballTerm(action)}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </aside>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
