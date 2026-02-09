"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type LookupResponse = {
  moments: Array<{ id: number; name: string }>;
  subMoments: Array<{ id: number; name: string; momentId: number }>;
  actions: Array<{ id: number; name: string; subMomentId: number }>;
  zones: Array<{ id: number; name: string }>;
};

type Team = { id: number; name: string };
type Player = { id: number; name: string };

type Involvement = { playerId: number; role: "assist" | "involvement" };

const steps = ["team", "scorer", "assists", "context", "zone", "review"] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex gap-2 mb-4 text-xs font-semibold uppercase tracking-wide">
      {steps.map((step, idx) => (
        <div
          key={step}
          className={`rounded-full px-3 py-1 border ${idx === current ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
        >
          {idx + 1}. {step}
        </div>
      ))}
    </div>
  );
}

function ZoneSelector({ zones, value, onChange }: { zones: LookupResponse["zones"]; value?: number; onChange: (id: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {zones.map((zone) => (
        <button
          key={zone.id}
          type="button"
          onClick={() => onChange(zone.id)}
          className={`aspect-[4/3] rounded-lg border text-sm font-medium transition ${
            value === zone.id ? "border-primary bg-primary/10" : "border-border bg-card"
          }`}
        >
          {zone.name}
        </button>
      ))}
    </div>
  );
}

export function GoalWizard() {
  const [step, setStep] = useState(0);
  const [teamId, setTeamId] = useState<number | undefined>();
  const [scorerId, setScorerId] = useState<number | undefined>();
  const [minute, setMinute] = useState(0);
  const [momentId, setMomentId] = useState<number | undefined>();
  const [subMomentId, setSubMomentId] = useState<number | undefined>();
  const [actionId, setActionId] = useState<number | undefined>();
  const [zoneId, setZoneId] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [involvements, setInvolvements] = useState<Involvement[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => fetchJson<Team[]>("/api/teams") });
  const lookupsQuery = useQuery({ queryKey: ["lookups"], queryFn: () => fetchJson<LookupResponse>("/api/lookups") });
  const playersQuery = useQuery({
    queryKey: ["players", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetchJson<Player[]>(`/api/teams/${teamId}/players`)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!teamId || !scorerId || !momentId || !subMomentId || !actionId || !zoneId) {
        throw new Error("Missing required fields");
      }
      const payload = {
        teamId,
        scorerId,
        minute,
        momentId,
        subMomentId,
        actionId,
        goalZoneId: zoneId,
        notes: notes || undefined,
        involvements
      };
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save goal");
      return res.json();
    },
    onSuccess: () => {
      setMessage("Goal saved successfully");
      setStep(0);
      setScorerId(undefined);
      setMinute(0);
      setMomentId(undefined);
      setSubMomentId(undefined);
      setActionId(undefined);
      setZoneId(undefined);
      setNotes("");
      setInvolvements([]);
    },
    onError: (err: any) => setMessage(err.message ?? "Error saving goal")
  });

  const filteredSubMoments = useMemo(() => {
    if (!momentId || !lookupsQuery.data) return [];
    return lookupsQuery.data.subMoments.filter((s) => s.momentId === momentId);
  }, [lookupsQuery.data, momentId]);

  const filteredActions = useMemo(() => {
    if (!subMomentId || !lookupsQuery.data) return [];
    return lookupsQuery.data.actions.filter((a) => a.subMomentId === subMomentId);
  }, [lookupsQuery.data, subMomentId]);

  const currentPlayers = playersQuery.data ?? [];

  const addInvolvement = (playerId: number, role: "assist" | "involvement") => {
    if (!involvements.find((i) => i.playerId === playerId && i.role === role)) {
      setInvolvements([...involvements, { playerId, role }]);
    }
  };

  const removeInvolvement = (playerId: number, role: "assist" | "involvement") => {
    setInvolvements(involvements.filter((i) => !(i.playerId === playerId && i.role === role)));
  };

  const canNext = () => {
    switch (step) {
      case 0:
        return Boolean(teamId);
      case 1:
        return Boolean(scorerId);
      case 2:
        return true;
      case 3:
        return Boolean(momentId && subMomentId && actionId && minute >= 0);
      case 4:
        return Boolean(zoneId);
      default:
        return true;
    }
  };

  const moveNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const movePrev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <Card>
      <CardHeader title="Goal Capture Wizard" description="Guided flow for structured goal logging" />
      <CardContent className="space-y-6">
        <StepIndicator current={step} />

        {step === 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Team</label>
            <Select value={teamId?.toString()} onChange={(e) => setTeamId(Number(e.target.value) || undefined)}>
              <option value="">Select team</option>
              {teamsQuery.data?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Scorer</label>
            <Select
              value={scorerId?.toString()}
              onChange={(e) => setScorerId(Number(e.target.value) || undefined)}
              disabled={!teamId || playersQuery.isLoading}
            >
              <option value="">Select player</option>
              {currentPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Assist / Involvements</label>
              <p className="text-xs text-muted-foreground">Optional: select players and assign roles</p>
            </div>
            <div className="grid gap-2">
              {currentPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span>{p.name}</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => addInvolvement(p.id, "assist")}>
                      Assist
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addInvolvement(p.id, "involvement")}>
                      Involvement
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {involvements.length > 0 && (
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                {involvements.map((inv) => {
                  const player = currentPlayers.find((p) => p.id === inv.playerId);
                  return (
                    <Badge key={`${inv.playerId}-${inv.role}`}>
                      {player?.name ?? inv.playerId} � {inv.role}
                      <button className="ml-2" onClick={() => removeInvolvement(inv.playerId, inv.role)}>
                        �
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Minute</label>
              <Input type="number" min={0} max={130} value={minute} onChange={(e) => setMinute(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Moment</label>
              <Select value={momentId?.toString()} onChange={(e) => setMomentId(Number(e.target.value) || undefined)}>
                <option value="">Select moment</option>
                {lookupsQuery.data?.moments.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub-moment</label>
              <Select
                value={subMomentId?.toString()}
                onChange={(e) => setSubMomentId(Number(e.target.value) || undefined)}
                disabled={!momentId}
              >
                <option value="">Select sub-moment</option>
                {filteredSubMoments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={actionId?.toString()}
                onChange={(e) => setActionId(Number(e.target.value) || undefined)}
                disabled={!subMomentId}
              >
                <option value="">Select action</option>
                {filteredActions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
        )}

        {step === 4 && lookupsQuery.data && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Goalkeeper Zone</label>
            <ZoneSelector zones={lookupsQuery.data.zones} value={zoneId} onChange={setZoneId} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <div className="font-semibold">Review</div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Team</span>
              <span>{teamsQuery.data?.find((t) => t.id === teamId)?.name ?? "-"}</span>
              <span className="text-muted-foreground">Scorer</span>
              <span>{currentPlayers.find((p) => p.id === scorerId)?.name ?? "-"}</span>
              <span className="text-muted-foreground">Minute</span>
              <span>{minute}'</span>
              <span className="text-muted-foreground">Moment</span>
              <span>{lookupsQuery.data?.moments.find((m) => m.id === momentId)?.name ?? "-"}</span>
              <span className="text-muted-foreground">Sub-moment</span>
              <span>{lookupsQuery.data?.subMoments.find((s) => s.id === subMomentId)?.name ?? "-"}</span>
              <span className="text-muted-foreground">Action</span>
              <span>{lookupsQuery.data?.actions.find((a) => a.id === actionId)?.name ?? "-"}</span>
              <span className="text-muted-foreground">Zone</span>
              <span>{lookupsQuery.data?.zones.find((z) => z.id === zoneId)?.name ?? "-"}</span>
            </div>
            {involvements.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {involvements.map((inv) => (
                  <Badge key={`${inv.playerId}-${inv.role}`}>
                    {currentPlayers.find((p) => p.id === inv.playerId)?.name ?? inv.playerId} � {inv.role}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}</div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={movePrev} disabled={step === 0}>
              Back
            </Button>
            {step < steps.length - 1 && (
              <Button type="button" onClick={moveNext} disabled={!canNext()}>
                Next
              </Button>
            )}
            {step === steps.length - 1 && (
              <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isLoading || !canNext()}>
                {createMutation.isLoading ? "Saving..." : "Save Goal"}
              </Button>
            )}
          </div>
        </div>

        {message && <div className="text-sm text-primary">{message}</div>}
      </CardContent>
    </Card>
  );
}
