"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GoalWizard } from "./goal-wizard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getGoalContextLine, getGoalHeading, getMatchContextKey, type TeamVenue } from "@/lib/match-context";

type Team = { id: number; name: string; championshipId?: number | null };
type Season = { id: number; name: string };
type Championship = { id: number; name: string; seasonId: number };
type GoalEvent = {
  id: number;
  goalNumber?: number | null;
  teamId: number;
  opponentTeamId?: number | null;
  teamName?: string | null;
  matchday?: number | null;
  matchDate?: string | null;
  teamVenue?: TeamVenue | null;
  minute: number;
  scorerId: number;
  scorerName?: string | null;
  opponentName?: string | null;
  goalCoordinates?: { x: number; y: number } | null;
};

const PAGE_SIZE = 5;

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export function GoalsPageClient() {
  const queryClient = useQueryClient();
  const [seasonId, setSeasonId] = useState("");
  const [championshipId, setChampionshipId] = useState("");
  const [teamId, setTeamId] = useState<number | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [matchdayFilter, setMatchdayFilter] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pendingDeleteGoalId, setPendingDeleteGoalId] = useState<number | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  const lookupsQuery = useQuery({
    queryKey: ["lookups"],
    queryFn: () => fetcher<{ teams: Team[]; seasons: Season[]; championships: Championship[] }>(`/api/lookups`)
  });

  const seasons = lookupsQuery.data?.seasons ?? [];
  const championships = lookupsQuery.data?.championships ?? [];
  const teams = lookupsQuery.data?.teams ?? [];

  const filteredChampionships = useMemo(
    () => championships.filter((c) => (!seasonId ? true : c.seasonId === Number(seasonId))),
    [championships, seasonId]
  );
  const filteredTeams = useMemo(
    () => teams.filter((t) => (!championshipId ? true : t.championshipId === Number(championshipId))),
    [teams, championshipId]
  );

  useEffect(() => {
    if (filteredTeams.length > 0 && (!teamId || !filteredTeams.some((team) => team.id === teamId))) {
      setTeamId(filteredTeams[0].id);
    }
  }, [filteredTeams, teamId]);

  const goalsQuery = useQuery({
    queryKey: ["goals-page-history", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<GoalEvent[]>(`/api/goals?teamId=${teamId}`)
  });

  const goals = goalsQuery.data ?? [];
  const matchdayOptions = useMemo(
    () => [...new Set(goals.map((goal) => goal.matchday).filter((value): value is number => Boolean(value)))].sort((a, b) => a - b),
    [goals]
  );
  const gameOptions = useMemo(() => {
    const unique = new Map<string, GoalEvent>();
    goals
      .filter((goal) => !matchdayFilter || goal.matchday === Number(matchdayFilter))
      .forEach((goal) => {
        const key = getMatchContextKey(goal);
        if (key && !unique.has(key)) unique.set(key, goal);
      });
    return [...unique.entries()].sort(([, first], [, second]) =>
      (second.matchDate ?? "").localeCompare(first.matchDate ?? "")
    );
  }, [goals, matchdayFilter]);
  const filteredGoals = useMemo(() => {
    return goals
      .filter((goal) => !matchdayFilter || goal.matchday === Number(matchdayFilter))
      .filter((goal) => !gameFilter || getMatchContextKey(goal) === gameFilter)
      .sort((first, second) => {
        const dateComparison = (first.matchDate ?? "").localeCompare(second.matchDate ?? "");
        const fallbackComparison = first.id - second.id;
        return sortOrder === "oldest"
          ? dateComparison || fallbackComparison
          : -(dateComparison || fallbackComparison);
      });
  }, [gameFilter, goals, matchdayFilter, sortOrder]);
  const totalPages = Math.ceil(filteredGoals.length / PAGE_SIZE);
  const paginatedGoals = filteredGoals.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Could not delete the goal.");
      return json;
    },
    onSuccess: () => {
      setDeleteFeedback("Goal deleted successfully.");
      setPendingDeleteGoalId(null);
      queryClient.invalidateQueries({ queryKey: ["goals-page-history", teamId] });
    },
    onError: (error: any) => {
      setDeleteFeedback(error?.message ?? "Could not delete the goal.");
    }
  });

  useEffect(() => {
    setCurrentPage(0);
  }, [seasonId, championshipId, teamId, goals.length, sortOrder, matchdayFilter, gameFilter]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Record Goal</h1>
        <p className="text-sm text-muted-foreground">Guided workflow with goal-area selection and SVG tactical drawing.</p>
      </div>

      <GoalWizard />

      <Card>
        <CardHeader title="Goal History" description="5 records per page" />
        <CardContent className="space-y-3">
          {deleteFeedback && (
            <div className="rounded-md border border-border/60 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              {deleteFeedback}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              value={seasonId}
              onChange={(e) => {
                setSeasonId(e.target.value);
                setChampionshipId("");
                setTeamId(undefined);
              }}
            >
              <option value="">Select season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id} className="text-black">
                  {season.name}
                </option>
              ))}
            </Select>

            <Select
              value={championshipId}
              onChange={(e) => {
                setChampionshipId(e.target.value);
                setTeamId(undefined);
              }}
              disabled={!seasonId}
            >
              <option value="">Select competition</option>
              {filteredChampionships.map((championship) => (
                <option key={championship.id} value={championship.id} className="text-black">
                  {championship.name}
                </option>
              ))}
            </Select>

            <Select value={teamId?.toString() ?? ""} onChange={(e) => setTeamId(Number(e.target.value) || undefined)} disabled={!championshipId}>
              <option value="">Select team</option>
              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id} className="text-black">
                  {team.name}
                </option>
              ))}
            </Select>
          </div>

          {teamId && (
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}>
                <option value="newest">Newest date first</option>
                <option value="oldest">Oldest date first</option>
              </Select>

              <Select
                value={matchdayFilter}
                onChange={(event) => {
                  setMatchdayFilter(event.target.value);
                  setGameFilter("");
                }}
              >
                <option value="">All matchdays</option>
                {matchdayOptions.map((matchday) => (
                  <option key={matchday} value={matchday} className="text-black">Matchday {matchday}</option>
                ))}
              </Select>

              <Select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
                <option value="">All games</option>
                {gameOptions.map(([key, goal]) => (
                  <option key={key} value={key} className="text-black">
                    {getGoalContextLine({ ...goal, minute: null })}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {!teamId && <div className="text-sm text-muted-foreground">Select a team to view its history.</div>}

          {teamId && (filteredGoals.length > 0 ? (
            paginatedGoals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{getGoalHeading(goal.goalNumber, goal.id)}</span>
                    <Badge className="bg-slate-700/60 text-slate-50">{goal.scorerName ?? `#${goal.scorerId}`}</Badge>
                  {goal.goalCoordinates && (
                    <Badge className="bg-cyan-500/10 text-cyan-100">
                      ({goal.goalCoordinates.x.toFixed(2)}, {goal.goalCoordinates.y.toFixed(2)})
                    </Badge>
                  )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {getGoalContextLine(goal) || `${goal.minute}' - vs ${goal.opponentName ?? "Undefined opponent"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Link href={`/stats/goal/${goal.id}`}>View</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-rose-400/40 text-rose-200 hover:bg-rose-500/15"
                    onClick={() => {
                      setDeleteFeedback(null);
                      setPendingDeleteGoalId(goal.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">There are no goals for this context yet.</div>
          ))}

          {teamId && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>
                Page {currentPage + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))} disabled={currentPage === 0}>
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={pendingDeleteGoalId !== null}
        title="Delete Goal"
        description="Are you sure you want to delete this goal?"
        cancelLabel="Cancel"
        confirmLabel="Confirm deletion"
        loading={deleteGoalMutation.isPending}
        onCancel={() => {
          if (deleteGoalMutation.isPending) return;
          setPendingDeleteGoalId(null);
        }}
        onConfirm={() => {
          if (!pendingDeleteGoalId || deleteGoalMutation.isPending) return;
          deleteGoalMutation.mutate(pendingDeleteGoalId);
        }}
      />
    </div>
  );
}
