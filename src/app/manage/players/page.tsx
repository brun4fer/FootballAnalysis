"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

type Player = {
  id: number;
  name: string;
  teamId: number;
  primaryPosition: string;
  secondaryPosition?: string | null;
  tertiaryPosition?: string | null;
  dominantFoot?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

type Team = { id: number; name: string };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Pedido falhou");
  return res.json();
}

export default function ManagePlayersPage() {
  const qc = useQueryClient();
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [form, setForm] = useState({
    teamId: "",
    name: "",
    primaryPosition: "",
    secondaryPosition: "",
    tertiaryPosition: "",
    dominantFoot: "",
    heightCm: "",
    weightKg: ""
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const lookupsQuery = useQuery({ queryKey: ["lookups"], queryFn: () => fetchJson<{ teams: Team[] }>(`/api/lookups`) });
  const playersQuery = useQuery({
    queryKey: ["manage-players", teamFilter],
    queryFn: () => fetchJson<Player[]>(`/api/manage/players${teamFilter ? `?teamId=${teamFilter}` : ""}`)
  });

  const teams = lookupsQuery.data?.teams ?? [];

  const savePlayer = useMutation({
    mutationFn: async () => {
      const body = {
        teamId: Number(form.teamId),
        name: form.name,
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Jogadores</h1>
        <p className="text-sm text-muted-foreground">Gerir plantéis e manter listas atualizadas.</p>
      </div>

      <Card>
        <CardHeader title={editingId ? "Atualizar Jogador" : "Adicionar Jogador"} description="Os jogadores têm de pertencer a uma equipa" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Equipa</label>
            <Select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">Selecionar equipa</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
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
            <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="w-56">
              <option value="">Todas as equipas</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          {playersQuery.data?.length ? (
            playersQuery.data.map((player) => (
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
                      setForm({
                        teamId: String(player.teamId),
                        name: player.name,
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
        </CardContent>
      </Card>
    </div>
  );
}
