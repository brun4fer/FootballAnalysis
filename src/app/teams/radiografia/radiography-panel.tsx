"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SimpleBar, SimplePie } from "@/components/ui/charts";

type TeamOption = {
  id: number;
  name: string;
  emblemPath?: string | null;
  coach?: string | null;
  stadium?: string | null;
  pitchDimensions?: string | null;
};

type PlayerRow = {
  id: number;
  name: string;
  photoPath?: string | null;
  goals?: number;
  assists?: number;
  involvement?: number;
};

type RadiographyResponse = {
  distribution: { category: string; goals: number }[];
  assistZones: Array<{ sector?: string | null }>;
  shotZones: Array<{ sector?: string | null }>;
  finishZones: Array<{ sector?: string | null }>;
  topScorers: PlayerRow[];
  topAssists: PlayerRow[];
  topParticipation: PlayerRow[];
  buildUpPhases: Array<{ phase: string; goals: number }>;
  creationPhases: Array<{ phase: string; goals: number }>;
  finalizationPhases: Array<{ phase: string; goals: number }>;
  goalkeeperOutlets: Array<{ outlet: string; goals: number }>;
  cornerProfiles: Array<{ profile: string; goals: number }>;
  freekickProfiles: Array<{ profile: string; goals: number }>;
  throwInProfiles: Array<{ profile: string; goals: number }>;
  team: TeamOption | null;
};

const defaultImage = "/images/default.png";

const aggregateZones = (zones: Array<{ sector?: string | null }>) => {
  const counts: Record<string, number> = {};
  zones.forEach((zone) => {
    const label = zone.sector?.trim() || "Indefinido";
    counts[label] = (counts[label] ?? 0) + 1;
  });
  return Object.entries(counts).map(([label, goals]) => ({ label, goals }));
};

function TopPlayersCard({
  title,
  rows,
  valueKey,
  valueLabel
}: {
  title: string;
  rows: PlayerRow[];
  valueKey: "goals" | "assists" | "involvement";
  valueLabel: string;
}) {
  return (
    <Card className="h-full bg-[#0c1220]/70">
      <CardHeader title={title} />
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem dados suficientes.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 3).map((row, idx) => (
              <div
                key={`${row.id}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs text-muted-foreground">{idx + 1}º</span>
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-800">
                    <Image
                      src={row.photoPath || defaultImage}
                      alt={row.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                      priority={idx === 0}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{row.name}</span>
                    <span className="text-xs text-muted-foreground">{valueLabel}</span>
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

export default function RadiographyPanel({
  teams,
  initialTeamId
}: {
  teams: TeamOption[];
  initialTeamId?: number;
}) {
  const [teamId, setTeamId] = useState<number | undefined>(() => {
    if (initialTeamId && teams.some((team) => team.id === initialTeamId)) {
      return initialTeamId;
    }
    return teams[0]?.id;
  });
  const [radiography, setRadiography] = useState<RadiographyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teams.length) return;
    if (initialTeamId && teams.some((team) => team.id === initialTeamId)) {
      setTeamId(initialTeamId);
    } else if (!teamId) {
      setTeamId(teams[0].id);
    }
  }, [initialTeamId, teams, teamId]);

  useEffect(() => {
    if (!teamId) return;
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setRadiography(null);

    fetch(`/api/teams/${teamId}/radiography`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const message = json?.error ?? "Falha ao carregar a radiografia";
          throw new Error(message);
        }
        return res.json() as Promise<RadiographyResponse>;
      })
      .then((payload) => {
        if (!isCancelled) setRadiography(payload);
      })
      .catch((err) => {
        if (!isCancelled) setError(err.message ?? "Erro ao carregar dados");
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [teamId]);

  const distribution = radiography?.distribution ?? [];
  const assistZoneCounts = useMemo(() => aggregateZones(radiography?.assistZones ?? []), [
    radiography?.assistZones
  ]);
  const shotZoneCounts = useMemo(() => aggregateZones(radiography?.shotZones ?? []), [
    radiography?.shotZones
  ]);
  const finishZoneCounts = useMemo(() => aggregateZones(radiography?.finishZones ?? []), [
    radiography?.finishZones
  ]);
  const buildUpPhases = radiography?.buildUpPhases ?? [];
  const creationPhases = radiography?.creationPhases ?? [];
  const finalizationPhases = radiography?.finalizationPhases ?? [];
  const goalkeeperOutlets = radiography?.goalkeeperOutlets ?? [];
  const cornerProfiles = radiography?.cornerProfiles ?? [];
  const freekickProfiles = radiography?.freekickProfiles ?? [];
  const throwInProfiles = radiography?.throwInProfiles ?? [];
  const currentTeam = teams.find((team) => team.id === teamId) ?? radiography?.team;

  if (!teams.length) {
    return <div className="text-sm text-muted-foreground">Sem equipas registadas.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-[#0b1220] p-5 shadow-lg">
        {currentTeam?.emblemPath && (
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border/60 bg-slate-900">
            <Image
              src={currentTeam.emblemPath || defaultImage}
              alt={currentTeam.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Radiografia da Equipa</p>
          <h1 className="text-2xl font-semibold text-white">{currentTeam?.name ?? "Equipa"}</h1>
          <p className="text-xs text-muted-foreground">
            {currentTeam?.coach && `Treinador: ${currentTeam.coach}`}
            {currentTeam?.stadium && ` · Estádio: ${currentTeam.stadium}`}
            {currentTeam?.pitchDimensions && ` · Relvado: ${currentTeam.pitchDimensions}`}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Equipa
          </label>
          <Select value={teamId ?? ""} onChange={(e) => setTeamId(Number(e.target.value) || undefined)}>
            {teams.map((team) => (
              <option key={team.id} value={team.id} className="text-black">
                {team.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Carregando radiografia...</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
      </div>

      {radiography && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader
                title="Distribuição por momentos"
                description="Organização, transição e bola parada"
              />
              <CardContent className="min-h-[220px]">
                {distribution.length > 0 ? (
                  <SimplePie data={distribution} labelKey="category" valueKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem dados de momentos.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader
                title="Saída do GR"
                description="Curto para longo, bola longa e organização"
              />
              <CardContent className="min-h-[220px]">
                {goalkeeperOutlets.length > 0 ? (
                  <SimplePie data={goalkeeperOutlets} labelKey="outlet" valueKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem registos do GR.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Top Marcadores" />
              <CardContent>
                <TopPlayersCard
                  title=""
                  rows={radiography.topScorers}
                  valueKey="goals"
                  valueLabel="G"
                />
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Top Assistências" />
              <CardContent>
                <TopPlayersCard
                  title=""
                  rows={radiography.topAssists}
                  valueKey="assists"
                  valueLabel="A"
                />
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Top Participações" />
              <CardContent>
                <TopPlayersCard
                  title=""
                  rows={radiography.topParticipation}
                  valueKey="involvement"
                  valueLabel="Part."
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Zonas de assistência" />
              <CardContent>
                {assistZoneCounts.length > 0 ? (
                  <SimpleBar data={assistZoneCounts} xKey="label" yKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem dados de assistência.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Zonas de remate" />
              <CardContent>
                {shotZoneCounts.length > 0 ? (
                  <SimpleBar data={shotZoneCounts} xKey="label" yKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem remates registados.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Zonas de finalização" />
              <CardContent>
                {finishZoneCounts.length > 0 ? (
                  <SimpleBar data={finishZoneCounts} xKey="label" yKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem finalizações registadas.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Fase de construção" />
              <CardContent>
                {buildUpPhases.length > 0 ? (
                  <SimpleBar data={buildUpPhases} xKey="phase" yKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem dados de construção.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Fase de criação" />
              <CardContent>
                {creationPhases.length > 0 ? (
                  <SimpleBar data={creationPhases} xKey="phase" yKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem dados de criação.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Fase de finalização" />
              <CardContent>
                {finalizationPhases.length > 0 ? (
                  <SimpleBar data={finalizationPhases} xKey="phase" yKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem dados de finalização.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Cantos" />
              <CardContent>
                {cornerProfiles.length > 0 ? (
                  <SimplePie data={cornerProfiles} labelKey="profile" valueKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem cantos registados.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Livres" />
              <CardContent>
                {freekickProfiles.length > 0 ? (
                  <SimplePie data={freekickProfiles} labelKey="profile" valueKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem livres registados.</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0c1420]/70 border border-border/60">
              <CardHeader title="Lançamentos" />
              <CardContent>
                {throwInProfiles.length > 0 ? (
                  <SimplePie data={throwInProfiles} labelKey="profile" valueKey="goals" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem lançamentos registados.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
