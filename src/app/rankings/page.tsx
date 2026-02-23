"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAppContext } from "@/components/ui/app-context";
import { cn } from "@/lib/utils";
import { GitCompare, Trophy } from "lucide-react";

type TeamRanking = { teamId: number; team: string; goals: number; label?: string; emblemPath?: string | null };
type PlayerGoals = { playerId: number; name: string; team: string; goals: number; photoPath?: string | null };
type PlayerAssists = { playerId: number; name: string; team: string; assists: number; photoPath?: string | null };
type PlayerInvolvement = { playerId: number; name: string; team: string; involvement: number; photoPath?: string | null };

type RankingsResponse = {
  totalGoals: TeamRanking[];
  organization: TeamRanking[];
  transition: TeamRanking[];
  setPiecesTotal: TeamRanking[];
  corners: TeamRanking[];
  freeKicks: TeamRanking[];
  freeKicksDirect: TeamRanking[];
  penalties: TeamRanking[];
  throwIns: TeamRanking[];
  topScorers: PlayerGoals[];
  topAssists: PlayerAssists[];
  goalInvolvement: PlayerInvolvement[];
};

type CompareAggregate = {
  championshipId: number | null;
  seasonId: number | null;
  totalGoals: number;
  organization: number;
  transition: number;
  setPieces: number;
};

type CompareResponse = { A: CompareAggregate; B: CompareAggregate };

type Season = { id: number; name: string };
type Championship = { id: number; name: string; seasonId: number };

type LookupResponse = { seasons: Season[]; championships: Championship[] };

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const raw = await res.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed.error ?? raw;
    } catch {
      /* ignore parse error */
    }
    console.error("[rankings fetcher]", res.status, message);
    throw new Error(message || `Falha a carregar dados (HTTP ${res.status})`);
  }
  return res.json();
};

function RankingCard({
  title,
  rows,
  valueKey,
  valueLabel
}: {
  title: string;
  rows: Array<Record<string, any>>;
  valueKey: string;
  valueLabel: string;
}) {
  return (
    <Card className="h-full bg-[#0b1220]/70">
      <CardHeader title={title} />
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem dados disponíveis.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 8).map((row, idx) => (
              <div
                key={`${row.team ?? row.name}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-xs text-muted-foreground">{idx + 1}º</span>
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-800">
                    <Image
                      src={
                        (row.emblemPath ||
                          row.photoPath ||
                          "/images/default.png") as string
                      }
                      alt={row.team ?? row.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                      priority={idx < 3}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{row.team ?? row.name}</span>
                    {row.name && row.team && row.name !== row.team && (
                      <span className="text-xs text-muted-foreground">{row.team}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-1 text-sm font-semibold text-emerald-200">
                  <span>{row[valueKey] ?? 0}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">{valueLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPlayersCard({
  title,
  rows,
  valueKey,
  valueLabel
}: {
  title: string;
  rows: Array<Record<string, any>>;
  valueKey: string;
  valueLabel: string;
}) {
  return (
    <Card className="h-full bg-[#0b1220]/70">
      <CardHeader title={title} />
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem dados disponíveis.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 3).map((row, idx) => (
              <div
                key={`${row.name}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs text-muted-foreground">{idx + 1}º</span>
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-slate-800">
                    <Image
                      src={(row.photoPath || "/images/default.png") as string}
                      alt={row.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                      priority={idx === 0}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{row.name}</span>
                    {row.team && <span className="text-xs text-muted-foreground">{row.team}</span>}
                  </div>
                </div>
                <div className="flex items-baseline gap-1 text-sm font-semibold text-emerald-200">
                  <span>{row[valueKey] ?? 0}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">{valueLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonStat({
  label,
  valueA,
  valueB,
  nameA,
  nameB
}: {
  label: string;
  valueA: number;
  valueB: number;
  nameA: string;
  nameB: string;
}) {
  const max = Math.max(valueA, valueB, 1);
  const pctA = Math.round((valueA / max) * 100);
  const pctB = Math.round((valueB / max) * 100);
  return (
    <Card className="bg-gradient-to-br from-[#0c1426] via-[#0c1426]/80 to-emerald-900/10">
      <CardHeader title={label} />
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white">{nameA}</span>
          </div>
          <span className="text-white font-semibold">{valueA}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pctA}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-white">{nameB}</span>
          </div>
          <span className="text-white font-semibold">{valueB}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${pctB}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RankingsPage() {
  const { selection, updatePartial } = useAppContext();
  const [tab, setTab] = useState<"ligas" | "comparar">("ligas");
  const [seasonId, setSeasonId] = useState<string>(selection.seasonId ? String(selection.seasonId) : "");
  const [championshipId, setChampionshipId] = useState<string>(selection.championshipId ? String(selection.championshipId) : "");
  const [seasonA, setSeasonA] = useState<string>(selection.seasonId ? String(selection.seasonId) : "");
  const [seasonB, setSeasonB] = useState<string>("");
  const [champA, setChampA] = useState<string>(selection.championshipId ? String(selection.championshipId) : "");
  const [champB, setChampB] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (selection.seasonId && String(selection.seasonId) !== seasonId) {
      setSeasonId(String(selection.seasonId));
    }
    if (selection.championshipId && String(selection.championshipId) !== championshipId) {
      setChampionshipId(String(selection.championshipId));
    }
  }, [selection.seasonId, selection.championshipId]);

  const lookupsQuery = useQuery({
    queryKey: ["lookups-rankings"],
    queryFn: () => fetcher<LookupResponse>("/api/lookups"),
    enabled: isMounted
  });

  const seasons = lookupsQuery.data?.seasons ?? [];
  const championships = lookupsQuery.data?.championships ?? [];

  const champsForSeason = (season: string) =>
    championships.filter((c) => (!season ? true : c.seasonId === Number(season)));

  const filteredChamps = champsForSeason(seasonId);
  const filteredChampsA = champsForSeason(seasonA);
  const filteredChampsB = champsForSeason(seasonB);

  const selectedSeason = seasons.find((s) => s.id === Number(seasonId));
  const selectedChampionship = championships.find((c) => c.id === Number(championshipId));

  const rankingsQuery = useQuery({
    queryKey: ["rankings", seasonId, championshipId],
    enabled: isMounted && Boolean(championshipId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (seasonId) params.set("seasonId", seasonId);
      if (championshipId) params.set("championshipId", championshipId);
      const query = params.toString();
      return fetcher<RankingsResponse>(`/api/rankings${query ? `?${query}` : ""}`);
    }
  });

  const comparisonReady = (champA || seasonA) && (champB || seasonB);

  const compareQuery = useQuery({
    queryKey: ["compare-rankings", champA, champB, seasonA, seasonB],
    enabled: isMounted && Boolean(comparisonReady),
    queryFn: () => {
      const params = new URLSearchParams();
      if (champA) params.set("champA", champA);
      if (champB) params.set("champB", champB);
      if (seasonA) params.set("seasonA", seasonA);
      if (seasonB) params.set("seasonB", seasonB);
      const query = params.toString();
      return fetcher<CompareResponse>(`/api/rankings?${query}`);
    }
  });

  const labelFor = (champId?: string, seasonIdValue?: string) => {
    const champName = champId ? championships.find((c) => c.id === Number(champId))?.name : undefined;
    const seasonName = seasonIdValue ? seasons.find((s) => s.id === Number(seasonIdValue))?.name : undefined;
    if (champName && seasonName) return `${champName} · ${seasonName}`;
    if (champName) return champName;
    if (seasonName) return seasonName;
    return "Sem contexto";
  };

  const nameA = labelFor(champA, seasonA);
  const nameB = labelFor(champB, seasonB);

  const handleSeasonChange = (value: string) => {
    setSeasonId(value);
    setChampionshipId("");
    const seasonName = seasons.find((s) => s.id === Number(value))?.name;
    updatePartial({
      seasonId: value ? Number(value) : undefined,
      seasonName,
      championshipId: undefined,
      championshipName: undefined
    });
  };

  const handleChampionshipChange = (value: string) => {
    setChampionshipId(value);
    const champName = championships.find((c) => c.id === Number(value))?.name;
    updatePartial({
      championshipId: value ? Number(value) : undefined,
      championshipName: champName,
      seasonId: seasonId ? Number(seasonId) : undefined,
      seasonName: selectedSeason?.name
    });
  };

  const renderRankings = () => (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gradient-to-br from-[#0a1020] via-[#0d162a] to-[#0a1020]/80">
        <CardHeader title="Filtros de contexto" description="Escolhe época e campeonato para carregar os rankings." />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Época</label>
            <Select value={seasonId} onChange={(e) => handleSeasonChange(e.target.value)}>
              <option value="" className="text-black">
                Selecionar época
              </option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id} className="text-black">
                  {season.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Campeonato</label>
            <Select
              value={championshipId}
              onChange={(e) => handleChampionshipChange(e.target.value)}
              disabled={!seasonId}
            >
              <option value="" className="text-black">
                Selecionar campeonato
              </option>
              {filteredChamps.map((champ) => (
                <option key={champ.id} value={champ.id} className="text-black">
                  {champ.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <div className="rounded-lg border border-dashed border-border/60 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
              {selectedSeason && selectedChampionship
                ? `${selectedChampionship.name} · ${selectedSeason.name}`
                : "Seleciona época e campeonato para ver os rankings."}
            </div>
          </div>
        </CardContent>
      </Card>

      {!championshipId && (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-4 text-muted-foreground">
          Seleciona primeiro a época e o campeonato para carregar os 12 rankings.
        </div>
      )}

      {championshipId && (
        <>
          {rankingsQuery.isLoading && (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
              A carregar rankings...
            </div>
          )}

          {rankingsQuery.error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {(rankingsQuery.error as Error).message}
            </div>
          )}

          {rankingsQuery.data && (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-4">
                <Card className="bg-white/5">
                  <CardHeader title="Contexto" description="Época · Campeonato" />
                  <CardContent className="space-y-1 text-sm">
                    <div className="text-white font-semibold">{selectedChampionship?.name}</div>
                    <div className="text-muted-foreground">{selectedSeason?.name}</div>
                    <div className="pt-2 text-xs text-muted-foreground">
                      12 rankings: Totais, bola parada e destaques individuais.
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-cyan-500/10">
                  <CardHeader title="Total de Golos" />
                  <CardContent>
                    <div className="text-3xl font-semibold text-white">
                      {rankingsQuery.data.totalGoals[0]?.goals ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Equipa líder</div>
                    <div className="text-sm font-medium text-white">
                      {rankingsQuery.data.totalGoals[0]?.team ?? "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-500/15 via-slate-500/10 to-indigo-500/5">
                  <CardHeader title="Organização" />
                  <CardContent>
                    <div className="text-3xl font-semibold text-white">
                      {rankingsQuery.data.organization[0]?.goals ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Melhor em organização</div>
                    <div className="text-sm font-medium text-white">
                      {rankingsQuery.data.organization[0]?.team ?? "—"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5">
                  <CardHeader title="Transição" />
                  <CardContent>
                    <div className="text-3xl font-semibold text-white">
                      {rankingsQuery.data.transition[0]?.goals ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Melhor em transição</div>
                    <div className="text-sm font-medium text-white">
                      {rankingsQuery.data.transition[0]?.team ?? "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <RankingCard title="1. Total de Golos" rows={rankingsQuery.data.totalGoals} valueKey="goals" valueLabel="golos" />
                <RankingCard title="2. Golos em Organização" rows={rankingsQuery.data.organization} valueKey="goals" valueLabel="golos" />
                <RankingCard title="3. Golos em Transição" rows={rankingsQuery.data.transition} valueKey="goals" valueLabel="golos" />
                <RankingCard title="4. Total Bola Parada" rows={rankingsQuery.data.setPiecesTotal} valueKey="goals" valueLabel="golos" />
                <RankingCard title="5. Cantos" rows={rankingsQuery.data.corners} valueKey="goals" valueLabel="golos" />
                <RankingCard title="6. Livres" rows={rankingsQuery.data.freeKicks} valueKey="goals" valueLabel="golos" />
                <RankingCard title="7. Livres Diretos" rows={rankingsQuery.data.freeKicksDirect} valueKey="goals" valueLabel="golos" />
                <RankingCard title="8. Penáltis" rows={rankingsQuery.data.penalties} valueKey="goals" valueLabel="golos" />
                <RankingCard title="9. Lançamentos Laterais" rows={rankingsQuery.data.throwIns} valueKey="goals" valueLabel="golos" />
                <TopPlayersCard title="10. Top Marcadores" rows={rankingsQuery.data.topScorers} valueKey="goals" valueLabel="golos" />
                <TopPlayersCard title="11. Assistências" rows={rankingsQuery.data.topAssists} valueKey="assists" valueLabel="assist." />
                <TopPlayersCard title="12. Participação em Golos (G+A)" rows={rankingsQuery.data.goalInvolvement} valueKey="involvement" valueLabel="ações" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gradient-to-br from-[#0a1020] via-[#0d162a] to-[#0a1020]/80">
        <CardHeader title="Comparar campeonatos/épocas" description="Seleciona dois contextos para comparar Organização, Transição e Bola Parada." />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Contexto A</div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Época</label>
              <Select value={seasonA} onChange={(e) => setSeasonA(e.target.value)}>
                <option value="" className="text-black">
                  Qualquer época
                </option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id} className="text-black">
                    {season.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Campeonato</label>
              <Select value={champA} onChange={(e) => setChampA(e.target.value)}>
                <option value="" className="text-black">
                  Qualquer campeonato
                </option>
                {filteredChampsA.map((champ) => (
                  <option key={champ.id} value={champ.id} className="text-black">
                    {champ.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Contexto B</div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Época</label>
              <Select value={seasonB} onChange={(e) => setSeasonB(e.target.value)}>
                <option value="" className="text-black">
                  Qualquer época
                </option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id} className="text-black">
                    {season.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Campeonato</label>
              <Select value={champB} onChange={(e) => setChampB(e.target.value)}>
                <option value="" className="text-black">
                  Qualquer campeonato
                </option>
                {filteredChampsB.map((champ) => (
                  <option key={champ.id} value={champ.id} className="text-black">
                    {champ.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!comparisonReady && (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-4 text-muted-foreground">
          Seleciona os dois contextos para ver a comparação lado a lado.
        </div>
      )}

      {comparisonReady && compareQuery.isLoading && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">A comparar...</div>
      )}

      {comparisonReady && compareQuery.error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(compareQuery.error as Error).message}
        </div>
      )}

      {comparisonReady && compareQuery.data && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white/5">
              <CardHeader title="Contexto A" />
              <CardContent className="space-y-1 text-sm">
                <div className="text-white font-semibold">{nameA}</div>
                <div className="text-muted-foreground">Total golos: {compareQuery.data.A.totalGoals}</div>
                <div className="text-muted-foreground">Época ID: {compareQuery.data.A.seasonId ?? "—"}</div>
                <div className="text-muted-foreground">Campeonato ID: {compareQuery.data.A.championshipId ?? "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5">
              <CardHeader title="Contexto B" />
              <CardContent className="space-y-1 text-sm">
                <div className="text-white font-semibold">{nameB}</div>
                <div className="text-muted-foreground">Total golos: {compareQuery.data.B.totalGoals}</div>
                <div className="text-muted-foreground">Época ID: {compareQuery.data.B.seasonId ?? "—"}</div>
                <div className="text-muted-foreground">Campeonato ID: {compareQuery.data.B.championshipId ?? "—"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ComparisonStat
              label="Organização"
              valueA={compareQuery.data.A.organization}
              valueB={compareQuery.data.B.organization}
              nameA={nameA}
              nameB={nameB}
            />
            <ComparisonStat
              label="Transição"
              valueA={compareQuery.data.A.transition}
              valueB={compareQuery.data.B.transition}
              nameA={nameA}
              nameB={nameB}
            />
            <ComparisonStat
              label="Bola Parada"
              valueA={compareQuery.data.A.setPieces}
              valueB={compareQuery.data.B.setPieces}
              nameA={nameA}
              nameB={nameB}
            />
            <ComparisonStat
              label="Total de Golos"
              valueA={compareQuery.data.A.totalGoals}
              valueB={compareQuery.data.B.totalGoals}
              nameA={nameA}
              nameB={nameB}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (!isMounted) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Rankings e Comparações</h1>
            <p className="text-sm text-muted-foreground">
              Analisa rankings por liga ou coloca dois campeonatos/épocas lado a lado sem alterar a base de dados.
            </p>
          </div>
          <div className="flex rounded-full border border-border/60 bg-white/5 p-1 text-sm">
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-muted-foreground">Ligas</div>
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-muted-foreground">Comparar</div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
          A preparar rankings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rankings e Comparações</h1>
          <p className="text-sm text-muted-foreground">
            Analisa rankings por liga ou coloca dois campeonatos/épocas lado a lado sem alterar a base de dados.
          </p>
        </div>
        <div className="flex rounded-full border border-border/60 bg-white/5 p-1 text-sm">
          {[
            { key: "ligas", label: "Ligas", icon: <Trophy className="h-4 w-4" /> },
            { key: "comparar", label: "Comparar", icon: <GitCompare className="h-4 w-4" /> }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as "ligas" | "comparar")}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2",
                tab === item.key ? "bg-white text-slate-900" : "text-muted-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "ligas" ? renderRankings() : renderComparison()}
    </div>
  );
}
