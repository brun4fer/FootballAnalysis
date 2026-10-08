"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Season = { id: number; name: string; description?: string | null };
type Championship = { id: number; name: string; country: string; seasonId: number; logo?: string | null };
type Moment = { id: number; name: string };
type SubMoment = { id: number; name: string; momentId: number; sortOrder: number; isActive: boolean };

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
  return res.json();
}

export default function ConfigPage() {
  const qc = useQueryClient();
  const [seasonForm, setSeasonForm] = useState({ name: "", description: "" });
  const [champForm, setChampForm] = useState({ name: "", country: "", seasonId: "", logo: "" });
  const [editingSeason, setEditingSeason] = useState<number | null>(null);
  const [editingChamp, setEditingChamp] = useState<number | null>(null);
  const [taxonomyMomentId, setTaxonomyMomentId] = useState("");
  const [newSubMomentName, setNewSubMomentName] = useState("");
  const [editingSubMomentId, setEditingSubMomentId] = useState<number | null>(null);
  const [editingSubMomentName, setEditingSubMomentName] = useState("");
  const [taxonomyMessage, setTaxonomyMessage] = useState<string | null>(null);

  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: () => fetchJson<Season[]>(`/api/manage/seasons`) });
  const champsQuery = useQuery({
    queryKey: ["championships"],
    queryFn: () => fetchJson<{ championships: Championship[]; seasons: Season[] }>(`/api/manage/championships`)
  });
  const taxonomyQuery = useQuery({
    queryKey: ["taxonomy-admin"],
    queryFn: () => fetchJson<{ moments: Moment[]; subMoments: SubMoment[] }>("/api/lookups?includeInactive=1")
  });

  const seasons = seasonsQuery.data ?? champsQuery.data?.seasons ?? [];
  const championships = champsQuery.data?.championships ?? [];
  const taxonomyMoments = taxonomyQuery.data?.moments ?? [];
  const visibleSubMoments = useMemo(
    () =>
      (taxonomyQuery.data?.subMoments ?? [])
        .filter((subMoment) => subMoment.momentId === Number(taxonomyMomentId))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [taxonomyQuery.data?.subMoments, taxonomyMomentId]
  );

  const refreshTaxonomy = () => {
    qc.invalidateQueries({ queryKey: ["taxonomy-admin"] });
    qc.invalidateQueries({ queryKey: ["lookups"] });
  };

  const saveSubMoment = useMutation({
    mutationFn: async () => {
      setTaxonomyMessage(null);
      if (editingSubMomentId) {
        return fetchJson(`/api/lookups/sub-moments/${editingSubMomentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editingSubMomentName })
        });
      }
      return fetchJson("/api/lookups/sub-moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momentId: Number(taxonomyMomentId), name: newSubMomentName })
      });
    },
    onSuccess: () => {
      refreshTaxonomy();
      setNewSubMomentName("");
      setEditingSubMomentId(null);
      setEditingSubMomentName("");
      setTaxonomyMessage("Sub-moment saved.");
    },
    onError: (error: Error) => setTaxonomyMessage(error.message)
  });

  const setSubMomentActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      fetchJson(`/api/lookups/sub-moments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      }),
    onSuccess: refreshTaxonomy,
    onError: (error: Error) => setTaxonomyMessage(error.message)
  });

  const reorderSubMoments = useMutation({
    mutationFn: (orderedIds: number[]) =>
      fetchJson("/api/lookups/sub-moments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      }),
    onSuccess: refreshTaxonomy,
    onError: (error: Error) => setTaxonomyMessage(error.message)
  });

  const moveSubMoment = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= visibleSubMoments.length) return;
    const reordered = [...visibleSubMoments];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderSubMoments.mutate(reordered.map((entry) => entry.id));
  };

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
      if (!body.seasonId) throw new Error("Season is required");
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
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-muted-foreground">Season and competition administration.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/goals">
            <Button variant="secondary" size="sm" type="button">
              Go to Record Goal
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Moments and sub-moments"
          description="Add, rename, order or hide sub-moments. Hidden entries remain visible in historical goals."
        />
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Moment</label>
              <Select
                value={taxonomyMomentId}
                onChange={(event) => {
                  setTaxonomyMomentId(event.target.value);
                  setEditingSubMomentId(null);
                  setTaxonomyMessage(null);
                }}
              >
                <option value="">Select moment</option>
                {taxonomyMoments.map((moment) => (
                  <option key={moment.id} value={moment.id} className="text-black">
                    {moment.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">New sub-moment</label>
              <Input
                value={newSubMomentName}
                onChange={(event) => setNewSubMomentName(event.target.value)}
                placeholder="Sub-moment name"
                disabled={!taxonomyMomentId}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => saveSubMoment.mutate()}
                disabled={!taxonomyMomentId || newSubMomentName.trim().length < 2 || saveSubMoment.isPending}
              >
                Add
              </Button>
            </div>
          </div>

          {taxonomyMessage && <p className="text-xs text-cyan-200">{taxonomyMessage}</p>}

          <div className="space-y-2">
            {taxonomyMomentId && visibleSubMoments.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
                No sub-moments configured.
              </div>
            )}
            {visibleSubMoments.map((subMoment, index) => (
              <div
                key={subMoment.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                  subMoment.isActive ? "border-border/60" : "border-amber-400/30 bg-amber-500/5 opacity-75"
                }`}
              >
                <span className="w-7 text-center text-xs text-muted-foreground">{index + 1}</span>
                {editingSubMomentId === subMoment.id ? (
                  <Input
                    className="min-w-[220px] flex-1"
                    value={editingSubMomentName}
                    onChange={(event) => setEditingSubMomentName(event.target.value)}
                  />
                ) : (
                  <span className="min-w-[220px] flex-1 text-sm font-medium text-white">{subMoment.name}</span>
                )}
                {!subMoment.isActive && <Badge className="bg-amber-500/10 text-amber-100">Hidden</Badge>}
                <Button type="button" variant="ghost" size="sm" onClick={() => moveSubMoment(index, -1)} disabled={index === 0}>
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSubMoment(index, 1)}
                  disabled={index === visibleSubMoments.length - 1}
                >
                  ↓
                </Button>
                {editingSubMomentId === subMoment.id ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveSubMoment.mutate()}
                      disabled={editingSubMomentName.trim().length < 2 || saveSubMoment.isPending}
                    >
                      Save
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSubMomentId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSubMomentId(subMoment.id);
                      setEditingSubMomentName(subMoment.name);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSubMomentActive.mutate({ id: subMoment.id, isActive: !subMoment.isActive })}
                >
                  {subMoment.isActive ? "Hide" : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={editingSeason ? "Update Season" : "Add Season"} description="Create or edit seasons available to competitions." />
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={seasonForm.name} onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })} placeholder="2025/2026" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={seasonForm.description} onChange={(e) => setSeasonForm({ ...seasonForm, description: e.target.value })} placeholder="Notes or competitions" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingSeason && (
              <Button variant="ghost" type="button" onClick={() => setEditingSeason(null)}>
                Cancel
              </Button>
            )}
            <Button type="button" onClick={() => saveSeason.mutate()} disabled={!seasonForm.name || saveSeason.isPending}>
              {saveSeason.isPending ? "Saving..." : editingSeason ? "Update" : "Add"}
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
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteSeason.mutate(s.id)}>
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No seasons have been added.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={editingChamp ? "Update Competition" : "Add Competition"} description="Link competitions to seasons." />
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={champForm.name} onChange={(e) => setChampForm({ ...champForm, name: e.target.value })} placeholder="Liga Portugal 2" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Country</label>
              <Input value={champForm.country} onChange={(e) => setChampForm({ ...champForm, country: e.target.value })} placeholder="Portugal" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Season</label>
              <Select value={champForm.seasonId} onChange={(e) => setChampForm({ ...champForm, seasonId: e.target.value })}>
                <option value="">Select</option>
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
                Cancel
              </Button>
            )}
            <Button type="button" onClick={() => saveChamp.mutate()} disabled={!champForm.name || !champForm.seasonId || saveChamp.isPending}>
              {saveChamp.isPending ? "Saving..." : editingChamp ? "Update" : "Add"}
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {championships.length ? (
              championships.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.country} — {seasons.find((s) => s.id === c.seasonId)?.name ?? `Season #${c.seasonId}`}
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
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteChamp.mutate(c.id)}>
                      Apagar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No competitions have been added.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
