"use client";





import { useMemo, useRef, useState, useEffect } from "react";


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


import { Button } from "@/components/ui/button";


import { Input } from "@/components/ui/input";


import { Select } from "@/components/ui/select";


import { Card, CardContent, CardHeader } from "@/components/ui/card";


import { Badge } from "@/components/ui/badge";


import { useAppContext } from "@/components/ui/app-context";


import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";





type LookupResponse = {


  moments: Array<{ id: number; name: string }>;


  subMoments: Array<{ id: number; name: string; momentId: number }>;


  actions: Array<{ id: number; name: string; subMomentId: number; context: "field" | "field_goal" }>;


  seasons: Array<{ id: number; name: string }>;


  championships: Array<{ id: number; name: string; seasonId: number; logo: string | null }>;


  teams: Array<{ id: number; name: string; championshipId: number }>;


};





type LookupAction = LookupResponse["actions"][number];


type Team = { id: number; name: string };


type Player = { id: number; name: string };





type Involvement = { playerId: number; role: "assist" | "involvement" };
type Point = { x: number; y: number };
type ZoneMarker = { x?: number; y?: number; sector?: string | null };

const zoneOptions = [
  { value: "central", label: "Zona Central" },
  { value: "esquerda", label: "Zona Esquerda" },
  { value: "direita", label: "Zona Direita" },
  { value: "superior", label: "Zona Superior" },
  { value: "inferior", label: "Zona Inferior" },
  { value: "penetração", label: "Zona de Penetração" }
] as const;

const normalizeActionName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getSetPieceProfileFromName = (name: string) => {
  const normalized = normalizeActionName(name);
  if (normalized.includes("aberto")) return "aberto";
  if (normalized.includes("fechado")) return "fechado";
  if (normalized.includes("combinado")) return "combinado";
  return "";
};

const deriveFreekickProfileFromActions = (actions: LookupAction[]) => {
  for (const action of actions) {
    const normalized = normalizeActionName(action.name);
    if (normalized.includes("livre") || normalized.includes("falta")) {
      return getSetPieceProfileFromName(action.name);
    }
  }
  return "";
};

const hiddenActionNames = new Set([
  "marcador",
  "assistencia",
  "assistência",
  "marcador & assistencia",
  "marcador & assistência",
  "unidades de ligacao",
  "unidades de ligação"
]);

const buildUpPhases = [
  { value: "posse_controlada", label: "Posse controlada" },
  { value: "transicao_controlada", label: "Transição controlada" },
  { value: "pressionada", label: "Construção pressionada" }
] as const;

const creationPhases = [
  { value: "circulacao_rapida", label: "Circulação rápida" },
  { value: "rompimento", label: "Rompimento" },
  { value: "combinacao", label: "Combinação" }
] as const;

const finalizationPhases = [
  { value: "remate_posse", label: "Remate em posse" },
  { value: "remate_longo", label: "Remate longo" },
] as const;

const cornerProfiles = [
  { value: "aberto", label: "Aberto" },
  { value: "fechado", label: "Fechado" },
  { value: "combinado", label: "Combinado" }
] as const;

const freekickProfiles = cornerProfiles;

const throwInProfiles = [
  { value: "area", label: "Área" },
  { value: "organizacao", label: "Organização" }
] as const;

const goalkeeperOutlets = [
  { value: "organizacao", label: "Em Organização" },
  { value: "curto_para_longo", label: "Curto para longo" },
  { value: "bola_longa", label: "Bola longa" }
] as const;

const labelFromOption = (
  list: Array<{ value: string; label: string }>,
  value?: string | null,
  fallback = "—"
) => {
  if (!value) return fallback;
  const found = list.find((item) => item.value === value);
  return found ? found.label : value;
};



const steps = [


  { id: "season", label: "Época" },


  { id: "championship", label: "Campeonato" },


  { id: "team", label: "Equipa" },


  { id: "scorer", label: "Marcador & Assistência" },


  { id: "context", label: "Momentos" },


  { id: "zone", label: "Baliza" },


  { id: "field", label: "Campo" },


  { id: "review", label: "Revisão" }


] as const;





type StepId = (typeof steps)[number]["id"];





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


function GoalNetPinpoint({ value, onChange }: { value: Point | null; onChange: (pt: Point) => void }) {


  const svgRef = useRef<SVGSVGElement | null>(null);





  const normalize = (clientX: number, clientY: number) => {


    const rect = svgRef.current?.getBoundingClientRect();


    if (!rect) return null;


    const clamp = (v: number) => Math.min(1, Math.max(0, v));


    return {


      x: clamp((clientX - rect.left) / rect.width),


      y: clamp((clientY - rect.top) / rect.height)


    };


  };





  const handleClick = (e: React.PointerEvent<SVGSVGElement>) => {


    const pt = normalize(e.clientX, e.clientY);


    if (pt) onChange(pt);


  };





  const ball = value ? (


    <g transform={`translate(${value.x * 120}, ${value.y * 80})`}>


      <circle r="4.5" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />


      <circle r="2.4" fill="#0f172a" />


      <circle r="1.1" fill="#f97316" />


    </g>


  ) : null;





  return (


    <div className="space-y-2">


      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 shadow-[0_0_40px_rgba(0,0,0,0.4)]">


        <svg


          ref={svgRef}


          viewBox="0 0 120 80"


          className="h-[260px] w-full cursor-crosshair touch-none"


          onPointerDown={handleClick}


        >


          <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b1220" stroke="#1f2937" strokeWidth="1.4" />


          <rect x="8" y="10" width="104" height="60" rx="5" fill="url(#netPattern)" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 3" />


          <path d="M8 22h104M8 36h104M8 50h104M8 64h104" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />


          <path d="M26 10v60M46 10v60M66 10v60M86 10v60" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />


          <rect x="4" y="6" width="112" height="68" rx="6" fill="url(#goalGlow)" />


          {ball}


          <defs>


            <linearGradient id="goalGlow" x1="0" y1="0" x2="0" y2="1">


              <stop offset="0%" stopColor="rgba(14,165,233,0.06)" />


              <stop offset="100%" stopColor="rgba(16,185,129,0.08)" />


            </linearGradient>


            <pattern id="netPattern" width="6" height="6" patternUnits="userSpaceOnUse">


              <path d="M0 0h6M0 0v6" stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />


            </pattern>


          </defs>


        </svg>


      </div>


      <p className="text-xs text-muted-foreground">Clique para colocar a bola em qualquer ponto da baliza.</p>


    </div>


  );


}





function PitchPinpoint({ value, onChange }: { value: Point | null; onChange: (pt: Point) => void }) {


  const svgRef = useRef<SVGSVGElement | null>(null);


  const normalize = (clientX: number, clientY: number) => {


    const rect = svgRef.current?.getBoundingClientRect();


    if (!rect) return null;


    const clamp = (v: number) => Math.min(1, Math.max(0, v));


    return { x: clamp((clientX - rect.left) / rect.width), y: clamp((clientY - rect.top) / rect.height) };


  };





  const handleClick = (e: React.PointerEvent<SVGSVGElement>) => {


    const pt = normalize(e.clientX, e.clientY);


    if (pt) onChange(pt);


  };





  const ball = value ? (


    <g transform={`translate(${value.x * 105}, ${value.y * 68})`}>


      <circle r="3.8" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />


      <circle r="2.2" fill="#0f172a" />


      <circle r="1" fill="#22c55e" />


    </g>


  ) : null;





  return (


    <div className="space-y-2">


      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-3 shadow-[0_10px_60px_rgba(0,0,0,0.4)]">


        <svg


          ref={svgRef}


          viewBox="0 0 105 68"


          className="h-[340px] w-full cursor-crosshair touch-none"


          onPointerDown={handleClick}


        >


          <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />


          <rect x="1" y="1" width="103" height="66" rx="8" stroke="rgba(103,232,249,0.35)" strokeWidth="0.8" strokeDasharray="4 4" fill="none" />


          <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />


          <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />


          <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />


          <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />


          {ball}


        </svg>


      </div>


      <p className="text-xs text-muted-foreground">


        Apenas um ponto é guardado em <code className="font-mono text-emerald-300">field_drawing</code> com coordenadas normalizadas (0-1).


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





type ExistingGoal = {
  id: number;
  opponentTeamId: number | null;
  teamId: number;
  scorerId: number;
  assistId: number | null;
  minute: number;
  momentId: number;
  subMomentId: number;
  actionId: number;
  actionIds?: number[];
  actions?: Array<{ actionId: number; actionName?: string | null }>;
  cornerTakerId?: number | null;
  freekickTakerId?: number | null;
  penaltyTakerId?: number | null;
  crossAuthorId?: number | null;
  goalCoordinates: Point | null;
  fieldDrawing: Point | null;
  assistCoordinates?: ZoneMarker | null;
  assistSector?: string | null;
  shotSector?: string | null;
  finishSector?: string | null;
  buildUpPhase?: string | null;
  creationPhase?: string | null;
  finalizationPhase?: string | null;
  cornerProfile?: string | null;
  freekickProfile?: string | null;
  throwInProfile?: string | null;
  goalkeeperOutlet?: string | null;
  notes: string | null;
  videoPath: string | null;
  involvements?: Involvement[];
};





export function GoalWizard({ existingGoal, onSaved }: { existingGoal?: ExistingGoal | null; onSaved?: () => void }) {


  const qc = useQueryClient();


  const { updatePartial } = useAppContext();


  const [step, setStep] = useState<StepId>("season");


  const [seasonId, setSeasonId] = useState<number | undefined>();
const [championshipId, setChampionshipId] = useState<number | undefined>();
const [teamId, setTeamId] = useState<number | undefined>();
const [opponentTeamId, setOpponentTeamId] = useState<number | undefined>();
const [scorerId, setScorerId] = useState<number | undefined>();
const [assistId, setAssistId] = useState<number | undefined>();
const [minute, setMinute] = useState(0);
const [momentId, setMomentId] = useState<number | undefined>();
const [subMomentId, setSubMomentId] = useState<number | undefined>();
const [actionIds, setActionIds] = useState<number[]>([]);
const [cornerProfile, setCornerProfile] = useState<string>("");
const [freekickProfile, setFreekickProfile] = useState<string>("");
const [throwInProfile, setThrowInProfile] = useState<string>("");
const [goalkeeperOutlet, setGoalkeeperOutlet] = useState<string>("");
const [cornerTakerId, setCornerTakerId] = useState<number | undefined>();
const [freekickTakerId, setFreekickTakerId] = useState<number | undefined>();
const [penaltyTakerId, setPenaltyTakerId] = useState<number | undefined>();
const [crossAuthorId, setCrossAuthorId] = useState<number | undefined>();
const [goalPoint, setGoalPoint] = useState<Point | null>(null);
const [assistPoint, setAssistPoint] = useState<ZoneMarker | null>(null);
const [assistSector, setAssistSector] = useState("");
const [shotSector, setShotSector] = useState("");
const [finishSector, setFinishSector] = useState("");
const [buildUpPhase, setBuildUpPhase] = useState("");
const [creationPhase, setCreationPhase] = useState("");
const [finalizationPhase, setFinalizationPhase] = useState("");
const [notes, setNotes] = useState("");
const [videoPath, setVideoPath] = useState("");
const [involvements, setInvolvements] = useState<Involvement[]>([]);
const [fieldPoint, setFieldPoint] = useState<Point | null>(null);
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
    if (!teamId || !opponentTeamId || !scorerId || !momentId || !subMomentId || actionIds.length === 0) {
      throw new Error("Campos obrigat?rios em falta");
    }
    if (!seasonId || !championshipId) throw new Error("Selecione ?poca e campeonato.");

    const selectedActions = lookupsQuery.data?.actions.filter((a) => actionIds.includes(a.id)) ?? [];
    const requiresGoal = selectedActions.some((a) => a.name.toLowerCase().includes("marcador") || a.context === "field_goal");
    const requiresField = selectedActions.length > 0;
    const derivedFreekickProfile = deriveFreekickProfileFromActions(selectedActions);
    const resolvedFreekickProfile = derivedFreekickProfile || freekickProfile;

    if (requiresGoal && !goalPoint) throw new Error("Esta a??o requer um ponto na baliza.");
    if (requiresField && !fieldPoint) throw new Error("Ponto no campo obrigat?rio para esta a??o.");

    const payload = {
      opponentTeamId,
      teamId,
      scorerId,
      assistId: assistId ?? null,
      minute,
      momentId,
      subMomentId,
      actionIds,
      cornerTakerId,
      freekickTakerId,
      penaltyTakerId,
      crossAuthorId,
      goalCoordinates: goalPoint ?? undefined,
      videoPath: videoPath || undefined,
      fieldDrawing: fieldPoint ?? undefined,
      assistCoordinates: assistPoint ?? undefined,
      assistSector: assistSector || undefined,
      shotSector: shotSector || undefined,
      finishSector: finishSector || undefined,
      buildUpPhase: buildUpPhase || undefined,
      creationPhase: creationPhase || undefined,
      finalizationPhase: finalizationPhase || undefined,
      cornerProfile: cornerProfile || undefined,
      freekickProfile: resolvedFreekickProfile || undefined,
      throwInProfile: throwInProfile || undefined,
      goalkeeperOutlet: goalkeeperOutlet || undefined,
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
    setActionIds([]);
    setCornerProfile("");
    setFreekickProfile("");
    setThrowInProfile("");
    setGoalkeeperOutlet("");
    setGoalPoint(null);
    setAssistPoint(null);
    setAssistSector("");
    setShotSector("");
    setFinishSector("");
    setBuildUpPhase("");
    setCreationPhase("");
    setFinalizationPhase("");
    setNotes("");
    setVideoPath("");
    setInvolvements([]);
    setFieldPoint(null);
    setCornerTakerId(undefined);
    setFreekickTakerId(undefined);
    setPenaltyTakerId(undefined);
    setCrossAuthorId(undefined);
  },
  onError: (err: any) => setMessage(err.message ?? "Erro ao gravar o golo")
});

const updateMutation = useMutation({
  mutationFn: async () => {
    if (!existingGoal) return;
    if (!teamId || !opponentTeamId || !scorerId || !momentId || !subMomentId || actionIds.length === 0) {
      throw new Error("Campos obrigat?rios em falta");
    }
    if (!seasonId || !championshipId) throw new Error("Selecione ?poca e campeonato.");

    const selectedActions = lookupsQuery.data?.actions.filter((a) => actionIds.includes(a.id)) ?? [];
    const requiresGoal = selectedActions.some((a) => a.name.toLowerCase().includes("marcador") || a.context === "field_goal");
    const requiresField = selectedActions.length > 0;
    if (requiresGoal && !goalPoint) throw new Error("Esta a??o requer um ponto na baliza.");
    if (requiresField && !fieldPoint) throw new Error("Ponto no campo obrigat?rio para esta a??o.");

    const payload = {
      opponentTeamId,
      teamId,
      scorerId,
      assistId: assistId ?? null,
      minute,
      momentId,
      subMomentId,
      actionIds,
      cornerTakerId,
      freekickTakerId,
      penaltyTakerId,
      crossAuthorId,
      goalCoordinates: goalPoint ?? undefined,
      videoPath: videoPath || undefined,
      fieldDrawing: fieldPoint ?? undefined,
      assistCoordinates: assistPoint ?? undefined,
      assistSector: assistSector || undefined,
      shotSector: shotSector || undefined,
      finishSector: finishSector || undefined,
      buildUpPhase: buildUpPhase || undefined,
      creationPhase: creationPhase || undefined,
      finalizationPhase: finalizationPhase || undefined,
      cornerProfile: cornerProfile || undefined,
      freekickProfile: resolvedFreekickProfile || undefined,
      throwInProfile: throwInProfile || undefined,
      goalkeeperOutlet: goalkeeperOutlet || undefined,
      notes: notes || undefined,
      involvements
    };

    const res = await fetch(`/api/goals/${existingGoal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update goal");
    return res.json();
  },
  onSuccess: () => {
    setMessage("Golo atualizado.");
    onSaved?.();
  },
  onError: (err: any) => setMessage(err.message ?? "Erro ao atualizar o golo")
});

const filteredChampionships = useMemo(() => {


    if (!lookupsQuery.data) return [];


    return lookupsQuery.data.championships.filter((c) => (seasonId ? c.seasonId === seasonId : true));


  }, [lookupsQuery.data, seasonId]);





  const filteredTeams = useMemo(() => {


    if (!lookupsQuery.data) return [];


    return lookupsQuery.data.teams.filter((t) => (championshipId ? t.championshipId === championshipId : true));


  }, [lookupsQuery.data, championshipId]);





  const opponentOptions = useMemo(() => {


    if (!lookupsQuery.data) return [];


    const sameChampionshipTeams = lookupsQuery.data.teams.filter((t) => (championshipId ? t.championshipId === championshipId : true));


    return sameChampionshipTeams.filter((t) => t.id !== teamId);


  }, [lookupsQuery.data, championshipId, teamId]);





  const filteredSubMoments = useMemo(() => {


    if (!momentId || !lookupsQuery.data) return [];


    return lookupsQuery.data.subMoments.filter((s) => s.momentId === momentId);


  }, [lookupsQuery.data, momentId]);





  const filteredActions = useMemo(() => {
    if (!subMomentId || !lookupsQuery.data) return [];
    return lookupsQuery.data.actions.filter((a) => {
      if (a.subMomentId !== subMomentId) return false;
      const normalized = normalizeActionName(a.name);
      if (hiddenActionNames.has(normalized)) return false;
      return true;
    });
  }, [lookupsQuery.data, subMomentId]);

  const selectedActions = useMemo(
    () => filteredActions.filter((a) => actionIds.includes(a.id)),
    [filteredActions, actionIds]
  );

  const normalizedSelectedActionNames = useMemo(
    () => selectedActions.map((action) => normalizeActionName(action.name)),
    [selectedActions]
  );

  const hasCornerAction = normalizedSelectedActionNames.some((name) => name.includes("canto"));
  const hasFreekickAction = normalizedSelectedActionNames.some(
    (name) => name.includes("livre") || name.includes("falta")
  );
  const hasPenaltyAction = normalizedSelectedActionNames.some((name) => name.includes("penal"));
  const hasCrossAction = normalizedSelectedActionNames.some((name) => name.includes("cruzamento"));
  const hasThrowInAction = normalizedSelectedActionNames.some((name) => name.includes("lancamento"));
  const hasCornerMarkerAction = normalizedSelectedActionNames.some(
    (name) => name.includes("marcador") && name.includes("canto")
  );
  const hasFreekickMarkerAction = normalizedSelectedActionNames.some(
    (name) => name.includes("marcador") && (name.includes("livre") || name.includes("falta"))
  );

  const requiresGoal = selectedActions.some((a) => a.name.toLowerCase().includes("marcador") || a.context === "field_goal");
  const requiresField = selectedActions.length > 0;

  const selectedSubMoment = subMomentId ? lookupsQuery.data?.subMoments.find((s) => s.id === subMomentId) : undefined;


  const subName = selectedSubMoment?.name.toLowerCase() ?? "";


  const asciiSubName = subName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const isCorner = subName.includes("canto");


  const isFreeKick = subName.includes("livre");


  const isPenalty = subName.includes("penal") || subName.includes("penalty");


  const isCross = selectedActions.some((a) => a.name.toLowerCase().includes("cruzamento"));

  const isThrowIn = subName.includes("lançamento") || subName.includes("lancamento");

    const currentPlayers = playersQuery.data ?? [];


  useEffect(() => {
    if (!hasCornerAction || !hasCornerMarkerAction) {
      setCornerTakerId(undefined);
    }
    if (!hasFreekickAction || !hasFreekickMarkerAction) {
      setFreekickTakerId(undefined);
    }
    if (!hasFreekickAction) {
      setFreekickProfile("");
    }
    if (!hasPenaltyAction) {
      setPenaltyTakerId(undefined);
    }
    if (!hasCrossAction) {
      setCrossAuthorId(undefined);
    }
    if (!hasThrowInAction) {
      setThrowInProfile("");
    }
  }, [
    hasCornerAction,
    hasCornerMarkerAction,
    hasFreekickAction,
    hasFreekickMarkerAction,
    hasPenaltyAction,
    hasCrossAction,
    hasThrowInAction
  ]);


  const addInvolvement = (playerId: number) => {


    if (!involvements.find((i) => i.playerId === playerId && i.role === "involvement")) {


      setInvolvements([...involvements, { playerId, role: "involvement" }]);


    }


  };





  const removeInvolvement = (playerId: number, role: Involvement["role"]) => {


    setInvolvements(involvements.filter((i) => !(i.playerId === playerId && i.role === role)));


  };





  // Prefill when editing (once lookups are ready we can also derive season/campeonato)


  useEffect(() => {
    if (!existingGoal) return;

    setTeamId(existingGoal.teamId);
    setOpponentTeamId(existingGoal.opponentTeamId ?? undefined);
    setScorerId(existingGoal.scorerId);
    setAssistId(existingGoal.assistId ?? undefined);
    setMinute(existingGoal.minute);
    setMomentId(existingGoal.momentId);
    setSubMomentId(existingGoal.subMomentId);
    const existingActions = existingGoal.actionIds?.length
      ? existingGoal.actionIds
      : existingGoal.actions?.map((a) => a.actionId) ?? (existingGoal.actionId ? [existingGoal.actionId] : []);
    setActionIds(existingActions);
    setGoalPoint(existingGoal.goalCoordinates ?? null);
    setFieldPoint(existingGoal.fieldDrawing ?? null);
    setAssistPoint(existingGoal.assistCoordinates ?? null);
    setAssistSector(existingGoal.assistSector ?? "");
    setShotSector(existingGoal.shotSector ?? "");
    setFinishSector(existingGoal.finishSector ?? "");
    setBuildUpPhase(existingGoal.buildUpPhase ?? "");
    setCreationPhase(existingGoal.creationPhase ?? "");
    setFinalizationPhase(existingGoal.finalizationPhase ?? "");
    setCornerProfile(existingGoal.cornerProfile ?? "");
    setFreekickProfile(existingGoal.freekickProfile ?? "");
    setThrowInProfile(existingGoal.throwInProfile ?? "");
    setGoalkeeperOutlet(existingGoal.goalkeeperOutlet ?? "");
    setNotes(existingGoal.notes ?? "");
    setVideoPath(existingGoal.videoPath ?? "");
    setInvolvements(existingGoal.involvements ?? []);
    setCornerTakerId(existingGoal.cornerTakerId ?? undefined);
    setFreekickTakerId(existingGoal.freekickTakerId ?? undefined);
    setPenaltyTakerId(existingGoal.penaltyTakerId ?? undefined);
    setCrossAuthorId(existingGoal.crossAuthorId ?? undefined);
    setStep("season");
  }, [existingGoal]);





  // Derive season/championship from team after lookups loaded


  useEffect(() => {


    if (!existingGoal || !lookupsQuery.data) return;


    const team = lookupsQuery.data.teams.find((t) => t.id === existingGoal.teamId);


    if (team) {


      const champ = lookupsQuery.data.championships.find((c) => c.id === team.championshipId);


      setChampionshipId(champ ? champ.id : undefined);


      const season = champ ? lookupsQuery.data.seasons.find((s) => s.id === champ.seasonId) : undefined;


      setSeasonId(season ? season.id : undefined);


    }


  }, [existingGoal, lookupsQuery.data]);





  const canNext = (current: StepId) => {


    switch (current) {


      case "season":


        return Boolean(seasonId);


      case "championship":


        return Boolean(championshipId);


      case "team":


        return Boolean(teamId && opponentTeamId && opponentTeamId !== teamId);


      case "scorer":


        return Boolean(scorerId);


      case "context":


        return Boolean(momentId && subMomentId && actionIds.length > 0 && minute >= 0);


      case "zone":


        return requiresGoal ? Boolean(goalPoint) : true;


      case "field":


        return requiresField ? Boolean(fieldPoint) : true;


      case "review":


        return true;


      default:


        return false;


    }


  };





  const currentIndex = steps.findIndex((s) => s.id === step);


  const movePrev = () => setStep(steps[Math.max(0, currentIndex - 1)].id);


  const moveNext = () => setStep(steps[Math.min(steps.length - 1, currentIndex + 1)].id);


  const readyToSave = Boolean(


    seasonId &&


    championshipId &&


    teamId &&


    opponentTeamId &&


    scorerId &&


    momentId &&


    subMomentId &&

    actionIds.length > 0 &&


    (!hasCornerMarkerAction || cornerTakerId) &&


    (!hasFreekickMarkerAction || freekickTakerId) &&


    (!hasPenaltyAction || penaltyTakerId) &&


    (!hasCrossAction || crossAuthorId) &&


    canNext("zone") &&


    canNext("field")


  );





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


                    setOpponentTeamId(undefined);


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


                    setOpponentTeamId(undefined);


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


                  onChange={(e) => {


                    const val = Number(e.target.value) || undefined;


                    setTeamId(val);


                    if (val && opponentTeamId === val) setOpponentTeamId(undefined);


                  }}


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


                <label className="text-sm font-medium">Equipa Adversária</label>


                <Select


                  value={opponentTeamId?.toString() ?? ""}


                  onChange={(e) => setOpponentTeamId(e.target.value ? Number(e.target.value) : undefined)}


                  aria-label="opponent-select"


                  disabled={!championshipId}


                >


                  <option value="">Selecionar adversário</option>


                  {opponentOptions.map((team) => (


                    <option key={team.id} value={team.id} className="text-black">


                      {team.name}


                    </option>


                  ))}


                </Select>


                <p className="text-xs text-muted-foreground">


                  Lista filtrada para o mesmo campeonato/época (Premier League 25/26) e sem a equipa selecionada.


                </p>


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


                    <p className="text-xs text-muted-foreground">Marcar jogadores que participaram na jogada para a métrica ‘Mais interveniente’.</p>


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
                    setActionIds([]);
                    setCornerProfile("");
                    setFreekickProfile("");
                    setThrowInProfile("");
                    setGoalkeeperOutlet("");
                    setCornerTakerId(undefined);
                    setFreekickTakerId(undefined);
                    setPenaltyTakerId(undefined);
                    setCrossAuthorId(undefined);
                    setGoalPoint(null);
                    setFieldPoint(null);
                    setAssistPoint(null);


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


                    setActionIds([]);


                    setCornerTakerId(undefined);


                    setFreekickTakerId(undefined);


                    setPenaltyTakerId(undefined);


                    setCrossAuthorId(undefined);


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


              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Ações</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setModal({ kind: "action", open: true })}
                  >
                    + Criar novo...
                  </Button>
                </div>
                {filteredActions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                    Seleciona um sub-momento para ver as ações disponíveis.
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {filteredActions.map((action) => {
                      const isSelected = actionIds.includes(action.id);
                      return (
                        <label
                          key={action.id}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm",
                            isSelected
                              ? "border-emerald-400 bg-emerald-500/10 text-white"
                              : "border-border/50 bg-card/70 text-muted-foreground"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() =>
                              setActionIds((prev) =>
                                prev.includes(action.id) ? prev.filter((id) => id !== action.id) : [...prev, action.id]
                              )
                            }
                          />
                          <div>
                            <span className="font-medium text-white">{action.name}</span>
                            <p className="text-[11px] text-muted-foreground">
                              {action.context === "field_goal" ? "Campo + Baliza" : "Campo"}
                            </p>
                          </div>
                          <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-semibold">
                            {isSelected ? "Selecionado" : "Selecionar"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedActions.map((action) => (
                      <Badge key={action.id} className="bg-emerald-500/10 text-emerald-100">
                        {action.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>


              {hasCornerAction && (


                <>


                  {hasCornerMarkerAction ? (


                    <div className="space-y-2">


                      <label className="text-sm font-medium">Marcador do Canto</label>


                      <Select


                        value={cornerTakerId?.toString() ?? ""}


                        onChange={(e) => setCornerTakerId(e.target.value ? Number(e.target.value) : undefined)}


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


                  ) : (


                    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">


                    Seleciona a ação &ldquo;Marcador do canto&rdquo; para indicar o jogador responsável.


                    </div>


                  )}


                  <div className="space-y-2">
                    <label className="text-sm font-medium">Perfil do canto</label>
                    <Select value={cornerProfile} onChange={(e) => setCornerProfile(e.target.value)}>
                      <option value="">Sem perfil</option>
                      {cornerProfiles.map((option) => (
                        <option key={option.value} value={option.value} className="text-black">
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>


                </>


              )}


              {hasFreekickAction && (


                <>


                  {hasFreekickMarkerAction ? (


                    <div className="space-y-2">


                      <label className="text-sm font-medium">Marcador da Falta</label>


                      <Select


                        value={freekickTakerId?.toString() ?? ""}


                        onChange={(e) => setFreekickTakerId(e.target.value ? Number(e.target.value) : undefined)}


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


                  ) : (


                    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">


                      Escolhe a ação &ldquo;Marcador da falta&rdquo; para desbloquear o seletor de jogador.


                    </div>


                  )}


                  <p className="text-xs text-muted-foreground">
                    O perfil do livre (Aberto, Fechado ou Combinado) segue o cartão de ação selecionado no passo anterior.
                  </p>


                </>


              )}


              {hasPenaltyAction && (


                <div className="space-y-2">


                  <label className="text-sm font-medium">Marcador do Penálti</label>


                  <Select


                    value={penaltyTakerId?.toString() ?? ""}


                    onChange={(e) => setPenaltyTakerId(e.target.value ? Number(e.target.value) : undefined)}


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


              )}


              {hasCrossAction && (


                <div className="space-y-2">


                  <label className="text-sm font-medium">Autor do Cruzamento</label>


                  <Select


                    value={crossAuthorId?.toString() ?? ""}


                    onChange={(e) => setCrossAuthorId(e.target.value ? Number(e.target.value) : undefined)}


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


              )}




              {hasThrowInAction && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Perfil do lançamento</label>
                  <Select value={throwInProfile} onChange={(e) => setThrowInProfile(e.target.value)}>
                    <option value="">Sem perfil</option>
                    {throwInProfiles.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="md:col-span-2 space-y-2">


                <label className="text-sm font-medium">Notas (opcional)</label>


                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto tático ou observações" />


              </div>


              <div className="md:col-span-2 space-y-2">


                <label className="text-sm font-medium">Vídeo do golo</label>


                <FileUpload


                  label={videoPath ? "Atualizar vídeo" : "Carregar vídeo"}


                  accept="video/mp4,video/*"


                  value={videoPath}


                  onChange={(path) => setVideoPath(path)}


                  helperText="O ficheiro será guardado em /uploads e pode ser reproduzido localmente."


                />


              </div>


            </div>


          )}





          {step === "zone" && (


            <div className="space-y-3">


              <div className="flex items-center justify-between">


                <label className="text-sm font-medium">Ponto na Baliza</label>


                {requiresGoal ? (


                  <span className="text-xs text-muted-foreground">Obrigatório para ações com baliza.</span>


                ) : (


                  <span className="text-xs text-emerald-300">Opcional para esta ação (só Campo).</span>


                )}


              </div>


              <GoalNetPinpoint value={goalPoint} onChange={setGoalPoint} />


            </div>


          )}





          {step === "field" && (


            <div className="space-y-3">


              <div className="flex items-center justify-between">


                <div className="text-sm font-medium">Ponto no Campo</div>


                <span className="text-xs text-muted-foreground">


                  {requiresField ? "Obrigatório para esta ação." : "Opcional para referência tática."}


                </span>


              </div>


              <PitchPinpoint value={fieldPoint} onChange={setFieldPoint} />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zona de assistência</label>
                  <Select value={assistSector} onChange={(e) => setAssistSector(e.target.value)}>
                    <option value="">Sem indicação</option>
                    {zoneOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zona de remate</label>
                  <Select value={shotSector} onChange={(e) => setShotSector(e.target.value)}>
                    <option value="">Sem indicação</option>
                    {zoneOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Zona de finalização</label>
                  <Select value={finishSector} onChange={(e) => setFinishSector(e.target.value)}>
                    <option value="">Sem indicação</option>
                    {zoneOptions.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fase de construção</label>
                  <Select value={buildUpPhase} onChange={(e) => setBuildUpPhase(e.target.value)}>
                    <option value="">Sem indicação</option>
                    {buildUpPhases.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fase de criação</label>
                  <Select value={creationPhase} onChange={(e) => setCreationPhase(e.target.value)}>
                    <option value="">Sem indicação</option>
                    {creationPhases.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fase de finalização</label>
                  <Select value={finalizationPhase} onChange={(e) => setFinalizationPhase(e.target.value)}>
                    <option value="">Sem indicação</option>
                    {finalizationPhases.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>



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


                <span className="text-muted-foreground">Adversário</span>


                <span>{lookupsQuery.data?.teams.find((t) => t.id === opponentTeamId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Marcador</span>


                <span>{currentPlayers.find((p) => p.id === scorerId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Assistência</span>


                <span>{currentPlayers.find((p) => p.id === assistId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Minuto</span>


                <span>{minute}&rsquo;</span>


                <span className="text-muted-foreground">Momento</span>


                <span>{lookupsQuery.data?.moments.find((m) => m.id === momentId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Sub-momento</span>


                <span>{lookupsQuery.data?.subMoments.find((s) => s.id === subMomentId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Ações</span>


                <span>
                  {selectedActions.length > 0
                    ? selectedActions.map((action) => action.name).join(", ")
                    : "-"}
                </span>

                <span className="text-muted-foreground">Saída do GR</span>
                <span>{labelFromOption(goalkeeperOutlets, goalkeeperOutlet)}</span>



                <span className="text-muted-foreground">Contexto</span>


                <span>{requiresGoal ? "Campo + Baliza" : "Campo"}</span>


                {isCorner && (


                  <>


                    <span className="text-muted-foreground">Marcador do canto</span>


                    <span>{currentPlayers.find((p) => p.id === cornerTakerId)?.name ?? "-"}</span>


                    <span className="text-muted-foreground">Perfil do canto</span>


                    <span>{labelFromOption(cornerProfiles, cornerProfile)}</span>


                  </>


                )}


                {isFreeKick && (


                  <>


                    <span className="text-muted-foreground">Marcador da falta</span>


                    <span>{currentPlayers.find((p) => p.id === freekickTakerId)?.name ?? "-"}</span>


                    <span className="text-muted-foreground">Perfil do livre</span>


                    <span>{labelFromOption(freekickProfiles, freekickProfile)}</span>


                  </>


                )}


                {isPenalty && (


                  <>


                    <span className="text-muted-foreground">Marcador do penálti</span>


                    <span>{currentPlayers.find((p) => p.id === penaltyTakerId)?.name ?? "-"}</span>


                  </>


                )}


                {isCross && (


                  <>


                    <span className="text-muted-foreground">Autor do cruzamento</span>


                    <span>{currentPlayers.find((p) => p.id === crossAuthorId)?.name ?? "-"}</span>


                  </>


                )}


                {isThrowIn && (


                  <>


                    <span className="text-muted-foreground">Perfil do lançamento</span>


                    <span>{labelFromOption(throwInProfiles, throwInProfile)}</span>


                  </>


                )}


                <span className="text-muted-foreground">Baliza</span>


                <span>{goalPoint ? `(${goalPoint.x.toFixed(2)}, ${goalPoint.y.toFixed(2)})` : "N/A"}</span>


                <span className="text-muted-foreground">Campo</span>


                <span>{fieldPoint ? `(${fieldPoint.x.toFixed(2)}, ${fieldPoint.y.toFixed(2)})` : "N/A"}</span>




                <span className="text-muted-foreground">Zona de assistência</span>
                <span>{assistSector || '—'}</span>
                <span className="text-muted-foreground">Zona de remate</span>
                <span>{shotSector || '—'}</span>
                <span className="text-muted-foreground">Zona de finalização</span>
                <span>{finishSector || '—'}</span>
                <span className="text-muted-foreground">Fase de construção</span>
                <span>{labelFromOption(buildUpPhases, buildUpPhase)}</span>
                <span className="text-muted-foreground">Fase de criação</span>
                <span>{labelFromOption(creationPhases, creationPhase)}</span>
                <span className="text-muted-foreground">Fase de finalização</span>
                <span>{labelFromOption(finalizationPhases, finalizationPhase)}</span>
                <span className="text-muted-foreground">Vídeo</span>


                <span>{videoPath ? "Anexado" : "—"}</span>


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


              <div className="grid gap-3 md:grid-cols-2">


                <div className="space-y-1 rounded-xl border border-border/60 bg-card/60 p-3">


                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Campo</div>


                  <div className="rounded-lg border border-border/50 bg-slate-950/60 p-2">


                    <svg viewBox="0 0 105 68" className="w-full">


                      <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />


                      <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />


                      <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />


                      <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />


                      <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />


                      {fieldPoint && (


                        <g transform={`translate(${fieldPoint.x * 105}, ${fieldPoint.y * 68})`}>


                          <circle r="3.4" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />


                          <circle r="1.8" fill="#0f172a" />


                          <circle r="0.9" fill="#22c55e" />


                        </g>


                      )}


                    </svg>


                  </div>


                </div>


                <div className="space-y-1 rounded-xl border border-border/60 bg-card/60 p-3">


                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Baliza</div>


                  <div className="rounded-lg border border-border/50 bg-slate-950/60 p-2">


                    <svg viewBox="0 0 120 80" className="w-full">


                      <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b1220" stroke="#1f2937" strokeWidth="1.4" />


                      <rect x="8" y="10" width="104" height="60" rx="5" fill="url(#reviewNet)" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 3" />


                      <path d="M8 22h104M8 36h104M8 50h104M8 64h104" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />


                      <path d="M26 10v60M46 10v60M66 10v60M86 10v60" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />


                      {goalPoint && (


                        <g transform={`translate(${goalPoint.x * 120}, ${goalPoint.y * 80})`}>


                          <circle r="4.2" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />


                          <circle r="2.2" fill="#0f172a" />


                          <circle r="1.1" fill="#f97316" />


                        </g>


                      )}


                      <defs>


                        <pattern id="reviewNet" width="6" height="6" patternUnits="userSpaceOnUse">


                          <path d="M0 0h6M0 0v6" stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />


                        </pattern>


                      </defs>


                    </svg>


                  </div>


                </div>


              </div>


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


                <Button


                  type="button"


                  onClick={() => (existingGoal ? updateMutation.mutate() : createMutation.mutate())}


                  disabled={createMutation.isPending || updateMutation.isPending || !readyToSave}


                >


                  {createMutation.isPending || updateMutation.isPending


                    ? "A gravar..."


                    : existingGoal


                      ? "Atualizar Golo"


                      : "Gravar Golo"}


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


