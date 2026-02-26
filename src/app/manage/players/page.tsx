"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/components/ui/app-context";
import { FileUpload } from "@/components/ui/file-upload";

type Player = {
  id: number;
  name: string;
  teamId: number;
  photoPath?: string | null;
  primaryPosition: string;
  secondaryPosition?: string | null;
  tertiaryPosition?: string | null;
  dominantFoot?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

type Team = { id: number; name: string; championshipId: number };
type Season = { id: number; name: string };
type Championship = { id: number; name: string; seasonId: number };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Pedido falhou");
  return res.json();
}

export default function ManagePlayersPage() {
  const qc = useQueryClient();
  const { updatePartial, selection } = useAppContext();
  const [seasonId, setSeasonId] = useState<string>(selection.seasonId ? String(selection.seasonId) : "");
  const [championshipId, setChampionshipId] = useState<string>(selection.championshipId ? String(selection.championshipId) : "");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [form, setForm] = useState({
    teamId: "",
    name: "",
    photoPath: "",
    primaryPosition: "",
    secondaryPosition: "",
    tertiaryPosition: "",
    dominantFoot: "",
    heightCm: "",
    weightKg: ""
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const PLAYER_PAGE_LIMIT = 5;
  const [playersPage, setPlayersPage] = useState(0);

  const lookupsQuery = useQuery({
    queryKey: ["lookups"],
    queryFn: () => fetchJson<{ teams: Team[]; seasons: Season[]; championships: Championship[] }>(`/api/lookups`)
  });
  const playersQuery = useQuery({
    queryKey: ["manage-players", teamFilter],
    queryFn: () => fetchJson<Player[]>(`/api/manage/players${teamFilter ? `?teamId=${teamFilter}` : ""}`)
  });

  useEffect(() => {
    setPlayersPage(0);
  }, [playersQuery.data?.length, teamFilter]);

  const playerPageCount = Math.ceil((playersQuery.data?.length ?? 0) / PLAYER_PAGE_LIMIT);
  const paginatedPlayers = (playersQuery.data ?? []).slice(playersPage * PLAYER_PAGE_LIMIT, (playersPage + 1) * PLAYER_PAGE_LIMIT);

  const teams = lookupsQuery.data?.teams ?? [];
  const seasons = lookupsQuery.data?.seasons ?? [];
  const championships = lookupsQuery.data?.championships ?? [];

  const filteredChamps = useMemo(
    () => championships.filter((c) => (!seasonId ? true : c.seasonId === Number(seasonId))),
    [championships, seasonId]
  );
  const filteredTeams = useMemo(
    () => teams.filter((t) => (!championshipId ? true : t.championshipId === Number(championshipId))),
    [teams, championshipId]
  );

  const savePlayer = useMutation({
    mutationFn: async () => {
      const body = {
        teamId: Number(form.teamId),
        name: form.name,
        photoPath: form.photoPath,
        primaryPosition: form.primaryPosition,
        secondaryPosition: form.secondaryPosition,
        tertiaryPosition: form.tertiaryPosition,
        dominantFoot: form.dominantFoot,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined
      };
      if (!body.teamId) throw new Error("Equipa obrigatória");
      if (editingId) {
        await fetchJson(`/api/manage/players/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } else {
        await fetchJson(`/api/manage/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manage-players"] });
      setForm({
        teamId: form.teamId,
        name: "",
        photoPath: "",
        primaryPosition: "",
        secondaryPosition: "",
        tertiaryPosition: "",
        dominantFoot: "",
        heightCm: "",
        weightKg: ""
      });
      setEditingId(null);
    }
  });

  const deletePlayer = useMutation({
    mutationFn: (id: number) => fetchJson(`/api/manage/players/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manage-players"] })
  });

  const teamLookup = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const champMap = useMemo(() => new Map(championships.map((c) => [c.id, c])), [championships]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Jogadores</h1>
        <p className="text-sm text-muted-foreground">Gerir equipas e plantéis.</p>
      </div>

      <Card>
        <CardHeader title={editingId ? "Atualizar Jogador" : "Adicionar Jogador"} description="Os jogadores têm de pertencer a uma equipa" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Época</label>
            <Select
              value={seasonId}
              onChange={(e) => {
                const val = e.target.value;
                setSeasonId(val);
                setChampionshipId("");
                setTeamFilter("");
                setForm({ ...form, teamId: "" });
                if (val) {
                  const s = seasons.find((x) => x.id === Number(val));
                  updatePartial({ seasonId: Number(val), seasonName: s?.name, championshipId: undefined, championshipName: undefined });
                } else {
                  updatePartial({ seasonId: undefined, seasonName: undefined, championshipId: undefined, championshipName: undefined });
                }
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
                const val = e.target.value;
                setChampionshipId(val);
                setTeamFilter("");
                setForm({ ...form, teamId: "" });
                if (val) {
                  const c = filteredChamps.find((x) => x.id === Number(val));
                  updatePartial({ championshipId: Number(val), championshipName: c?.name });
                } else {
                  updatePartial({ championshipId: undefined, championshipName: undefined });
                }
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
            <Select
              value={form.teamId}
              onChange={(e) => {
                setForm({ ...form, teamId: e.target.value });
                setTeamFilter(e.target.value);
              }}
              disabled={!championshipId}
            >
              <option value="">Selecionar equipa</option>
              {filteredTeams.map((t) => (
                <option key={t.id} value={t.id} className="text-black">
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do jogador" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Foto</label>
            <FileUpload
              label={form.photoPath ? "Atualizar foto" : "Carregar foto"}
              accept="image/*"
              value={form.photoPath}
              onChange={(path) => setForm({ ...form, photoPath: path })}
              helperText="Use JPG/PNG; guardado em /uploads."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Posição principal</label>
            <Input
              value={form.primaryPosition}
              onChange={(e) => setForm({ ...form, primaryPosition: e.target.value })}
              placeholder="ex.: PL, MC, DC"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Posição secundária</label>
            <Input value={form.secondaryPosition} onChange={(e) => setForm({ ...form, secondaryPosition: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Posição terciária</label>
            <Input value={form.tertiaryPosition} onChange={(e) => setForm({ ...form, tertiaryPosition: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pé dominante</label>
            <Input value={form.dominantFoot} onChange={(e) => setForm({ ...form, dominantFoot: e.target.value })} placeholder="Esquerdo / Direito / Ambos" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Altura (cm)</label>
            <Input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} min={120} max={220} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Peso (kg)</label>
            <Input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} min={40} max={120} />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            {editingId && (
              <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
            )}
            <Button type="button" onClick={() => savePlayer.mutate()} disabled={!form.name || !form.teamId || !form.primaryPosition || savePlayer.isPending}>
              {savePlayer.isPending ? "A guardar..." : editingId ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Jogadores" description="Vista do plantel" />
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2 items-center">
            <Select
              value={seasonId}
              onChange={(e) => {
                const val = e.target.value;
                setSeasonId(val);
                setChampionshipId("");
                setTeamFilter("");
              }}
              className="w-40"
            >
              <option value="">Época</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id} className="text-black">
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              value={championshipId}
              onChange={(e) => {
                const val = e.target.value;
                setChampionshipId(val);
                setTeamFilter("");
              }}
              disabled={!seasonId}
              className="w-48"
            >
              <option value="">Campeonato</option>
              {filteredChamps.map((c) => (
                <option key={c.id} value={c.id} className="text-black">
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} disabled={!championshipId} className="w-48">
              <option value="">Equipa</option>
              {filteredTeams.map((t) => (
                <option key={t.id} value={t.id} className="text-black">
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          {playersQuery.data?.length ? (
            paginatedPlayers.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 hover:border-primary/60">
                <div className="flex flex-col">
                  <span className="font-medium text-white">{player.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[player.primaryPosition, player.secondaryPosition, player.tertiaryPosition].filter(Boolean).join(" / ")} -{" "}
                    {teamLookup.get(player.teamId) ?? ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {player.dominantFoot && <Badge>{player.dominantFoot}</Badge>}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(player.id);
                      const team = teamMap.get(player.teamId);
                      const champ = team ? champMap.get(team.championshipId) : null;
                      setSeasonId(champ ? String(champ.seasonId) : "");
                      setChampionshipId(team ? String(team.championshipId) : "");
                      setTeamFilter(team ? String(team.id) : "");
                      setForm({
                        teamId: String(player.teamId),
                        name: player.name,
                        photoPath: player.photoPath || "",
                        primaryPosition: player.primaryPosition,
                        secondaryPosition: player.secondaryPosition || "",
                        tertiaryPosition: player.tertiaryPosition || "",
                        dominantFoot: player.dominantFoot || "",
                        heightCm: player.heightCm != null ? String(player.heightCm) : "",
                        weightKg: player.weightKg != null ? String(player.weightKg) : ""
                      });
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deletePlayer.mutate(player.id)}>
                    Apagar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">Ainda não existem jogadores.</div>
          )}
          {playerPageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <span>
                Página {playersPage + 1} de {playerPageCount}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPlayersPage((prev) => Math.max(prev - 1, 0))} disabled={playersPage === 0}>
                  Anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPlayersPage((prev) => Math.min(prev + 1, Math.max(playerPageCount - 1, 0)))}
                  disabled={playersPage >= playerPageCount - 1}
                >
                  Seguinte
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
