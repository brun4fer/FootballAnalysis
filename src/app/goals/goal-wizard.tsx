"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/components/ui/app-context";

type LookupResponse = {
  moments: Array<{ id: number; name: string }>;
  subMoments: Array<{ id: number; name: string; momentId: number }>;
  actions: Array<{ id: number; name: string; subMomentId: number; context: "field" | "field_goal" }>;
  zones: Array<{ id: number; name: string }>;
  seasons: Array<{ id: number; name: string }>;
  championships: Array<{ id: number; name: string; seasonId: number; logo: string | null }>;
  teams: Array<{ id: number; name: string; championshipId: number }>;
};

type Team = { id: number; name: string };
type Player = { id: number; name: string };

type Involvement = { playerId: number; role: "assist" | "involvement" };
type Stroke = { id: string; color: string; width: number; points: Array<{ x: number; y: number }> };

const palette = ["#67e8f9", "#22d3ee", "#a78bfa", "#f97316", "#22c55e"];

const steps = [
  { id: "season", label: "Época" },
  { id: "championship", label: "Campeonato" },
  { id: "team", label: "Equipa" },
  { id: "scorer", label: "Marcador & Assistência" },
  { id: "context", label: "Contexto" },
  { id: "zone", label: "Baliza" },
  { id: "field", label: "Campo" },
  { id: "review", label: "Revisão" }
] as const;

type StepId = (typeof steps)[number]["id"];

const goalZoneShapes = [
  { key: "Upper Left", points: "5,5 33,5 33,50 5,50" },
  { key: "Upper Center", points: "33,5 66,5 66,50 33,50" },
  { key: "Upper Right", points: "66,5 95,5 95,50 66,50" },
  { key: "Lower Left", points: "5,50 33,50 33,95 5,95" },
  { key: "Lower Center", points: "33,50 66,50 66,95 33,95" },
  { key: "Lower Right", points: "66,50 95,50 95,95 66,95" }
];

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error((await res.json()).error ?? "Pedido falhou");
  return res.json();
}

function StepIndicator({ current }: { current: StepId }) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-transparent px-4 py-3">
      <div className="absolute inset-x-0 top-1 h-[2px] bg-gradient-to-r from-cyan-500/50 via-emerald-400/50 to-transparent" />
      {steps.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        return (
          <div key={step.id} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                isActive
                  ? "border-cyan-400 bg-cyan-400/20 text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                  : isDone
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                    : "border-border/70 bg-card text-muted-foreground"
              }`}
            >
              {idx + 1}
            </div>
            <span className={isActive ? "text-white" : isDone ? "text-emerald-100" : "text-muted-foreground"}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
function GoalNetSelector({
  zones,
  value,
  onChange
}: {
  zones: LookupResponse["zones"];
  value?: number | null;
  onChange: (id: number) => void;
}) {
  const resolveZoneId = (label: string) => zones.find((z) => z.name.toLowerCase() === label.toLowerCase())?.id;

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-[#0b1220] shadow-[0_0_50px_rgba(103,232,249,0.1)]">
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="netGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="96" height="96" fill="url(#netGradient)" stroke="#164e63" strokeWidth="1.5" rx="4" />
          {goalZoneShapes.map((shape) => {
            const id = resolveZoneId(shape.key);
            const selected = value === id;
            return (
              <polygon
                key={shape.key}
                points={shape.points}
                onClick={() => id && onChange(id)}
                className="cursor-pointer transition-all"
                fill={selected ? "rgba(103,232,249,0.35)" : "rgba(15,23,42,0.6)"}
                stroke={selected ? "#67e8f9" : "rgba(226,232,240,0.2)"}
                strokeWidth={selected ? 2.2 : 1.2}
              />
            );
          })}
          <path d="M2 50h96M33 2v96M66 2v96" stroke="rgba(226,232,240,0.16)" strokeWidth="0.8" />
        </svg>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Clique na zona da baliza. Os ids seguem a tabela goalkeeper_zones.</p>
        <div className="grid grid-cols-2 gap-2">
          {goalZoneShapes.map((shape) => {
            const id = resolveZoneId(shape.key);
            const selected = value === id;
            return (
              <button
                key={shape.key}
                type="button"
                disabled={!id}
                onClick={() => id && onChange(id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selected ? "border-cyan-400/80 bg-cyan-400/10 text-white shadow-[0_0_12px_rgba(103,232,249,0.35)]" : "border-border/70 bg-card text-muted-foreground"
                }`}
              >
                {shape.key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PitchDrawer({
  strokes,
  onChange
}: {
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [active, setActive] = useState<Stroke | null>(null);
  const [color, setColor] = useState(palette[0]);

  const normalizePoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height)
    };
  };

  const start = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = normalizePoint(e.clientX, e.clientY);
    if (!pt) return;
    const stroke: Stroke = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      color,
      width: 2.2,
      points: [pt]
    };
    setActive(stroke);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!active) return;
    const pt = normalizePoint(e.clientX, e.clientY);
    if (!pt) return;
    setActive({ ...active, points: [...active.points, pt] });
  };

  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    if (active && active.points.length > 1) {
      onChange([...strokes, active]);
    }
    setActive(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const undo = () => onChange(strokes.slice(0, -1));
  const clear = () => onChange([]);

  const allStrokes = active ? [...strokes, active] : strokes;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground">Traço</span>
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border ${color === c ? "border-white shadow-[0_0_0_2px_rgba(103,232,249,0.4)]" : "border-border/50"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={undo} disabled={strokes.length === 0}>
          Desfazer
        </Button>
        <Button variant="ghost" size="sm" onClick={clear} disabled={strokes.length === 0}>
          Limpar
        </Button>
      </div>
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-3 shadow-[0_10px_60px_rgba(0,0,0,0.4)]">
        <svg
          ref={svgRef}
          viewBox="0 0 105 68"
          className="h-[340px] w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
        >
          <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />
          <rect x="1" y="1" width="103" height="66" rx="8" stroke="rgba(103,232,249,0.35)" strokeWidth="0.8" strokeDasharray="4 4" fill="none" />
          <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
          <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />
          <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />
          <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />
          {allStrokes.map((stroke) => (
            <polyline
              key={stroke.id}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={stroke.points.map((p) => `${p.x * 105},${p.y * 68}`).join(" ")}
            />
          ))}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">
        Coordenadas são normalizadas (0-1) e guardadas como JSONB em <code className="font-mono text-emerald-300">field_drawing</code>.
      </p>
    </div>
  );
}
function CreateItemModal({
  open,
  title,
  placeholder,
  onClose,
  onSave,
  includeContext = false
}: {
  open: boolean;
  title: string;
  placeholder: string;
  onClose: () => void;
  includeContext?: boolean;
  onSave: (name: string, context?: "field" | "field_goal") => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [context, setContext] = useState<"field" | "field_goal">("field");
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-[#0c1527] p-5 shadow-2xl shadow-cyan-500/15">
        <div className="text-lg font-semibold text-white">{title}</div>
        <div className="mt-3 space-y-3">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
          {includeContext && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Contexto da ação</label>
              <Select value={context} onChange={(e) => setContext((e.target.value as "field" | "field_goal") ?? "field")}>
                <option value="field">Campo (sem baliza obrigatória)</option>
                <option value="field_goal">Campo + Baliza</option>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!value.trim()) return;
                setSaving(true);
                await onSave(value.trim(), context);
                setSaving(false);
                setValue("");
                setContext("field");
                onClose();
              }}
              disabled={saving}
            >
              {saving ? "A guardar..." : "Criar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoalWizard() {
  const qc = useQueryClient();
  const { updatePartial } = useAppContext();
  const [step, setStep] = useState<StepId>("season");
  const [seasonId, setSeasonId] = useState<number | undefined>();
  const [championshipId, setChampionshipId] = useState<number | undefined>();
  const [teamId, setTeamId] = useState<number | undefined>();
  const [matchId, setMatchId] = useState<number | undefined>();
  const [scorerId, setScorerId] = useState<number | undefined>();
  const [assistId, setAssistId] = useState<number | undefined>();
  const [minute, setMinute] = useState(0);
  const [momentId, setMomentId] = useState<number | undefined>();
  const [subMomentId, setSubMomentId] = useState<number | undefined>();
  const [actionId, setActionId] = useState<number | undefined>();
  const [zoneId, setZoneId] = useState<number | undefined | null>(null);
  const [notes, setNotes] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [involvements, setInvolvements] = useState<Involvement[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: "moment" | "submoment" | "action"; open: boolean }>({
    kind: "moment",
    open: false
  });

  const lookupsQuery = useQuery({ queryKey: ["lookups"], queryFn: () => fetchJson<LookupResponse>("/api/lookups") });
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: () => fetchJson<Team[]>("/api/teams") });
  const playersQuery = useQuery({
    queryKey: ["players", teamId],
    enabled: Boolean(teamId),
    queryFn: () => fetchJson<Player[]>(`/api/teams/${teamId}/players`)
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!teamId || !scorerId || !momentId || !subMomentId || !actionId) {
        throw new Error("Campos obrigatórios em falta");
      }
      if (!seasonId || !championshipId) throw new Error("Selecione época e campeonato.");

      const actionMeta = lookupsQuery.data?.actions.find((a) => a.id === actionId);
      const requiresGoal = actionMeta ? actionMeta.name.toLowerCase().includes("marcador") : false;

      if (requiresGoal && !zoneId) throw new Error("Esta ação requer zona da baliza.");
      if (!strokes.length) throw new Error("Desenho de campo obrigatório para esta ação.");

      const payload = {
        matchId,
        teamId,
        scorerId,
        assistId: assistId ?? null,
        minute,
        momentId,
        subMomentId,
        actionId,
        goalZoneId: requiresGoal ? zoneId : null,
        videoUrl: videoUrl || undefined,
        fieldDrawing: strokes.length ? { strokes, width: 1, height: 1 } : undefined,
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
      setMessage("Golo gravado com sucesso.");
      setStep("team");
      setScorerId(undefined);
      setAssistId(undefined);
      setMinute(0);
      setMomentId(undefined);
      setSubMomentId(undefined);
      setActionId(undefined);
      setZoneId(null);
      setNotes("");
      setVideoUrl("");
      setInvolvements([]);
      setStrokes([]);
    },
    onError: (err: any) => setMessage(err.message ?? "Erro ao gravar o golo")
  });

  const filteredChampionships = useMemo(() => {
    if (!lookupsQuery.data) return [];
    return lookupsQuery.data.championships.filter((c) => (seasonId ? c.seasonId === seasonId : true));
  }, [lookupsQuery.data, seasonId]);

  const filteredTeams = useMemo(() => {
    if (!lookupsQuery.data) return [];
    return lookupsQuery.data.teams.filter((t) => (championshipId ? t.championshipId === championshipId : true));
  }, [lookupsQuery.data, championshipId]);

  const filteredSubMoments = useMemo(() => {
    if (!momentId || !lookupsQuery.data) return [];
    return lookupsQuery.data.subMoments.filter((s) => s.momentId === momentId);
  }, [lookupsQuery.data, momentId]);

  const filteredActions = useMemo(() => {
    if (!subMomentId || !lookupsQuery.data) return [];
    return lookupsQuery.data.actions.filter((a) => a.subMomentId === subMomentId);
  }, [lookupsQuery.data, subMomentId]);

  const selectedAction = filteredActions.find((a) => a.id === actionId);
  const requiresGoal = selectedAction ? selectedAction.name.toLowerCase().includes("marcador") : false;
  const requiresField = Boolean(selectedAction); // todas as ações pedem registo de campo

  const currentPlayers = playersQuery.data ?? [];
  const addInvolvement = (playerId: number) => {
    if (!involvements.find((i) => i.playerId === playerId && i.role === "involvement")) {
      setInvolvements([...involvements, { playerId, role: "involvement" }]);
    }
  };

  const removeInvolvement = (playerId: number, role: Involvement["role"]) => {
    setInvolvements(involvements.filter((i) => !(i.playerId === playerId && i.role === role)));
  };

  const canNext = (current: StepId) => {
    switch (current) {
      case "season":
        return Boolean(seasonId);
      case "championship":
        return Boolean(championshipId);
      case "team":
        return Boolean(teamId);
      case "scorer":
        return Boolean(scorerId);
      case "context":
        return Boolean(momentId && subMomentId && actionId && minute >= 0);
      case "zone":
        return requiresGoal ? Boolean(zoneId) : true;
      case "field":
        return requiresField ? strokes.length > 0 : true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const currentIndex = steps.findIndex((s) => s.id === step);
  const movePrev = () => setStep(steps[Math.max(0, currentIndex - 1)].id);
  const moveNext = () => setStep(steps[Math.min(steps.length - 1, currentIndex + 1)].id);
  const readyToSave = Boolean(seasonId && championshipId && teamId && scorerId && momentId && subMomentId && actionId && canNext("zone") && canNext("field"));

  async function handleCreate(kind: "moment" | "submoment" | "action", name: string, context?: "field" | "field_goal") {
    if (kind === "moment") {
      await fetchJson("/api/lookups/moments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    } else if (kind === "submoment") {
      if (!momentId) throw new Error("Selecione um momento antes de criar sub-momento.");
      await fetchJson("/api/lookups/sub-moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momentId, name })
      });
    } else {
      if (!subMomentId) throw new Error("Selecione um sub-momento antes de criar ação.");
      await fetchJson("/api/lookups/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subMomentId, name, context: context ?? "field" })
      });
    }
    await qc.invalidateQueries({ queryKey: ["lookups"] });
  }
  return (
    <>
      <Card className="border border-border/70 bg-gradient-to-br from-[#0b1220] via-[#0c1527] to-[#0b1220] shadow-[0_30px_120px_rgba(14,165,233,0.08)]">
        <CardHeader title="Wizard de Registo de Golo" description="Fluxo estruturado para guardar eventos de golo em tempo real." />
        <CardContent className="space-y-6">
          <StepIndicator current={step} />

          {step === "season" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Época</label>
                <Select
                  value={seasonId?.toString() ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSeasonId(val ? Number(val) : undefined);
                    if (val) {
                      const s = lookupsQuery.data?.seasons.find((x) => x.id === Number(val));
                      updatePartial({ seasonId: Number(val), seasonName: s?.name });
                    } else {
                      updatePartial({ seasonId: undefined, seasonName: undefined });
                    }
                    setChampionshipId(undefined);
                    setTeamId(undefined);
                    setScorerId(undefined);
                    setAssistId(undefined);
                  }}
                >
                  <option value="">Selecionar época</option>
                  {lookupsQuery.data?.seasons.map((s) => (
                    <option key={s.id} value={s.id} className="text-black">
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                Precisa criar uma época? <a href="/manage/config" className="text-cyan-300 underline">Abrir Configurações</a>
              </div>
            </div>
          )}

          {step === "championship" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campeonato</label>
                <Select
                  value={championshipId?.toString() ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChampionshipId(val ? Number(val) : undefined);
                    if (val) {
                      const c = filteredChampionships.find((x) => x.id === Number(val));
                      updatePartial({ championshipId: Number(val), championshipName: c?.name });
                    } else {
                      updatePartial({ championshipId: undefined, championshipName: undefined });
                    }
                    setTeamId(undefined);
                    setScorerId(undefined);
                    setAssistId(undefined);
                  }}
                  disabled={!seasonId}
                >
                  <option value="">Selecionar campeonato</option>
                  {filteredChampionships.map((c) => (
                    <option key={c.id} value={c.id} className="text-black">
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                Precisa criar um campeonato? <a href="/manage/config" className="text-cyan-300 underline">Abrir Configurações</a>
              </div>
            </div>
          )}

          {step === "team" && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Equipa</label>
                <Select
                  value={teamId?.toString() ?? ""}
                  onChange={(e) => setTeamId(Number(e.target.value) || undefined)}
                  aria-label="team-select"
                  disabled={!championshipId}
                >
                  <option value="">Selecionar equipa</option>
                  {filteredTeams.map((team) => (
                    <option key={team.id} value={team.id} className="text-black">
                      {team.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ID do Jogo (opcional)</label>
                <Input type="number" min={1} value={matchId ?? ""} onChange={(e) => setMatchId(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>
          )}

          {step === "scorer" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Marcador</label>
                <Select
                  value={scorerId?.toString() ?? ""}
                  onChange={(e) => setScorerId(Number(e.target.value) || undefined)}
                  disabled={!teamId || playersQuery.isLoading}
                >
                  <option value="">Selecionar jogador</option>
                  {currentPlayers.map((p) => (
                    <option key={p.id} value={p.id} className="text-black">
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assistência (opcional)</label>
                <Select
                  value={assistId?.toString() ?? ""}
                  onChange={(e) => setAssistId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!teamId || playersQuery.isLoading}
                >
                  <option value="">Sem assistência</option>
                  {currentPlayers
                    .filter((p) => p.id !== scorerId)
                    .map((p) => (
                      <option key={p.id} value={p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Involvimentos secundários</div>
                    <p className="text-xs text-muted-foreground">Marcar jogadores que participaram na jogada para a métrica "Mais interveniente".</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {currentPlayers.map((p) => {
                    const isInvolved = involvements.some((i) => i.playerId === p.id && i.role === "involvement");
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2">
                        <span className="text-sm">{p.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={isInvolved ? "secondary" : "ghost"}
                          onClick={() => (isInvolved ? removeInvolvement(p.id, "involvement") : addInvolvement(p.id))}
                        >
                          {isInvolved ? "Remover" : "Adicionar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {involvements.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {involvements.map((inv) => {
                      const player = currentPlayers.find((p) => p.id === inv.playerId);
                      return (
                        <Badge key={`${inv.playerId}-${inv.role}`} className="bg-emerald-500/10 text-emerald-100">
                          {player?.name ?? inv.playerId} / {inv.role === "assist" ? "assistência" : "envolvimento"}
                          <button className="ml-2" onClick={() => removeInvolvement(inv.playerId, inv.role)}>
                            x
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "context" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minuto</label>
                <Input type="number" min={0} max={130} value={minute} onChange={(e) => setMinute(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Momento</label>
                <Select
                  value={momentId?.toString() ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__create__") {
                      setModal({ kind: "moment", open: true });
                      return;
                    }
                    setMomentId(val ? Number(val) : undefined);
                    setSubMomentId(undefined);
                    setActionId(undefined);
                  }}
                >
                  <option value="">Selecionar momento</option>
                  <option value="__create__">+ Criar novo...</option>
                  {lookupsQuery.data?.moments.map((m) => (
                    <option key={m.id} value={m.id} className="text-black">
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sub-momento</label>
                <Select
                  value={subMomentId?.toString() ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__create__") {
                      setModal({ kind: "submoment", open: true });
                      return;
                    }
                    setSubMomentId(val ? Number(val) : undefined);
                    setActionId(undefined);
                  }}
                  disabled={!momentId}
                >
                  <option value="">Selecionar sub-momento</option>
                  <option value="__create__" disabled={!momentId}>
                    + Criar novo...
                  </option>
                  {filteredSubMoments.map((s) => (
                    <option key={s.id} value={s.id} className="text-black">
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <Select
                  value={actionId?.toString() ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__create__") {
                      setModal({ kind: "action", open: true });
                      return;
                    }
                    setActionId(val ? Number(val) : undefined);
                    setZoneId(null);
                  }}
                  disabled={!subMomentId}
                >
                  <option value="">Selecionar ação</option>
                  <option value="__create__" disabled={!subMomentId}>
                    + Criar novo...
                  </option>
                  {filteredActions.map((a) => {
                    const needsGoal = a.name.toLowerCase().includes("marcador");
                    return (
                      <option key={a.id} value={a.id} className="text-black">
                        {a.name} ({needsGoal ? "Campo + Baliza" : "Campo"})
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto tático ou observações" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Vídeo do golo (URL)</label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://...mp4" />
              </div>
            </div>
          )}

          {step === "zone" && lookupsQuery.data && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Zona da Baliza</label>
                {requiresGoal ? (
                  <span className="text-xs text-muted-foreground">Necessário porque a ação envolve Marcador</span>
                ) : (
                  <span className="text-xs text-emerald-300">Esta ação é apenas de Campo. Selecionar baliza é opcional.</span>
                )}
              </div>
              {requiresGoal ? (
                <GoalNetSelector zones={lookupsQuery.data.zones} value={zoneId} onChange={setZoneId} />
              ) : (
                <div className="rounded-xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
                  A ação selecionada não requer zona da baliza. Pode continuar.
                </div>
              )}
            </div>
          )}

          {step === "field" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Desenho no Campo</div>
                <span className="text-xs text-muted-foreground">
                  {requiresField ? "Obrigatório para esta ação." : "Opcional para referência tática."}
                </span>
              </div>
              <PitchDrawer strokes={strokes} onChange={setStrokes} />
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-card/70 p-4">
                <span className="text-muted-foreground">Época</span>
                <span>{lookupsQuery.data?.seasons.find((s) => s.id === seasonId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Campeonato</span>
                <span>{lookupsQuery.data?.championships.find((c) => c.id === championshipId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Equipa</span>
                <span>{teamsQuery.data?.find((t) => t.id === teamId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Marcador</span>
                <span>{currentPlayers.find((p) => p.id === scorerId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Assistência</span>
                <span>{currentPlayers.find((p) => p.id === assistId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Minuto</span>
                <span>{minute}'</span>
                <span className="text-muted-foreground">Momento</span>
                <span>{lookupsQuery.data?.moments.find((m) => m.id === momentId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Sub-momento</span>
                <span>{lookupsQuery.data?.subMoments.find((s) => s.id === subMomentId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Ação</span>
                <span>{lookupsQuery.data?.actions.find((a) => a.id === actionId)?.name ?? "-"}</span>
                <span className="text-muted-foreground">Contexto</span>
                <span>{requiresGoal ? "Campo + Baliza" : "Campo"}</span>
                <span className="text-muted-foreground">Zona</span>
                <span>{zoneId ? lookupsQuery.data?.zones.find((z) => z.id === zoneId)?.name ?? "-" : "N/A"}</span>
                <span className="text-muted-foreground">Vídeo</span>
                <span>{videoUrl ? "Anexado" : "—"}</span>
              </div>
              {involvements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {involvements.map((inv) => (
                    <Badge key={`${inv.playerId}-${inv.role}`} className="bg-emerald-500/10 text-emerald-100">
                      {currentPlayers.find((p) => p.id === inv.playerId)?.name ?? inv.playerId} /{" "}
                      {inv.role === "assist" ? "assistência" : "envolvimento"}
                    </Badge>
                  ))}
                </div>
              )}
              {strokes.length > 0 ? (
                <div className="rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                  {strokes.length} traco(s) serao guardados em JSONB com {strokes.reduce((sum, s) => sum + s.points.length, 0)} pontos normalizados.
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Sem desenho no campo.</div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Step {currentIndex + 1} / {steps.length}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={movePrev} disabled={currentIndex === 0}>
                Voltar
              </Button>
              {currentIndex < steps.length - 1 && (
                <Button type="button" onClick={moveNext} disabled={!canNext(step)}>
                  Seguinte
                </Button>
              )}
              {step === "review" && (
                <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !readyToSave}>
                  {createMutation.isPending ? "A gravar..." : "Gravar Golo"}
                </Button>
              )}
            </div>
          </div>

          {message && <div className="text-sm text-cyan-300">{message}</div>}
        </CardContent>
      </Card>

      <CreateItemModal
        open={modal.open && modal.kind === "moment"}
        title="Criar Momento"
        placeholder="Nome do momento"
        onClose={() => setModal({ ...modal, open: false })}
        onSave={(name) => handleCreate("moment", name)}
      />
      <CreateItemModal
        open={modal.open && modal.kind === "submoment"}
        title="Criar Sub-momento"
        placeholder="Nome do sub-momento"
        onClose={() => setModal({ ...modal, open: false })}
        onSave={(name) => handleCreate("submoment", name)}
      />
      <CreateItemModal
        open={modal.open && modal.kind === "action"}
        title="Criar Ação"
        placeholder="Nome da ação"
        onClose={() => setModal({ ...modal, open: false })}
        includeContext
        onSave={(name, context) => handleCreate("action", name, context)}
      />
    </>
  );
}
