"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type Team = {
  id: number;
  name: string;
  championshipId: number;
  stadium?: string | null;
  coach?: string | null;
  pitchDimensions?: string | null;
  pitchRating?: number | null;
};

type Championship = { id: number; name: string };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
  return res.json();
}

export default function ManageTeamsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    championshipId: "",
    stadium: "",
    coach: "",
    pitchDimensions: "",
    pitchRating: ""
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const teamsQuery = useQuery({ queryKey: ["manage-teams"], queryFn: () => fetchJson<Team[]>(`/api/manage/teams`) });
  const champsQuery = useQuery({ queryKey: ["champs"], queryFn: () => fetchJson<{ championships: Championship[] } & Record<string, any>>(`/api/lookups`) });

  const championships = champsQuery.data?.championships ?? [];
  const championshipMap = new Map(championships.map((c) => [c.id, c.name]));

  const saveTeam = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        championshipId: Number(form.championshipId),
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
      qc.invalidateQueries({ queryKey: ["manage-teams"] });
      setForm({ name: "", championshipId: form.championshipId, stadium: "", coach: "", pitchDimensions: "", pitchRating: "" });
      setEditingId(null);
    }
  });

  const deleteTeam = useMutation({
    mutationFn: (id: number) => fetchJson(`/api/manage/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manage-teams"] })
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Teams</h1>
        <p className="text-sm text-muted-foreground">Manage Liga Portugal 2 clubs.</p>
      </div>
      <Card>
        <CardHeader title={editingId ? "Update Team" : "Create Team"} description="All teams are linked to a championship" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Championship</label>
            <Select value={form.championshipId} onChange={(e) => setForm({ ...form, championshipId: e.target.value })}>
              <option value="">Select</option>
              {championships.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Coach</label>
            <Input value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} placeholder="Coach name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Stadium</label>
            <Input value={form.stadium} onChange={(e) => setForm({ ...form, stadium: e.target.value })} placeholder="Stadium" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pitch Dimensions</label>
            <Input
              value={form.pitchDimensions}
              onChange={(e) => setForm({ ...form, pitchDimensions: e.target.value })}
              placeholder="105 x 68 m"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pitch Rating (0-100)</label>
            <Input
              type="number"
              value={form.pitchRating}
              onChange={(e) => setForm({ ...form, pitchRating: e.target.value })}
              min={0}
              max={100}
            />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            {editingId && (
              <Button variant="ghost" type="button" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            )}
            <Button type="button" onClick={() => saveTeam.mutate()} disabled={!form.name || !form.championshipId || saveTeam.isLoading}>
              {saveTeam.isLoading ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Teams" description="Existing clubs" />
        <CardContent className="space-y-3 text-sm">
          {teamsQuery.data?.length ? (
            teamsQuery.data.map((team) => (
              <div key={team.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 hover:border-primary/60">
                <div className="flex flex-col">
                  <span className="font-medium text-white">{team.name}</span>
                  <span className="text-xs text-muted-foreground">{championshipMap.get(team.championshipId) ?? `Championship #${team.championshipId}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{team.coach || "Coach TBD"}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(team.id);
                      setForm({
                        name: team.name,
                        championshipId: String(team.championshipId),
                        stadium: team.stadium || "",
                        coach: team.coach || "",
                        pitchDimensions: team.pitchDimensions || "",
                        pitchRating: team.pitchRating != null ? String(team.pitchRating) : ""
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteTeam.mutate(team.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">No teams yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
