"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Season = { id: number; name: string; description?: string | null };
type Championship = { id: number; name: string; country: string; seasonId: number; logo?: string | null };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Pedido falhou");
  return res.json();
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const [seasonForm, setSeasonForm] = useState({ name: "", description: "" });
  const [champForm, setChampForm] = useState({ name: "", country: "", seasonId: "", logo: "" });
  const [editingSeason, setEditingSeason] = useState<number | null>(null);
  const [editingChamp, setEditingChamp] = useState<number | null>(null);

  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: () => fetchJson<Season[]>(`/api/manage/seasons`) });
  const champsQuery = useQuery({
    queryKey: ["championships"],
    queryFn: () => fetchJson<{ championships: Championship[]; seasons: Season[] }>(`/api/manage/championships`)
  });

  const seasons = seasonsQuery.data ?? champsQuery.data?.seasons ?? [];
  const championships = champsQuery.data?.championships ?? [];

  const saveSeason = useMutation({
    mutationFn: async () => {
      const body = { ...seasonForm };
      if (editingSeason) {
        await fetchJson(`/api/manage/seasons/${editingSeason}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetchJson(`/api/manage/seasons`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      qc.invalidateQueries({ queryKey: ["championships"] });
      setSeasonForm({ name: "", description: "" });
      setEditingSeason(null);
    }
  });

  const deleteSeason = useMutation({
    mutationFn: (id: number) => fetchJson(`/api/manage/seasons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons"] });
      qc.invalidateQueries({ queryKey: ["championships"] });
    }
  });

  const saveChamp = useMutation({
    mutationFn: async () => {
      const body = { ...champForm, seasonId: Number(champForm.seasonId) };
      if (!body.seasonId) throw new Error("Época obrigatória");
      if (editingChamp) {
        await fetchJson(`/api/manage/championships/${editingChamp}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetchJson(`/api/manage/championships`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championships"] });
      setChampForm({ name: "", country: "", seasonId: champForm.seasonId, logo: "" });
      setEditingChamp(null);
    }
  });

  const deleteChamp = useMutation({
    mutationFn: (id: number) => fetchJson(`/api/manage/championships/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["championships"] })
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gestão administrativa de épocas e campeonatos.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/goals">
            <Button variant="secondary" size="sm" type="button">
              Ir para Registar Golo
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader title={editingSeason ? "Atualizar Época" : "Adicionar Época"} description="Criar/editar épocas disponíveis para campeonatos." />
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} placeholder="2025/2026" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input value={seasonForm.description} onChange={(e) => setSeasonForm({ ...seasonForm, description: e.target.value })} placeholder="Notas ou competições" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingSeason && (
              <Button variant="ghost" type="button" onClick={() => setEditingSeason(null)}>
                Cancelar
              </Button>
            )}
            <Button type="button" onClick={() => saveSeason.mutate()} disabled={!seasonForm.name || saveSeason.isPending}>
              {saveSeason.isPending ? "A guardar..." : editingSeason ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {seasons.length ? (
              seasons.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{s.name}</span>
                    {s.description && <span className="text-xs text-muted-foreground">{s.description}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSeason(s.id);
                        setSeasonForm({ name: s.name, description: s.description || "" });
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteSeason.mutate(s.id)}>
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Nenhuma época registada.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={editingChamp ? "Atualizar Campeonato" : "Adicionar Campeonato"} description="Associar campeonatos a épocas." />
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={champForm.name} onChange={(e) => setChampForm({ ...champForm, name: e.target.value })} placeholder="Liga Portugal 2" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">País</label>
              <Input value={champForm.country} onChange={(e) => setChampForm({ ...champForm, country: e.target.value })} placeholder="Portugal" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Época</label>
              <Select value={champForm.seasonId} onChange={(e) => setChampForm({ ...champForm, seasonId: e.target.value })}>
                <option value="">Selecionar</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id} className="text-black">
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Logo (URL)</label>
              <Input value={champForm.logo} onChange={(e) => setChampForm({ ...champForm, logo: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingChamp && (
              <Button variant="ghost" type="button" onClick={() => setEditingChamp(null)}>
                Cancelar
              </Button>
            )}
            <Button type="button" onClick={() => saveChamp.mutate()} disabled={!champForm.name || !champForm.seasonId || saveChamp.isPending}>
              {saveChamp.isPending ? "A guardar..." : editingChamp ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {championships.length ? (
              championships.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.country} — {seasons.find((s) => s.id === c.seasonId)?.name ?? `Época #${c.seasonId}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.logo && <Badge className="bg-white/5 text-white">Logo</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingChamp(c.id);
                        setChampForm({ name: c.name, country: c.country, seasonId: String(c.seasonId), logo: c.logo || "" });
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteChamp.mutate(c.id)}>
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">Nenhum campeonato registado.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
