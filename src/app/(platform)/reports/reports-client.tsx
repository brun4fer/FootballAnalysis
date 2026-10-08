"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video } from "lucide-react";
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
};

const PAGE_SIZE = 20;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload as T;
}

export function ReportsClient() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const lookupsQuery = useQuery({ queryKey: ["reports-lookups"], queryFn: () => fetchJson<Lookup>("/api/lookups") });
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
  const goals = goalsQuery.data ?? [];
  const pages = Math.max(1, Math.ceil(goals.length / PAGE_SIZE));
  const visibleGoals = goals.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const setFilter = (name: string, value: string) => {
    setPage(0);
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
          <div className="md:col-span-3 xl:col-span-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => { setFilters({}); setPage(0); }}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={`${goals.length} goals found`} description="Open a goal to watch the video and view its trajectory." />
        <CardContent className="space-y-3">
          {goalsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading goals...</p>}
          {goalsQuery.error && <p className="text-sm text-destructive">{(goalsQuery.error as Error).message}</p>}
          {!goalsQuery.isLoading && visibleGoals.length === 0 && <p className="text-sm text-muted-foreground">No goals match these filters.</p>}
          {visibleGoals.map((goal) => (
            <Link key={goal.id} href={`/stats/goal/${goal.id}`} className="block rounded-xl border border-border/60 bg-white/[.02] p-4 hover:border-cyan-300/40 hover:bg-cyan-300/[.04]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{goal.teamName} vs {goal.opponentName ?? "—"}</span>
                    <Badge>{goal.minute}&apos;</Badge>
                    {goal.hasVideo && <Badge className="bg-cyan-500/10 text-cyan-100"><Video className="mr-1 h-3 w-3" />Video</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{goal.scorerName ?? "—"}{goal.assistName ? ` · Assist: ${goal.assistName}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{goal.seasonName} · {goal.championshipName} · {displayFootballTerm(goal.momentName)}</p>
                </div>
                <div className="flex max-w-xl flex-wrap justify-end gap-1">
                  {goal.actions.map((action, index) => <Badge key={`${action}-${index}`} className="bg-white/5 text-white">{displayFootballTerm(action)}</Badge>)}
                </div>
              </div>
            </Link>
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
              <span>Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
                <Button variant="ghost" size="sm" disabled={page >= pages - 1} onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
