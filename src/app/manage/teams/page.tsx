"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";

type Team = {
  id: number;
  name: string;
  championshipId: number;
  emblemPath?: string | null;
  radiographyPdfUrl?: string | null;
  videoReportUrl?: string | null;
  stadium?: string | null;
  coach?: string | null;
  pitchDimensions?: string | null;
  pitchRating?: number | null;
};

type Championship = { id: number; name: string; seasonId: number };
type Season = { id: number; name: string };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Pedido falhou");
  return res.json();
}

export default function ManageTeamsPage() {
  const qc = useQueryClient();
  const [filterSeasonId, setFilterSeasonId] = useState("");
  const [filterChampionshipId, setFilterChampionshipId] = useState("");
  const [formSeasonId, setFormSeasonId] = useState("");
  const [form, setForm] = useState({
    name: "",
    championshipId: "",
    emblemPath: "",
    radiographyPdfUrl: "",
    videoReportUrl: "",
    stadium: "",
    coach: "",
    pitchDimensions: "",
    pitchRating: ""
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const TEAM_PAGE_LIMIT = 5;
  const [teamPage, setTeamPage] = useState(0);

  const lookupsQuery = useQuery({
    queryKey: ["teams-lookups"],
    queryFn: () => fetchJson<{ championships: Championship[]; seasons: Season[] }>(`/api/lookups`)
  });

  const teamsQuery = useQuery({
    queryKey: ["manage-teams", filterChampionshipId],
    enabled: Boolean(filterChampionshipId),
    queryFn: () => fetchJson<Team[]>(`/api/teams?championshipId=${filterChampionshipId}`)
  });

  useEffect(() => {
    setTeamPage(0);
  }, [teamsQuery.data?.length, filterChampionshipId]);

  const championships = lookupsQuery.data?.championships ?? [];
  const seasons = lookupsQuery.data?.seasons ?? [];

  const championshipMap = useMemo(() => new Map(championships.map((c) => [c.id, c])), [championships]);
  const seasonMap = useMemo(() => new Map(seasons.map((s) => [s.id, s.name])), [seasons]);
  const teamPageCount = Math.ceil((teamsQuery.data?.length ?? 0) / TEAM_PAGE_LIMIT);
  const visibleTeams = (teamsQuery.data ?? []).slice(teamPage * TEAM_PAGE_LIMIT, (teamPage + 1) * TEAM_PAGE_LIMIT);

  const filteredChampsForFilters = championships.filter((c) => (!filterSeasonId ? true : c.seasonId === Number(filterSeasonId)));
  const filteredChampsForForm = championships.filter((c) => (!formSeasonId ? true : c.seasonId === Number(formSeasonId)));

  const saveTeam = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        championshipId: Number(form.championshipId),
        emblemPath: form.emblemPath,
        radiographyPdfUrl: form.radiographyPdfUrl,
        videoReportUrl: form.videoReportUrl,
        stadium: form.stadium,
        pitchDimensions: form.pitchDimensions,
        pitchRating: form.pitchRating ? Number(form.pitchRating) : undefined,
        coach: form.coach
      };
      if (!body.championshipId) throw new Error("Championship required");
      if (editingId) {
        await fetchJson(`/api/manage/teams/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      } else {
        await fetchJson(`/api/manage/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manage-teams"], exact: false });
      setForm({
        name: "",
        championshipId: form.championshipId,
        emblemPath: "",
        radiographyPdfUrl: "",
        videoReportUrl: "",
        stadium: "",
        coach: "",
        pitchDimensions: "",
        pitchRating: ""
      });
      setFormSeasonId(formSeasonId);
      setEditingId(null);
    }
  });

  const deleteTeam = useMutation({
    mutationFn: (id: number) => fetchJson(`/api/manage/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manage-teams"], exact: false })
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Equipas</h1>
        <p className="text-sm text-muted-foreground">Gerir equipas e plantéis.</p>
      </div>

      <Card>
        <CardHeader title={editingId ? "Atualizar Equipa" : "Criar Equipa"} description="Todas as equipas estão ligadas a um campeonato" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Época</label>
            <Select
              value={formSeasonId}
              onChange={(e) => {
                const val = e.target.value;
                setFormSeasonId(val);
                setForm({ ...form, championshipId: "" });
              }}
            >
              <option value="">Selecionar Época</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id} className="text-black">
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Campeonato</label>
            <Select value={form.championshipId} onChange={(e) => setForm({ ...form, championshipId: e.target.value })} disabled={!formSeasonId}>
              <option value="">Selecionar</option>
              {filteredChampsForForm.map((c) => (
                <option key={c.id} value={c.id} className="text-black">
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da equipa" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Treinador</label>
            <Input value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} placeholder="Nome do treinador" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Emblema (upload)</label>
            <FileUpload
              label={form.emblemPath ? "Atualizar emblema" : "Carregar emblema"}
              accept="image/*"
              value={form.emblemPath}
              onChange={(path) => setForm({ ...form, emblemPath: path })}
              helperText="Suporta PNG/JPG. Guarda no servidor local."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Radiografia Ofensiva (PDF)</label>
            <FileUpload
              label={form.radiographyPdfUrl ? "Atualizar PDF" : "Carregar PDF"}
              accept="application/pdf"
              value={form.radiographyPdfUrl}
              onChange={(path) => setForm({ ...form, radiographyPdfUrl: path })}
              helperText="Ficheiro guardado no Vercel Blob com URL pública."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Relatório Vídeo (MP4)</label>
            <FileUpload
              label={form.videoReportUrl ? "Atualizar vídeo" : "Carregar vídeo"}
              accept="video/mp4,video/*"
              value={form.videoReportUrl}
              onChange={(path) => setForm({ ...form, videoReportUrl: path })}
              helperText="Suporta MP4; guardado localmente."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Estádio</label>
            <Input value={form.stadium} onChange={(e) => setForm({ ...form, stadium: e.target.value })} placeholder="Estádio" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Dimensões do relvado</label>
            <Input value={form.pitchDimensions} onChange={(e) => setForm({ ...form, pitchDimensions: e.target.value })} placeholder="105 x 68 m" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Qualidade do relvado (0-100)</label>
            <Input type="number" value={form.pitchRating} onChange={(e) => setForm({ ...form, pitchRating: e.target.value })} min={0} max={100} />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            {editingId && (
              <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
            )}
            <Button type="button" onClick={() => saveTeam.mutate()} disabled={!form.name || !form.championshipId || saveTeam.isPending}>
              {saveTeam.isPending ? "A guardar..." : editingId ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Equipas" description="Clubes existentes" />
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
            <div className="flex-1 min-w-[180px] space-y-1">
              <label className="text-xs text-muted-foreground">Filtrar por Época</label>
              <Select
                value={filterSeasonId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterSeasonId(val);
                  setFilterChampionshipId("");
                }}
              >
                <option value="">Selecionar Época</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id} className="text-black">
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[180px] space-y-1">
              <label className="text-xs text-muted-foreground">Filtrar por campeonato</label>
              <Select
                value={filterChampionshipId}
                onChange={(e) => setFilterChampionshipId(e.target.value)}
                disabled={!filterSeasonId}
              >
                <option value="">Selecionar campeonato</option>
                {filteredChampsForFilters.map((c) => (
                  <option key={c.id} value={c.id} className="text-black">
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {!filterChampionshipId && (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-4 text-muted-foreground">
              Selecionar um campeonato para ver as equipas.
            </div>
          )}

          {filterChampionshipId && teamsQuery.data?.length ? (
            <>
              <div className="grid gap-3">
                {visibleTeams.map((team) => {
                  const champ = championshipMap.get(team.championshipId);
                  return (
                    <div key={team.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 hover:border-primary/60">
                      <div className="flex flex-col">
                      <span className="font-medium text-white">{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {champ?.name ?? `Campeonato #${team.championshipId}`}
                        {champ?.seasonId && seasonMap.get(champ.seasonId) ? ` · ${seasonMap.get(champ.seasonId)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{team.coach || "Treinador por definir"}</Badge>
                      {team.radiographyPdfUrl && (
                        <a href={team.radiographyPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline">
                          PDF
                        </a>
                      )}
                      {team.videoReportUrl && (
                        <a href={team.videoReportUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 underline">
                          Ví­deo
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(team.id);
                          const champSeason = championshipMap.get(team.championshipId)?.seasonId;
                          setFormSeasonId(champSeason ? String(champSeason) : "");
                          setForm({
                            name: team.name,
                            championshipId: String(team.championshipId),
                            emblemPath: team.emblemPath || "",
                            radiographyPdfUrl: team.radiographyPdfUrl || "",
                            videoReportUrl: team.videoReportUrl || "",
                            stadium: team.stadium || "",
                            coach: team.coach || "",
                            pitchDimensions: team.pitchDimensions || "",
                            pitchRating: team.pitchRating != null ? String(team.pitchRating) : ""
                          });
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTeam.mutate(team.id)}>
                        Apagar
                      </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {teamPageCount > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
                  <span>
                    Página {teamPage + 1} de {teamPageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setTeamPage((prev) => Math.max(prev - 1, 0))} disabled={teamPage === 0}>
                      Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTeamPage((prev) => Math.min(prev + 1, Math.max(teamPageCount - 1, 0)))}
                      disabled={teamPage >= teamPageCount - 1}
                    >
                      Seguinte
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : filterChampionshipId ? (
            <div className="text-muted-foreground">Sem equipas para este campeonato.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
