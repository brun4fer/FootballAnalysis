"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleBar, SimplePie } from "@/components/ui/charts";

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

type Team = { id: number; name: string };

export function TeamDashboard({ initialTeams }: { initialTeams: Team[] }) {
  const [teamId, setTeamId] = useState<number | undefined>(initialTeams[0]?.id);

  if (initialTeams.length === 0) {
    return <div className="text-sm text-muted-foreground">No teams in database yet. Add a team before viewing stats.</div>;
  }

  const goalsQuery = useQuery({
    queryKey: ["goals", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<any[]>(`/api/goals?teamId=${teamId}`)
  });

  const topScorersQuery = useQuery({
    queryKey: ["top-scorers", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetcher<Array<{ id: number; name: string; goals: number }>>(`/api/stats/top-scorers?teamId=${teamId}`)
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
  const topScorer = topScorersQuery.data?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Team Analytics</h1>
          <p className="text-sm text-muted-foreground">Live aggregates computed directly from goals.</p>
        </div>
        <div className="flex gap-3 items-center">
          <Select value={teamId?.toString()} onChange={(e) => setTeamId(Number(e.target.value) || undefined)} className="w-48">
            {initialTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => { goalsQuery.refetch(); zoneQuery.refetch(); topScorersQuery.refetch(); involvementQuery.refetch(); momentsQuery.refetch(); actionsQuery.refetch(); penaltiesQuery.refetch(); }}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader title="Total Goals" />
          <CardContent className="text-3xl font-semibold">{totalGoals}</CardContent>
        </Card>
        <Card>
          <CardHeader title="Top Scorer" />
          <CardContent>
            {topScorer ? (
              <div className="space-y-1">
                <div className="text-lg font-semibold">{topScorer.name}</div>
                <div className="text-sm text-muted-foreground">{topScorer.goals} goals</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No goals yet</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Penalties by Zone" />
          <CardContent>{penaltiesQuery.data ? <SimplePie data={penaltiesQuery.data} labelKey="zone" valueKey="goals" /> : <div className="text-sm text-muted-foreground">No data</div>}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Zone Distribution" />
          <CardContent>{zoneQuery.data ? <SimpleBar data={zoneQuery.data} xKey="name" yKey="goals" /> : <div className="text-sm text-muted-foreground">No data</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader title="Moments" />
          <CardContent>{momentsQuery.data ? <SimpleBar data={momentsQuery.data} xKey="moment" yKey="goals" /> : <div className="text-sm text-muted-foreground">No data</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader title="Actions" />
          <CardContent>{actionsQuery.data ? <SimpleBar data={actionsQuery.data} xKey="action" yKey="goals" /> : <div className="text-sm text-muted-foreground">No data</div>}</CardContent>
        </Card>
        <Card>
          <CardHeader title="Involvement Leaderboard" />
          <CardContent>
            <div className="space-y-2">
              {involvementQuery.data?.map((row) => (
                <div key={row.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span>{row.name}</span>
                  <Badge>{row.involvement}</Badge>
                </div>
              )) || <div className="text-sm text-muted-foreground">No data</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

