"use client";





import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { displayFootballTerm } from "@/lib/presentation";


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


import { Button } from "@/components/ui/button";


import { Input } from "@/components/ui/input";


import { Select } from "@/components/ui/select";


import { Card, CardContent, CardHeader } from "@/components/ui/card";


import { Badge } from "@/components/ui/badge";


import { useAppContext } from "@/components/ui/app-context";


import { GoalVideoPicker } from "@/components/goal-video-picker";
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

const toPoint = (value: unknown): Point | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as { x?: unknown; y?: unknown };
  if (typeof raw.x !== "number" || typeof raw.y !== "number") return null;
  return { x: raw.x, y: raw.y };
};

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
  "assist",
  "assistência",
  "marcador & assistencia",
  "marcador & assist",
  "marcador & assistência",
  "unidades de ligacao",
  "unidades de ligação"
]);

const recoveryActionWhitelist = new Set([
  "cruzamento direita",
  "cruzamento esquerda",
  "remate fora de area",
  "remate de fora da area",
  "profundidade",
  "jogador referencia"
]);

const recoveryActionOrder = [
  "cruzamento direita",
  "cruzamento esquerda",
  "profundidade",
  "remate fora de area",
  "jogador referencia"
] as const;

const offensiveOrganizationSequenceNames = [
  "saida do gr",
  "construcao",
  "criacao",
  "finalizacao"
] as const;

const normalizeRecoveryAction = (name: string) => {
  const normalized = normalizeActionName(name);
  if (normalized === "remate de fora da area") return "remate fora de area";
  return normalized;
};

const cornerProfiles = [
  { value: "aberto", label: "Aberto" },
  { value: "fechado", label: "Fechado" },
  { value: "combinado", label: "Combinado" }
] as const;

const freekickProfiles = cornerProfiles;

const throwInProfiles = [
  { value: "area", label: "Box" },
  { value: "organizacao", label: "Organised Attack" }
] as const;

const goalkeeperOutlets = [
  { value: "organizacao", label: "In Possession" },
  { value: "curto_para_longo", label: "Short to Long" },
  { value: "bola_longa", label: "Long Ball" }
] as const;

const labelFromOption = (
  list: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null,
  fallback = "—"
) => {
  if (!value) return fallback;
  const found = list.find((item) => item.value === value);
  return found ? found.label : value;
};



const wizardStepDefinitions = [


  { id: "season", label: "Season" },


  { id: "championship", label: "Competition" },


  { id: "team", label: "Team" },


  { id: "scorer", label: "Scorer & Assist" },


  { id: "context", label: "Phases" },


  { id: "transition", label: "Recovery Area" },


  { id: "assist", label: "Assist Area" },


  { id: "field", label: "Shot Area" },


  { id: "zone", label: "Goal" },


  { id: "review", label: "Review" }


] as const;





type StepId = (typeof wizardStepDefinitions)[number]["id"];





async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {


  const res = await fetch(url, options);


  if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");


  return res.json();


}





function StepIndicator({ current, steps }: { current: StepId; steps: readonly { id: StepId; label: string }[] }) {


  const currentIndex = steps.findIndex((s) => s.id === current);


  return (

    <div className="overflow-x-auto pb-1">
      <div className="relative inline-flex min-w-max items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-transparent px-3 py-2 sm:px-4 sm:py-3">
        <div className="absolute inset-x-0 top-1 h-[2px] bg-gradient-to-r from-cyan-500/50 via-emerald-400/50 to-transparent" />

        {steps.map((step, idx) => {


        const isActive = idx === currentIndex;


        const isDone = idx < currentIndex;


          return (
            <div key={step.id} className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-xs">


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


              <span className={cn("hidden sm:inline", isActive ? "text-white" : isDone ? "text-emerald-100" : "text-muted-foreground")}>
                {step.label}
              </span>

            </div>

          );

        })}

      </div>
    </div>


  );


}


const mapSurfaceClass =
  "rounded-2xl border border-border/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 shadow-[0_0_40px_rgba(0,0,0,0.4)]";
const mapSvgClass = "h-auto w-full max-w-full aspect-[3/2] cursor-crosshair touch-none";
const mapStepContainerClass = "space-y-3 pb-2";

type RecoveryGridVariant = "defensive" | "offensive";

type TacticalZone = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const defensiveRecoveryZones: TacticalZone[] = [
  { id: 1, x: 8, y: 10, width: 26, height: 12 },
  { id: 2, x: 34, y: 10, width: 26, height: 12 },
  { id: 3, x: 8, y: 22, width: 26, height: 7 },
  { id: 4, x: 34, y: 22, width: 26, height: 7 },
  { id: 5, x: 8, y: 29, width: 26, height: 22 },
  { id: 6, x: 34, y: 29, width: 26, height: 22 },
  { id: 7, x: 8, y: 51, width: 26, height: 7 },
  { id: 8, x: 34, y: 51, width: 26, height: 7 },
  { id: 9, x: 8, y: 58, width: 26, height: 12 },
  { id: 10, x: 34, y: 58, width: 26, height: 12 }
];

const offensiveRecoveryZones: TacticalZone[] = [
  { id: 1, x: 60, y: 10, width: 26, height: 12 },
  { id: 2, x: 86, y: 10, width: 26, height: 12 },
  { id: 3, x: 60, y: 22, width: 26, height: 7 },
  { id: 4, x: 86, y: 22, width: 26, height: 7 },
  { id: 5, x: 60, y: 29, width: 26, height: 16 },
  { id: 6, x: 86, y: 29, width: 26, height: 16 },
  { id: 7, x: 60, y: 45, width: 26, height: 13 },
  { id: 8, x: 86, y: 45, width: 26, height: 13 },
  { id: 9, x: 60, y: 58, width: 26, height: 12 },
  { id: 10, x: 86, y: 58, width: 26, height: 12 }
];

const getRecoveryZones = (variant: RecoveryGridVariant) =>
  variant === "defensive" ? defensiveRecoveryZones : offensiveRecoveryZones;

const getRecoveryZoneCenterPoint = (variant: RecoveryGridVariant, zoneId: number): Point | null => {
  const zone = getRecoveryZones(variant).find((entry) => entry.id === zoneId);
  if (!zone) return null;
  return {
    x: (zone.x + zone.width / 2) / 120,
    y: (zone.y + zone.height / 2) / 80
  };
};

const getClosestRecoveryZoneId = (variant: RecoveryGridVariant, point: Point): number | null => {
  const zones = getRecoveryZones(variant);
  if (zones.length === 0) return null;

  const best = zones.reduce<{ zoneId: number; distance: number } | null>((currentBest, zone) => {
    const cx = (zone.x + zone.width / 2) / 120;
    const cy = (zone.y + zone.height / 2) / 80;
    const distance = Math.hypot(point.x - cx, point.y - cy);
    if (!currentBest || distance < currentBest.distance) {
      return { zoneId: zone.id, distance };
    }
    return currentBest;
  }, null);

  return best?.zoneId ?? null;
};

function RecoverySpaceGrid({
  variant,
  value,
  onChange,
  readOnly = false,
  showHelperText = true
}: {
  variant: RecoveryGridVariant;
  value?: number | null;
  onChange?: (zoneId: number) => void;
  readOnly?: boolean;
  showHelperText?: boolean;
}) {
  const zones = getRecoveryZones(variant);
  const inertOverlay =
    variant === "defensive" ? <rect x="60" y="10" width="52" height="60" fill="rgba(2,6,23,0.68)" /> : <rect x="8" y="10" width="52" height="60" fill="rgba(2,6,23,0.68)" />;

  return (
    <div className="space-y-2">
      <InteractiveMapFrame>
        <svg viewBox="0 0 120 80" className={cn(mapSvgClass, readOnly ? "cursor-default" : "cursor-pointer")}>
          <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />
          <rect x="8" y="10" width="104" height="60" rx="4" fill="rgba(6,24,40,0.72)" stroke="rgba(34,211,238,0.25)" strokeWidth="0.8" />
          <line x1="60" y1="10" x2="60" y2="70" stroke="rgba(226,232,240,0.35)" strokeWidth="0.8" strokeDasharray="3 3" />
          <rect x="8" y="22" width="16" height="36" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
          <rect x="8" y="29" width="7" height="22" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
          <rect x="96" y="22" width="16" height="36" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
          <rect x="105" y="29" width="7" height="22" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
          {inertOverlay}

          {zones.map((zone) => {
            const selected = value === zone.id;
            return (
              <g
                key={`${variant}-${zone.id}`}
                className={readOnly ? "" : "cursor-pointer"}
                onPointerDown={() => {
                  if (!readOnly && onChange) onChange(zone.id);
                }}
              >
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  fill={selected ? "rgba(34, 211, 238, 0.3)" : "rgba(15,23,42,0.04)"}
                  stroke={selected ? "rgba(34,211,238,0.95)" : "rgba(226,232,240,0.45)"}
                  strokeWidth={selected ? 1.2 : 0.7}
                />
                <text
                  x={zone.x + zone.width / 2}
                  y={zone.y + zone.height / 2 + 1.5}
                  textAnchor="middle"
                  className="fill-white text-[4px] font-semibold"
                  pointerEvents="none"
                >
                  {zone.id}
                </text>
              </g>
            );
          })}
        </svg>
      </InteractiveMapFrame>
      {showHelperText && (
        <p className="text-xs text-muted-foreground">
          Select an area to save to <code className="font-mono text-cyan-300">attacking_space_id</code>.
        </p>
      )}
    </div>
  );
}

function InteractiveMapFrame({ children }: { children: ReactNode }) {
  return <div className={mapSurfaceClass}>{children}</div>;
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


      <InteractiveMapFrame>


        <svg


          ref={svgRef}


          viewBox="0 0 120 80"


          className={mapSvgClass}


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


      </InteractiveMapFrame>


      <p className="text-xs text-muted-foreground">Click to place the ball anywhere on the goal.</p>


    </div>


  );


}





function PitchPinpoint({
  value,
  onChange,
  storageField,
  pinColor = "#22c55e"
}: {
  value: Point | null;
  onChange: (pt: Point) => void;
  storageField: "assist_drawing" | "field_drawing" | "transition_drawing";
  pinColor?: string;
}) {


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


    <g transform={`translate(${value.x * 120}, ${value.y * 80})`}>


      <circle r="3.8" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />


      <circle r="2.2" fill="#0f172a" />


      <circle r="1" fill={pinColor} />


    </g>


  ) : null;





  return (


    <div className="space-y-2">


      <InteractiveMapFrame>


        <svg


          ref={svgRef}


          viewBox="0 0 120 80"


          className={mapSvgClass}


          onPointerDown={handleClick}


        >


          <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />


          <rect x="8" y="10" width="104" height="60" rx="4" fill="url(#pitchGradient)" stroke="rgba(148,163,184,0.35)" strokeWidth="0.8" />


          <line x1="60" y1="10" x2="60" y2="70" stroke="rgba(148,163,184,0.35)" strokeWidth="0.8" strokeDasharray="3 3" />


          <circle cx="60" cy="40" r="9" stroke="rgba(148,163,184,0.35)" strokeWidth="0.8" fill="none" />


          <circle cx="60" cy="40" r="0.9" fill="rgba(148,163,184,0.65)" />


          <rect x="8" y="22" width="16" height="36" fill="none" stroke="rgba(148,163,184,0.38)" strokeWidth="0.8" />
          <rect x="8" y="29" width="7" height="22" fill="none" stroke="rgba(148,163,184,0.38)" strokeWidth="0.8" />
          <circle cx="20" cy="40" r="0.8" fill="rgba(148,163,184,0.65)" />


          <rect x="96" y="22" width="16" height="36" fill="none" stroke="rgba(148,163,184,0.38)" strokeWidth="0.8" />
          <rect x="105" y="29" width="7" height="22" fill="none" stroke="rgba(148,163,184,0.38)" strokeWidth="0.8" />
          <circle cx="100" cy="40" r="0.8" fill="rgba(148,163,184,0.65)" />


          <path d="M24 33a9 9 0 0 0 0 14" fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="0.8" />
          <path d="M96 33a9 9 0 0 1 0 14" fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="0.8" />


          {ball}


          <defs>
            <linearGradient id="pitchGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(2,6,23,0.85)" />
              <stop offset="100%" stopColor="rgba(3,18,35,0.92)" />
            </linearGradient>
          </defs>


        </svg>


      </InteractiveMapFrame>


      <p className="text-xs text-muted-foreground">


        Only one point is saved to <code className="font-mono text-emerald-300">{storageField}</code> with normalised coordinates (0-1).


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


              <label className="text-xs text-muted-foreground">Action Context</label>


              <Select value={context} onChange={(e) => setContext((e.target.value as "field" | "field_goal") ?? "field")}>


                <option value="field">Pitch (goal point not required)</option>


                <option value="field_goal">Pitch + Goal</option>


              </Select>


            </div>


          )}


          <div className="flex justify-end gap-2">


            <Button variant="ghost" onClick={onClose} type="button">


              Cancel


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


              {saving ? "Saving..." : "Create"}


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
  subMomentSequence?: Array<{
    subMomentId: number;
    subMomentName?: string | null;
    actionId: number;
    actionName?: string | null;
    sequenceOrder: number;
  }>;
  cornerTakerId?: number | null;
  freekickTakerId?: number | null;
  penaltyTakerId?: number | null;
  crossAuthorId?: number | null;
  throwInTakerId?: number | null;
  referencePlayerId?: number | null;
  foulSufferedById?: number | null;
  previousMomentDescription?: string | null;
  goalCoordinates: Point | null;
  fieldDrawing: Point | null;
  transitionDrawing?: Point | null;
  attackingSpaceId?: number | null;
  assistCoordinates?: { x?: number; y?: number; sector?: string | null } | null;
  assistDrawing?: Point | null;
  cornerProfile?: string | null;
  freekickProfile?: string | null;
  throwInProfile?: string | null;
  goalkeeperOutlet?: string | null;
  notes: string | null;
  videoPath: string | null;
  mediaAssetId?: string | null;
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
const [offensiveSequenceActionBySubMoment, setOffensiveSequenceActionBySubMoment] = useState<Record<number, number>>({});
const [cornerProfile, setCornerProfile] = useState<string>("");
const [freekickProfile, setFreekickProfile] = useState<string>("");
const [throwInProfile, setThrowInProfile] = useState<string>("");
const [goalkeeperOutlet, setGoalkeeperOutlet] = useState<string>("");
const [cornerTakerId, setCornerTakerId] = useState<number | undefined>();
const [freekickTakerId, setFreekickTakerId] = useState<number | undefined>();
const [penaltyTakerId, setPenaltyTakerId] = useState<number | undefined>();
const [crossAuthorId, setCrossAuthorId] = useState<number | undefined>();
const [throwInTakerId, setThrowInTakerId] = useState<number | undefined>();
const [referencePlayerId, setReferencePlayerId] = useState<number | undefined>();
const [foulSufferedById, setFoulSufferedById] = useState<number | undefined>();
const [previousMomentDescription, setPreviousMomentDescription] = useState("");
const [goalPoint, setGoalPoint] = useState<Point | null>(null);
const [assistDrawingPoint, setAssistDrawingPoint] = useState<Point | null>(null);
const [transitionDrawingPoint, setTransitionDrawingPoint] = useState<Point | null>(null);
const [attackingSpaceId, setAttackingSpaceId] = useState<number | undefined>();
const [notes, setNotes] = useState("");
const [videoPath, setVideoPath] = useState("");
const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
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
    const subMomentSequencePayload = isOffensiveOrganizationMoment
      ? [...offensiveOrganizationSequenceSelection]
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          .map((entry) => ({ ...entry }))
      : resolvedSubMomentId && resolvedActionIds.length > 0
        ? [{ subMomentId: resolvedSubMomentId, actionId: resolvedActionIds[0], sequenceOrder: 1 }]
        : [];
    const effectiveActionIds = isOffensiveOrganizationMoment
      ? subMomentSequencePayload.map((entry) => entry.actionId)
      : resolvedActionIds;
    const effectiveSubMomentId = isOffensiveOrganizationMoment
      ? subMomentSequencePayload[subMomentSequencePayload.length - 1]?.subMomentId
      : resolvedSubMomentId;

    if (!teamId || !opponentTeamId || !scorerId || !momentId || !effectiveSubMomentId || effectiveActionIds.length === 0) {
      throw new Error("Required fields are missing");
    }
    if (isOffensiveOrganizationMoment && !hasCompleteOffensiveOrganizationCatalogue) {
      throw new Error("Organised Attack sub-phases were not found in the catalogue.");
    }
    if (isOffensiveOrganizationMoment && !hasAnyOffensiveOrganizationSelection) {
      throw new Error("Select at least one Organised Attack phase.");
    }
    if (!seasonId || !championshipId) throw new Error("Select a season and competition.");

    const selectedActions = lookupsQuery.data?.actions.filter((a) => effectiveActionIds.includes(a.id)) ?? [];
    const requiresGoal = selectedActions.some((a) => a.name.toLowerCase().includes("marcador") || a.context === "field_goal");
    const requiresField = selectedActions.length > 0;
    const derivedFreekickProfile = deriveFreekickProfileFromActions(selectedActions);
    const resolvedFreekickProfile = derivedFreekickProfile || freekickProfile;

    if (requiresGoal && !goalPoint) throw new Error("This action requires a point on the goal.");
    if (requiresField && !fieldPoint) throw new Error("A point on the pitch is required for this action.");
    if (shouldShowTransitionStep && !attackingSpaceId) {
      throw new Error("Select the recovery area.");
    }
    const hasFoulSufferedAction = selectedActions.some((a) => {
      const normalized = normalizeActionName(a.name);
      return (
        normalized.includes("falta sobre") ||
        normalized.includes("falta sofrida") ||
        normalized.includes("sofreu a falta")
      );
    });
    if (hasFoulSufferedAction && !foulSufferedById) {
      throw new Error("Select the player who was fouled.");
    }
    const selectedSubMomentName = normalizeActionName(
      lookupsQuery.data?.subMoments.find((s) => s.id === effectiveSubMomentId)?.name ?? ""
    );
    const isDirectFreekickOrPenalty =
      ((selectedSubMomentName.includes("livre") &&
        (selectedSubMomentName.includes("direto") || selectedSubMomentName.includes("directo"))) ||
        selectedSubMomentName.includes("penal") ||
        selectedSubMomentName.includes("penalty"));
    const hasPreviousMomentAction = selectedActions.some((a) =>
      normalizeActionName(a.name).includes("momento anterior")
    );
    if (hasPreviousMomentAction && isDirectFreekickOrPenalty && !previousMomentDescription.trim()) {
      throw new Error("Describe the previous phase.");
    }

    const payload = {
      opponentTeamId,
      teamId,
      scorerId,
      assistId: assistId ?? null,
      minute,
      momentId,
      momentName: selectedMoment?.name ?? undefined,
      subMomentId: effectiveSubMomentId,
      actionIds: effectiveActionIds,
      subMomentSequence: subMomentSequencePayload,
      cornerTakerId,
      freekickTakerId,
      penaltyTakerId,
      crossAuthorId,
      throwInTakerId,
      referencePlayerId,
      foulSufferedById,
      goalCoordinates: goalPoint ?? undefined,
      videoPath: videoPath || undefined,
      mediaAssetId: mediaAssetId || undefined,
      fieldDrawing: fieldPoint ?? undefined,
      assistDrawing: assistDrawingPoint ?? undefined,
      transitionDrawing: transitionDrawingPoint ?? undefined,
      attackingSpaceId: attackingSpaceId ?? undefined,
      cornerProfile: cornerProfile || undefined,
      freekickProfile: resolvedFreekickProfile || undefined,
      throwInProfile: throwInProfile || undefined,
      goalkeeperOutlet: goalkeeperOutlet || undefined,
      previousMomentDescription: previousMomentDescription || undefined,
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
    setMessage("Goal saved successfully.");
    setStep("team");
    setScorerId(undefined);
    setAssistId(undefined);
    setMinute(0);
    setMomentId(undefined);
    setSubMomentId(undefined);
    setActionIds([]);
    setOffensiveSequenceActionBySubMoment({});
    setCornerProfile("");
    setFreekickProfile("");
    setThrowInProfile("");
    setGoalkeeperOutlet("");
    setGoalPoint(null);
    setAssistDrawingPoint(null);
    setTransitionDrawingPoint(null);
    setAttackingSpaceId(undefined);
    setNotes("");
    setVideoPath("");
    setMediaAssetId(null);
    setInvolvements([]);
    setFieldPoint(null);
    setCornerTakerId(undefined);
    setFreekickTakerId(undefined);
    setPenaltyTakerId(undefined);
    setCrossAuthorId(undefined);
    setThrowInTakerId(undefined);
    setReferencePlayerId(undefined);
    setFoulSufferedById(undefined);
    setPreviousMomentDescription("");
  },
  onError: (err: any) => setMessage(err.message ?? "Could not save the goal")
});

const updateMutation = useMutation({
  mutationFn: async () => {
    if (!existingGoal) return;
    const subMomentSequencePayload = isOffensiveOrganizationMoment
      ? [...offensiveOrganizationSequenceSelection]
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          .map((entry) => ({ ...entry }))
      : resolvedSubMomentId && resolvedActionIds.length > 0
        ? [{ subMomentId: resolvedSubMomentId, actionId: resolvedActionIds[0], sequenceOrder: 1 }]
        : [];
    const effectiveActionIds = isOffensiveOrganizationMoment
      ? subMomentSequencePayload.map((entry) => entry.actionId)
      : resolvedActionIds;
    const effectiveSubMomentId = isOffensiveOrganizationMoment
      ? subMomentSequencePayload[subMomentSequencePayload.length - 1]?.subMomentId
      : resolvedSubMomentId;

    if (!teamId || !opponentTeamId || !scorerId || !momentId || !effectiveSubMomentId || effectiveActionIds.length === 0) {
      throw new Error("Required fields are missing");
    }
    if (isOffensiveOrganizationMoment && !hasCompleteOffensiveOrganizationCatalogue) {
      throw new Error("Organised Attack sub-phases were not found in the catalogue.");
    }
    if (isOffensiveOrganizationMoment && !hasAnyOffensiveOrganizationSelection) {
      throw new Error("Select at least one Organised Attack phase.");
    }
    if (!seasonId || !championshipId) throw new Error("Select a season and competition.");

    const selectedActions = lookupsQuery.data?.actions.filter((a) => effectiveActionIds.includes(a.id)) ?? [];
    const requiresGoal = selectedActions.some((a) => a.name.toLowerCase().includes("marcador") || a.context === "field_goal");
    const requiresField = selectedActions.length > 0;
    const derivedFreekickProfile = deriveFreekickProfileFromActions(selectedActions);
    const resolvedFreekickProfile = derivedFreekickProfile || freekickProfile;
    if (requiresGoal && !goalPoint) throw new Error("This action requires a point on the goal.");
    if (requiresField && !fieldPoint) throw new Error("A point on the pitch is required for this action.");
    if (shouldShowTransitionStep && !attackingSpaceId) {
      throw new Error("Select the recovery area.");
    }
    const hasFoulSufferedAction = selectedActions.some((a) => {
      const normalized = normalizeActionName(a.name);
      return (
        normalized.includes("falta sobre") ||
        normalized.includes("falta sofrida") ||
        normalized.includes("sofreu a falta")
      );
    });
    if (hasFoulSufferedAction && !foulSufferedById) {
      throw new Error("Select the player who was fouled.");
    }
    const selectedSubMomentName = normalizeActionName(
      lookupsQuery.data?.subMoments.find((s) => s.id === effectiveSubMomentId)?.name ?? ""
    );
    const isDirectFreekickOrPenalty =
      ((selectedSubMomentName.includes("livre") &&
        (selectedSubMomentName.includes("direto") || selectedSubMomentName.includes("directo"))) ||
        selectedSubMomentName.includes("penal") ||
        selectedSubMomentName.includes("penalty"));
    const hasPreviousMomentAction = selectedActions.some((a) =>
      normalizeActionName(a.name).includes("momento anterior")
    );
    if (hasPreviousMomentAction && isDirectFreekickOrPenalty && !previousMomentDescription.trim()) {
      throw new Error("Describe the previous phase.");
    }

    const payload = {
      opponentTeamId,
      teamId,
      scorerId,
      assistId: assistId ?? null,
      minute,
      momentId,
      momentName: selectedMoment?.name ?? undefined,
      subMomentId: effectiveSubMomentId,
      actionIds: effectiveActionIds,
      subMomentSequence: subMomentSequencePayload,
      cornerTakerId,
      freekickTakerId,
      penaltyTakerId,
      crossAuthorId,
      throwInTakerId,
      referencePlayerId,
      foulSufferedById,
      goalCoordinates: goalPoint ?? undefined,
      videoPath: videoPath || undefined,
      mediaAssetId: mediaAssetId || undefined,
      fieldDrawing: fieldPoint ?? undefined,
      assistDrawing: assistDrawingPoint ?? undefined,
      transitionDrawing: transitionDrawingPoint ?? undefined,
      attackingSpaceId: attackingSpaceId ?? undefined,
      cornerProfile: cornerProfile || undefined,
      freekickProfile: resolvedFreekickProfile || undefined,
      throwInProfile: throwInProfile || undefined,
      goalkeeperOutlet: goalkeeperOutlet || undefined,
      previousMomentDescription: previousMomentDescription || undefined,
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
    setMessage("Goal updated.");
    onSaved?.();
  },
  onError: (err: any) => setMessage(err.message ?? "Could not update the goal")
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





  const selectedMoment = momentId ? lookupsQuery.data?.moments.find((m) => m.id === momentId) : undefined;
  const normalizedMomentName = normalizeActionName(selectedMoment?.name ?? "");
  const isOffensiveOrganizationMoment = normalizedMomentName === "organizacao ofensiva";

  const offensiveOrganizationSubMomentRows = useMemo(() => {
    if (!isOffensiveOrganizationMoment || !lookupsQuery.data) return [];
    const byNormalizedName = new Map(filteredSubMoments.map((subMoment) => [normalizeActionName(subMoment.name), subMoment]));
    return offensiveOrganizationSequenceNames
      .map((name, index) => {
        const subMoment = byNormalizedName.get(name);
        if (!subMoment) return null;
        const availableActions = lookupsQuery.data.actions.filter((action) => {
          if (action.subMomentId !== subMoment.id) return false;
          return !hiddenActionNames.has(normalizeActionName(action.name));
        });
        return {
          sequenceOrder: index + 1,
          subMoment,
          actions: availableActions
        };
      })
      .filter(
        (
          row
        ): row is {
          sequenceOrder: number;
          subMoment: { id: number; name: string; momentId: number };
          actions: LookupAction[];
        } => Boolean(row)
      );
  }, [isOffensiveOrganizationMoment, filteredSubMoments, lookupsQuery.data]);

  const offensiveOrganizationSequenceSelection = useMemo(
    () =>
      offensiveOrganizationSubMomentRows
        .map((row) => {
          const actionId = offensiveSequenceActionBySubMoment[row.subMoment.id];
          if (!actionId) return null;
          return {
            subMomentId: row.subMoment.id,
            actionId,
            sequenceOrder: row.sequenceOrder
          };
        })
        .filter(
          (
            item
          ): item is {
            subMomentId: number;
            actionId: number;
            sequenceOrder: number;
          } => Boolean(item)
        ),
    [offensiveOrganizationSubMomentRows, offensiveSequenceActionBySubMoment]
  );

  useEffect(() => {
    if (!isOffensiveOrganizationMoment) return;
    const validSubMomentIds = new Set(offensiveOrganizationSubMomentRows.map((row) => row.subMoment.id));
    setOffensiveSequenceActionBySubMoment((prev) => {
      const nextEntries = Object.entries(prev).filter(([key]) => validSubMomentIds.has(Number(key)));
      if (nextEntries.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(nextEntries.map(([key, value]) => [Number(key), value]));
    });
  }, [isOffensiveOrganizationMoment, offensiveOrganizationSubMomentRows]);

  const hasCompleteOffensiveOrganizationCatalogue =
    offensiveOrganizationSubMomentRows.length === offensiveOrganizationSequenceNames.length;
  const hasAnyOffensiveOrganizationSelection = offensiveOrganizationSequenceSelection.length > 0;

  const resolvedSubMomentId = isOffensiveOrganizationMoment
    ? offensiveOrganizationSequenceSelection[offensiveOrganizationSequenceSelection.length - 1]?.subMomentId
    : subMomentId;
  const resolvedActionIds = isOffensiveOrganizationMoment
    ? offensiveOrganizationSequenceSelection.map((entry) => entry.actionId)
    : actionIds;

  const selectedSubMoment = resolvedSubMomentId ? lookupsQuery.data?.subMoments.find((s) => s.id === resolvedSubMomentId) : undefined;
  const normalizedSubMomentName = normalizeActionName(selectedSubMoment?.name ?? "");
  const isOffensiveTransitionMoment = normalizedMomentName === "transicao ofensiva";
  const isRecoveryDefensiveSubMoment =
    normalizedSubMomentName.includes("recuperacao") && normalizedSubMomentName.includes("meio campo defensivo");
  const isRecoveryOffensiveSubMoment =
    normalizedSubMomentName.includes("recuperacao") && normalizedSubMomentName.includes("meio campo ofensivo");
  const isTransitionRecoverySubMoment = isRecoveryDefensiveSubMoment || isRecoveryOffensiveSubMoment;
  const isOffensiveTransitionRecovery = isOffensiveTransitionMoment && isTransitionRecoverySubMoment;
  const transitionRecoveryZoneLabel = isRecoveryDefensiveSubMoment
    ? "Recovery in the Defensive Half"
    : isRecoveryOffensiveSubMoment
      ? "Recovery in the Attacking Half"
      : "Select the recovery sub-phase";
  const recoveryGridVariant: RecoveryGridVariant = isRecoveryOffensiveSubMoment ? "offensive" : "defensive";
  const shouldShowTransitionStep = isOffensiveTransitionRecovery;
  const visibleSteps = useMemo(
    () => wizardStepDefinitions.filter((wizardStep) => shouldShowTransitionStep || wizardStep.id !== "transition"),
    [shouldShowTransitionStep]
  );

  useEffect(() => {
    if (!shouldShowTransitionStep) {
      setTransitionDrawingPoint(null);
      setAttackingSpaceId(undefined);
      if (step === "transition") {
        setStep("assist");
      }
    }
  }, [shouldShowTransitionStep, step]);

  const filteredActions = useMemo(() => {
    if (isOffensiveOrganizationMoment) return [];
    if (!subMomentId || !lookupsQuery.data) return [];
    const bySubMoment = lookupsQuery.data.actions.filter((a) => {
      if (a.subMomentId !== subMomentId) return false;
      const normalized = normalizeActionName(a.name);
      if (hiddenActionNames.has(normalized)) return false;
      return true;
    });

    if (!isOffensiveTransitionRecovery) return bySubMoment;

    const actionByCanonical = new Map<string, LookupAction>();
    bySubMoment.forEach((action) => {
      const canonical = normalizeRecoveryAction(action.name);
      if (!recoveryActionWhitelist.has(canonical)) return;
      if (!actionByCanonical.has(canonical)) {
        actionByCanonical.set(canonical, action);
      }
    });

    lookupsQuery.data.actions.forEach((action) => {
      const normalized = normalizeActionName(action.name);
      if (hiddenActionNames.has(normalized)) return;
      const canonical = normalizeRecoveryAction(action.name);
      if (!recoveryActionWhitelist.has(canonical)) return;
      if (!actionByCanonical.has(canonical)) {
        actionByCanonical.set(canonical, action);
      }
    });

    return recoveryActionOrder
      .map((canonical) => actionByCanonical.get(canonical))
      .filter((action): action is LookupAction => Boolean(action));
  }, [lookupsQuery.data, subMomentId, isOffensiveTransitionRecovery, isOffensiveOrganizationMoment]);

  useEffect(() => {
    if (isOffensiveOrganizationMoment) {
      setActionIds([]);
      return;
    }
    setActionIds((prev) => {
      const next = prev.filter((id) => filteredActions.some((action) => action.id === id));
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [filteredActions, isOffensiveOrganizationMoment]);

  useEffect(() => {
    if (!shouldShowTransitionStep || !attackingSpaceId) return;
    const mappedPoint = getRecoveryZoneCenterPoint(recoveryGridVariant, attackingSpaceId);
    if (mappedPoint) {
      setTransitionDrawingPoint(mappedPoint);
    }
  }, [attackingSpaceId, recoveryGridVariant, shouldShowTransitionStep]);

  useEffect(() => {
    if (!shouldShowTransitionStep || attackingSpaceId || !transitionDrawingPoint) return;
    const inferredZoneId = getClosestRecoveryZoneId(recoveryGridVariant, transitionDrawingPoint);
    if (inferredZoneId) {
      setAttackingSpaceId(inferredZoneId);
    }
  }, [attackingSpaceId, recoveryGridVariant, shouldShowTransitionStep, transitionDrawingPoint]);

  const selectedActions = useMemo(() => {
    if (!lookupsQuery.data) return [];
    if (isOffensiveOrganizationMoment) {
      const actionById = new Map(lookupsQuery.data.actions.map((action) => [action.id, action]));
      return offensiveOrganizationSequenceSelection
        .map((entry) => actionById.get(entry.actionId))
        .filter((action): action is LookupAction => Boolean(action));
    }
    return filteredActions.filter((a) => actionIds.includes(a.id));
  }, [lookupsQuery.data, isOffensiveOrganizationMoment, offensiveOrganizationSequenceSelection, filteredActions, actionIds]);

  const offensiveSequenceSummary = useMemo(() => {
    if (!lookupsQuery.data || !isOffensiveOrganizationMoment) return [];
    const actionById = new Map(lookupsQuery.data.actions.map((action) => [action.id, action]));
    return offensiveOrganizationSubMomentRows.map((row) => {
      const selectedActionId = offensiveSequenceActionBySubMoment[row.subMoment.id];
      const selectedAction = selectedActionId ? actionById.get(selectedActionId) : undefined;
      return {
        sequenceOrder: row.sequenceOrder,
        subMomentName: row.subMoment.name,
        actionName: selectedAction?.name ?? null
      };
    });
  }, [lookupsQuery.data, isOffensiveOrganizationMoment, offensiveOrganizationSubMomentRows, offensiveSequenceActionBySubMoment]);

  const normalizedSelectedActionNames = useMemo(
    () => selectedActions.map((action) => normalizeActionName(action.name)),
    [selectedActions]
  );

  const hasCornerAction = normalizedSelectedActionNames.some((name) => name.includes("canto"));
  const hasFreekickAction = normalizedSelectedActionNames.some(
    (name) => name.includes("livre") || name.includes("falta")
  );
  const hasPenaltyAction = normalizedSelectedActionNames.some((name) => name.includes("penal"));
  const hasPreviousMomentAction = normalizedSelectedActionNames.some((name) => name.includes("momento anterior"));
  const hasCrossAction = normalizedSelectedActionNames.some((name) => name.includes("cruzamento"));
  const hasThrowInAction = normalizedSelectedActionNames.some((name) => name.includes("lancamento"));
  const hasThrowInMarkerAction = normalizedSelectedActionNames.some(
    (name) => name.includes("marcador") && name.includes("lancamento")
  );
  const hasReferencePlayersAction = normalizedSelectedActionNames.some((name) => name.includes("referenc"));
  const hasFoulSufferedAction = normalizedSelectedActionNames.some(
    (name) =>
      name.includes("falta sobre") ||
      name.includes("falta sofrida") ||
      name.includes("sofreu a falta")
  );
  const hasCornerMarkerAction = normalizedSelectedActionNames.some(
    (name) => name.includes("marcador") && name.includes("canto")
  );
  const hasFreekickMarkerAction = normalizedSelectedActionNames.some(
    (name) => name.includes("marcador") && (name.includes("livre") || name.includes("falta"))
  );

  const requiresGoal = selectedActions.some((a) => a.name.toLowerCase().includes("marcador") || a.context === "field_goal");
  const requiresField = selectedActions.length > 0;




  const isCorner = normalizedSubMomentName.includes("canto");


  const isFreeKick = normalizedSubMomentName.includes("livre");
  const isDirectFreekickSubMoment =
    normalizedSubMomentName.includes("livre") &&
    (normalizedSubMomentName.includes("direto") || normalizedSubMomentName.includes("directo"));


  const isPenalty = normalizedSubMomentName.includes("penal") || normalizedSubMomentName.includes("penalty");


  const isCross = hasCrossAction;

  const isThrowIn = normalizedSubMomentName.includes("lancamento");
  const shouldRequirePenaltyTaker = isPenalty || hasPenaltyAction;
  const shouldShowPreviousMomentDescription = hasPreviousMomentAction && (isDirectFreekickSubMoment || isPenalty);

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
    if (!shouldRequirePenaltyTaker) {
      setPenaltyTakerId(undefined);
    }
    if (!hasCrossAction) {
      setCrossAuthorId(undefined);
    }
    if (!hasThrowInAction) {
      setThrowInProfile("");
    }
    if (!hasThrowInAction || !hasThrowInMarkerAction) {
      setThrowInTakerId(undefined);
    }
    if (!hasReferencePlayersAction) {
      setReferencePlayerId(undefined);
    }
    if (!hasFoulSufferedAction) {
      setFoulSufferedById(undefined);
    }
    if (!shouldShowPreviousMomentDescription) {
      setPreviousMomentDescription("");
    }
  }, [
    hasCornerAction,
    hasCornerMarkerAction,
    hasFreekickAction,
    hasFreekickMarkerAction,
    shouldRequirePenaltyTaker,
    hasCrossAction,
    hasThrowInAction,
    hasThrowInMarkerAction,
    hasReferencePlayersAction,
    hasFoulSufferedAction,
    shouldShowPreviousMomentDescription
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
    const existingSequence =
      existingGoal.subMomentSequence && existingGoal.subMomentSequence.length > 0
        ? existingGoal.subMomentSequence
        : existingGoal.subMomentId && existingActions.length > 0
          ? [{ subMomentId: existingGoal.subMomentId, actionId: existingActions[0], sequenceOrder: 1 }]
          : [];
    setOffensiveSequenceActionBySubMoment(
      Object.fromEntries(existingSequence.map((entry) => [entry.subMomentId, entry.actionId]))
    );
    setGoalPoint(existingGoal.goalCoordinates ?? null);
    setFieldPoint(existingGoal.fieldDrawing ?? null);
    setAssistDrawingPoint(existingGoal.assistDrawing ?? toPoint(existingGoal.assistCoordinates) ?? null);
    setTransitionDrawingPoint(existingGoal.transitionDrawing ?? null);
    setAttackingSpaceId(existingGoal.attackingSpaceId ?? undefined);
    setCornerProfile(existingGoal.cornerProfile ?? "");
    setFreekickProfile(existingGoal.freekickProfile ?? "");
    setThrowInProfile(existingGoal.throwInProfile ?? "");
    setGoalkeeperOutlet(existingGoal.goalkeeperOutlet ?? "");
    setNotes(existingGoal.notes ?? "");
    setVideoPath(existingGoal.videoPath ?? "");
    setMediaAssetId(existingGoal.mediaAssetId ?? null);
    setInvolvements(existingGoal.involvements ?? []);
    setCornerTakerId(existingGoal.cornerTakerId ?? undefined);
    setFreekickTakerId(existingGoal.freekickTakerId ?? undefined);
    setPenaltyTakerId(existingGoal.penaltyTakerId ?? undefined);
    setCrossAuthorId(existingGoal.crossAuthorId ?? undefined);
    setThrowInTakerId(existingGoal.throwInTakerId ?? undefined);
    setReferencePlayerId(existingGoal.referencePlayerId ?? undefined);
    setFoulSufferedById(existingGoal.foulSufferedById ?? undefined);
    setPreviousMomentDescription(existingGoal.previousMomentDescription ?? "");
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


        return Boolean(
          momentId &&
            minute >= 0 &&
            (isOffensiveOrganizationMoment
              ? hasAnyOffensiveOrganizationSelection
              : resolvedSubMomentId && resolvedActionIds.length > 0)
        );

      case "transition":
        return shouldShowTransitionStep ? Boolean(attackingSpaceId) : true;


      case "assist":


        return requiresField ? Boolean(assistDrawingPoint) : true;


      case "field":


        return requiresField ? Boolean(fieldPoint) : true;


      case "zone":


        return requiresGoal ? Boolean(goalPoint) : true;


      case "review":


        return true;


      default:


        return false;


    }


  };





  const currentIndex = Math.max(
    0,
    visibleSteps.findIndex((s) => s.id === step)
  );


  const movePrev = () => setStep(visibleSteps[Math.max(0, currentIndex - 1)].id);


  const moveNext = () => setStep(visibleSteps[Math.min(visibleSteps.length - 1, currentIndex + 1)].id);


  const readyToSave = Boolean(


    seasonId &&


    championshipId &&


    teamId &&


    opponentTeamId &&


    scorerId &&


    momentId &&


    (isOffensiveOrganizationMoment
      ? hasAnyOffensiveOrganizationSelection
      : resolvedSubMomentId && resolvedActionIds.length > 0) &&


    (!hasCornerMarkerAction || cornerTakerId) &&


    (!hasFreekickMarkerAction || freekickTakerId) &&


    (!shouldRequirePenaltyTaker || penaltyTakerId) &&


    (!hasCrossAction || crossAuthorId) &&


    (!hasThrowInMarkerAction || throwInTakerId) &&


    (!hasFoulSufferedAction || foulSufferedById) &&


    (!shouldShowPreviousMomentDescription || previousMomentDescription.trim().length > 0) &&

    canNext("transition") &&


    canNext("assist") &&


    canNext("zone") &&


    canNext("field")


  );





  async function handleCreate(kind: "moment" | "submoment" | "action", name: string, context?: "field" | "field_goal") {


    if (kind === "moment") {


      await fetchJson("/api/lookups/moments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });


    } else if (kind === "submoment") {


      if (!momentId) throw new Error("Select a phase before creating a sub-phase.");


      await fetchJson("/api/lookups/sub-moments", {


        method: "POST",


        headers: { "Content-Type": "application/json" },


        body: JSON.stringify({ momentId, name })


      });


    } else {


      if (!subMomentId) throw new Error("Select a sub-phase before creating an action.");


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


        <CardHeader title="Goal Recording Wizard" description="Structured workflow for saving goal events in real time." />


        <CardContent className="space-y-6 pb-28 md:pb-6">


          <StepIndicator current={step} steps={visibleSteps} />





          {step === "season" && (


            <div className="space-y-4">


              <div className="space-y-2">


                <label className="text-sm font-medium">Season</label>


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


                  <option value="">Select season</option>


                  {lookupsQuery.data?.seasons.map((s) => (


                    <option key={s.id} value={s.id} className="text-black">


                      {displayFootballTerm(s.name)}


                    </option>


                  ))}


                </Select>


              </div>


              <div className="text-xs text-muted-foreground">


                Need to create a season? <a href="/manage/config" className="text-cyan-300 underline">Open Settings</a>


              </div>


            </div>


          )}





          {step === "championship" && (


            <div className="space-y-4">


              <div className="space-y-2">


                <label className="text-sm font-medium">Competition</label>


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


                  <option value="">Select competition</option>


                  {filteredChampionships.map((c) => (


                    <option key={c.id} value={c.id} className="text-black">


                      {c.name}


                    </option>


                  ))}


                </Select>


              </div>


              <div className="text-xs text-muted-foreground">


                Need to create a competition? <a href="/manage/config" className="text-cyan-300 underline">Open Settings</a>


              </div>


            </div>


          )}





          {step === "team" && (


            <div className="grid gap-4 md:grid-cols-3">




              <div className="md:col-span-2 space-y-2">


                <label className="text-sm font-medium">Team</label>


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


                  <option value="">Select team</option>


                  {filteredTeams.map((team) => (


                    <option key={team.id} value={team.id} className="text-black">


                      {team.name}


                    </option>


                  ))}


                </Select>


              </div>


              <div className="space-y-2">


                <label className="text-sm font-medium">Opposing Team</label>


                <Select


                  value={opponentTeamId?.toString() ?? ""}


                  onChange={(e) => setOpponentTeamId(e.target.value ? Number(e.target.value) : undefined)}


                  aria-label="opponent-select"


                  disabled={!championshipId}


                >


                  <option value="">Select opponent</option>


                  {opponentOptions.map((team) => (


                    <option key={team.id} value={team.id} className="text-black">


                      {team.name}


                    </option>


                  ))}


                </Select>


                <p className="text-xs text-muted-foreground">


                  Filtered to the same competition/season (Premier League 25/26), excluding the selected team.


                </p>


              </div>


            </div>


          )}





          {step === "scorer" && (


            <div className="grid gap-4 md:grid-cols-2">


              <div className="space-y-2">


                <label className="text-sm font-medium">Scorer</label>


                <Select


                  value={scorerId?.toString() ?? ""}


                  onChange={(e) => setScorerId(Number(e.target.value) || undefined)}


                  disabled={!teamId || playersQuery.isLoading}


                >


                  <option value="">Select player</option>


                  {currentPlayers.map((p) => (


                    <option key={p.id} value={p.id} className="text-black">


                      {p.name}


                    </option>


                  ))}


                </Select>


              </div>


              <div className="space-y-2">


                <label className="text-sm font-medium">Assist (optional)</label>


                <Select


                  value={assistId?.toString() ?? ""}


                  onChange={(e) => setAssistId(e.target.value ? Number(e.target.value) : undefined)}


                  disabled={!teamId || playersQuery.isLoading}


                >


                  <option value="">No assist</option>


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


                    <div className="text-sm font-medium">Secondary Involvements</div>


                    <p className="text-xs text-muted-foreground">Select players involved in the move for the ‘Most Involved’ metric.</p>


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


                          {isInvolved ? "Remover" : "Add"}


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


                          {player?.name ?? inv.playerId} / {inv.role === "assist" ? "assist" : "involvement"}


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
                <Input 
                  type="text" 
                  value={minute} 
                  onChange={(e) => setMinute(parseInt(e.target.value) || 0)} 
                  placeholder="ex: 23 ou 45+2"
                  className="bg-card/70 border-border/60 text-white"
                />
              </div>


              <div className="space-y-2">


                <label className="text-sm font-medium">Phase</label>


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
                    setOffensiveSequenceActionBySubMoment({});
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
                    setAssistDrawingPoint(null);
                    setTransitionDrawingPoint(null);
                    setAttackingSpaceId(undefined);


                  }}


                >


                  <option value="">Select phase</option>


                  <option value="__create__">+ Create novo...</option>


                  {lookupsQuery.data?.moments.map((m) => (


                    <option key={m.id} value={m.id} className="text-black">


                      {displayFootballTerm(m.name)}


                    </option>


                  ))}


                </Select>


              </div>


              {isOffensiveOrganizationMoment ? (
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Organised Attack Sequence</label>
                      <p className="text-xs text-muted-foreground">
                        Select only the phases observed (each phase is optional).
                      </p>
                    </div>
                    <Badge className="bg-cyan-500/10 text-cyan-100">
                      {offensiveOrganizationSequenceSelection.length}/{offensiveOrganizationSequenceNames.length} fases
                    </Badge>
                  </div>
                  {!hasCompleteOffensiveOrganizationCatalogue ? (
                    <div className="rounded-xl border border-dashed border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                      The Organised Attack sub-phase configuration is incomplete.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-4">
                      {offensiveOrganizationSubMomentRows.map((row) => (
                        <div
                          key={`oo-seq-${row.subMoment.id}`}
                          className="rounded-2xl border border-border/70 bg-gradient-to-b from-slate-900/70 to-slate-950/50 p-3 shadow-[0_16px_32px_rgba(2,6,23,0.4)]"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                              Fase {row.sequenceOrder}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              {offensiveSequenceActionBySubMoment[row.subMoment.id] ? "Definida" : "Por definir"}
                            </span>
                          </div>
                          <div className="mb-3 text-sm font-semibold text-white">{displayFootballTerm(row.subMoment.name)}</div>
                          <div className="space-y-2">
                            {row.actions.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-border/60 bg-card/50 px-2 py-2 text-[11px] text-muted-foreground">
                                No actions available for this sub-phase.
                              </div>
                            ) : (
                              row.actions.map((action) => {
                                const isSelected = offensiveSequenceActionBySubMoment[row.subMoment.id] === action.id;
                                return (
                                  <button
                                    key={`oo-action-${row.subMoment.id}-${action.id}`}
                                    type="button"
                                    onClick={() =>
                                      setOffensiveSequenceActionBySubMoment((prev) => {
                                        const currentActionId = prev[row.subMoment.id];
                                        if (currentActionId === action.id) {
                                          const { [row.subMoment.id]: _removed, ...rest } = prev;
                                          return rest;
                                        }
                                        return {
                                          ...prev,
                                          [row.subMoment.id]: action.id
                                        };
                                      })
                                    }
                                    className={cn(
                                      "w-full rounded-lg border px-2 py-2 text-left text-xs transition",
                                      isSelected
                                        ? "border-emerald-400 bg-emerald-500/12 text-emerald-100"
                                        : "border-border/50 bg-card/60 text-muted-foreground hover:border-cyan-400/40 hover:text-white"
                                    )}
                                  >
                                    <div className="font-medium">{displayFootballTerm(action.name)}</div>
                                    <div className="mt-1 text-[10px] opacity-80">
                                      {action.context === "field_goal" ? "Pitch + Goal" : "Pitch"}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sub-phase</label>
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
                        setOffensiveSequenceActionBySubMoment({});
                        setCornerTakerId(undefined);
                        setFreekickTakerId(undefined);
                        setPenaltyTakerId(undefined);
                        setCrossAuthorId(undefined);
                        setTransitionDrawingPoint(null);
                        setAttackingSpaceId(undefined);
                      }}
                      disabled={!momentId}
                    >
                      <option value="">Select sub-phase</option>
                      <option value="__create__" disabled={!momentId}>
                        + Create novo...
                      </option>
                      {filteredSubMoments.map((s) => (
                        <option key={s.id} value={s.id} className="text-black">
                          {displayFootballTerm(s.name)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Actions</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setModal({ kind: "action", open: true })}
                      >
                        + Create novo...
                      </Button>
                    </div>
                    {filteredActions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                        Select a sub-phase to view the available actions.
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
                                <span className="font-medium text-white">{displayFootballTerm(action.name)}</span>
                                <p className="text-[11px] text-muted-foreground">
                                  {action.context === "field_goal" ? "Pitch + Goal" : "Pitch"}
                                </p>
                              </div>
                              <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-semibold">
                                {isSelected ? "Selected" : "Select"}
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
                            {displayFootballTerm(action.name)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {hasReferencePlayersAction && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Who was the reference player?</label>
                  <Select
                    value={referencePlayerId?.toString() ?? ""}
                    onChange={(e) => setReferencePlayerId(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={!teamId || playersQuery.isLoading}
                    className="bg-card/70 border-border/60 text-white"
                  >
                    <option value="">Select player</option>
                    {currentPlayers.map((p) => (
                      <option key={p.id} value={p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {hasThrowInMarkerAction && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Who took the throw-in?</label>
                  <Select
                    value={throwInTakerId?.toString() ?? ""}
                    onChange={(e) => setThrowInTakerId(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={!teamId || playersQuery.isLoading}
                    className="bg-card/70 border-border/60 text-white"
                  >
                    <option value="">Select player</option>
                    {currentPlayers.map((p) => (
                      <option key={p.id} value={p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {hasFoulSufferedAction && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Who was fouled?</label>
                  <Select
                    value={foulSufferedById?.toString() ?? ""}
                    onChange={(e) => setFoulSufferedById(e.target.value ? Number(e.target.value) : undefined)}
                    disabled={!teamId || playersQuery.isLoading}
                    className="bg-card/70 border-border/60 text-white"
                  >
                    <option value="">Select player</option>
                    {currentPlayers.map((p) => (
                      <option key={p.id} value={p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}


              {hasCornerAction && (


                <>


                  {hasCornerMarkerAction ? (


                    <div className="space-y-2">


                      <label className="text-sm font-medium">Corner Taker</label>


                      <Select


                        value={cornerTakerId?.toString() ?? ""}


                        onChange={(e) => setCornerTakerId(e.target.value ? Number(e.target.value) : undefined)}


                        disabled={!teamId || playersQuery.isLoading}


                      >


                        <option value="">Select player</option>


                        {currentPlayers.map((p) => (


                          <option key={p.id} value={p.id} className="text-black">


                            {p.name}


                          </option>


                        ))}


                      </Select>


                    </div>


                  ) : (


                    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">


                    Select the &ldquo;Corner Taker&rdquo; action to identify the player responsible.


                    </div>


                  )}


                  <div className="space-y-2">
                    <label className="text-sm font-medium">Corner Type</label>
                    <Select value={cornerProfile} onChange={(e) => setCornerProfile(e.target.value)}>
                      <option value="">No type</option>
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


                      <label className="text-sm font-medium">Free-kick Taker</label>


                      <Select


                        value={freekickTakerId?.toString() ?? ""}


                        onChange={(e) => setFreekickTakerId(e.target.value ? Number(e.target.value) : undefined)}


                        disabled={!teamId || playersQuery.isLoading}


                      >


                        <option value="">Select player</option>


                        {currentPlayers.map((p) => (


                          <option key={p.id} value={p.id} className="text-black">


                            {p.name}


                          </option>


                        ))}


                      </Select>


                    </div>


                  ) : (


                    <div className="rounded-xl border border-dashed border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">


                      Select the &ldquo;Free-kick Taker&rdquo; action to enable the player selector.


                    </div>


                  )}


                  <p className="text-xs text-muted-foreground">
                    The free-kick type (Inswinging, Outswinging or Routine) follows the action card selected in the previous step.
                  </p>


                </>


              )}


              {shouldRequirePenaltyTaker && (


                <div className="space-y-2">


                  <label className="text-sm font-medium">Penalty Taker</label>


                  <Select


                    value={penaltyTakerId?.toString() ?? ""}


                    onChange={(e) => setPenaltyTakerId(e.target.value ? Number(e.target.value) : undefined)}


                    disabled={!teamId || playersQuery.isLoading}


                  >


                    <option value="">Select player</option>


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


                    <option value="">Select player</option>


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
                  <label className="text-sm font-medium">Throw-in Type</label>
                  <Select value={throwInProfile} onChange={(e) => setThrowInProfile(e.target.value)}>
                    <option value="">No type</option>
                    {throwInProfiles.map((option) => (
                      <option key={option.value} value={option.value} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {shouldShowPreviousMomentDescription && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Previous Phase</label>
                  <Input
                    value={previousMomentDescription}
                    onChange={(e) => setPreviousMomentDescription(e.target.value)}
                    placeholder="Describe the phase before the move"
                  />
                </div>
              )}
              <div className="md:col-span-2 space-y-2">


                <label className="text-sm font-medium">Notas (opcional)</label>


                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tactical context or notes" />


              </div>


              <div className="md:col-span-2 space-y-2">


                <label className="text-sm font-medium">Video do goal</label>


                <GoalVideoPicker
                  mediaAssetId={mediaAssetId}
                  legacyPath={videoPath}
                  onChange={(selection) => {
                    setMediaAssetId(selection.mediaAssetId);
                    setVideoPath(selection.legacyPath);
                  }}
                />


              </div>


            </div>


          )}





          {step === "transition" && shouldShowTransitionStep && (


            <div className={mapStepContainerClass}>


              <div className="flex items-center justify-between">


                <label className="text-sm font-medium">Recovery Area</label>


                <span className="text-xs text-muted-foreground">{transitionRecoveryZoneLabel}</span>


              </div>


              <RecoverySpaceGrid
                variant={recoveryGridVariant}
                value={attackingSpaceId}
                onChange={(zoneId) => setAttackingSpaceId(zoneId)}
              />


            </div>


          )}





          {step === "assist" && (


            <div className={mapStepContainerClass}>


              <div className="flex items-center justify-between">


                <label className="text-sm font-medium">Assist Area</label>


                <span className="text-xs text-muted-foreground">
                  {requiresField ? "Required for this action." : "Optional tactical reference."}
                </span>


              </div>


              <PitchPinpoint value={assistDrawingPoint} onChange={setAssistDrawingPoint} storageField="assist_drawing" pinColor="#38bdf8" />


            </div>


          )}





          {step === "zone" && (


            <div className={mapStepContainerClass}>


              <div className="flex items-center justify-between">


                <label className="text-sm font-medium">Ponto na Goal</label>


                {requiresGoal ? (


                  <span className="text-xs text-muted-foreground">Required for actions involving a goal point.</span>


                ) : (


                  <span className="text-xs text-emerald-300">Optional for this action (pitch only).</span>


                )}


              </div>


              <GoalNetPinpoint value={goalPoint} onChange={setGoalPoint} />


            </div>


          )}





          {step === "field" && (


            <div className={mapStepContainerClass}>


              <div className="flex items-center justify-between">


                <div className="text-sm font-medium">Shot Area</div>


                <span className="text-xs text-muted-foreground">


                  {requiresField ? "Required for this action." : "Optional tactical reference."}


                </span>


              </div>


              <PitchPinpoint value={fieldPoint} onChange={setFieldPoint} storageField="field_drawing" pinColor="#22c55e" />



            </div>


          )}





          {step === "review" && (


            <div className="space-y-4 text-sm">


              <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-card/70 p-4 sm:grid-cols-2">


                <span className="text-muted-foreground">Season</span>


                <span>{lookupsQuery.data?.seasons.find((s) => s.id === seasonId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Competition</span>


                <span>{lookupsQuery.data?.championships.find((c) => c.id === championshipId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Team</span>


                <span>{teamsQuery.data?.find((t) => t.id === teamId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Opponent</span>


                <span>{lookupsQuery.data?.teams.find((t) => t.id === opponentTeamId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Scorer</span>


                <span>{currentPlayers.find((p) => p.id === scorerId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Assist</span>


                <span>{currentPlayers.find((p) => p.id === assistId)?.name ?? "-"}</span>


                <span className="text-muted-foreground">Minuto</span>


                <span>{minute}&rsquo;</span>


                <span className="text-muted-foreground">Phase</span>


                <span>{displayFootballTerm(lookupsQuery.data?.moments.find((m) => m.id === momentId)?.name) || "-"}</span>


                <span className="text-muted-foreground">Sub-phase</span>


                <span>{displayFootballTerm(lookupsQuery.data?.subMoments.find((s) => s.id === resolvedSubMomentId)?.name) || "-"}</span>


                <span className="text-muted-foreground">Actions</span>


                <span>
                  {selectedActions.length > 0
                    ? selectedActions.map((action) => displayFootballTerm(action.name)).join(", ")
                    : "-"}
                </span>
                {isOffensiveOrganizationMoment && (
                  <>
                    <span className="text-muted-foreground">Organised Attack Sequence</span>
                    <span>
                      {offensiveSequenceSummary.length > 0
                        ? offensiveSequenceSummary
                            .map((entry) => `${entry.sequenceOrder}. ${displayFootballTerm(entry.subMomentName)}: ${displayFootballTerm(entry.actionName) || "—"}`)
                            .join(" | ")
                        : "-"}
                    </span>
                  </>
                )}
                {hasReferencePlayersAction && (
                  <>
                    <span className="text-muted-foreground">Reference Player</span>
                    <span>{currentPlayers.find((p) => p.id === referencePlayerId)?.name ?? "-"}</span>
                  </>
                )}
                {hasThrowInMarkerAction && (
                  <>
                    <span className="text-muted-foreground">Throw-in Taker</span>
                    <span>{currentPlayers.find((p) => p.id === throwInTakerId)?.name ?? "-"}</span>
                  </>
                )}

                {hasFoulSufferedAction && (
                  <>
                    <span className="text-muted-foreground">Player Fouled</span>
                    <span>{currentPlayers.find((p) => p.id === foulSufferedById)?.name ?? "-"}</span>
                  </>
                )}
                {shouldShowPreviousMomentDescription && (
                  <>
                    <span className="text-muted-foreground">Previous Phase</span>
                    <span>{previousMomentDescription || "-"}</span>
                  </>
                )}

                <span className="text-muted-foreground">Goalkeeper Distribution</span>
                <span>{labelFromOption(goalkeeperOutlets, goalkeeperOutlet)}</span>



                <span className="text-muted-foreground">Context</span>


                <span>{requiresGoal ? "Pitch + Goal" : "Campo"}</span>


                {isCorner && (


                  <>


                    <span className="text-muted-foreground">Corner Taker</span>


                    <span>{currentPlayers.find((p) => p.id === cornerTakerId)?.name ?? "-"}</span>


                    <span className="text-muted-foreground">Corner Type</span>


                    <span>{labelFromOption(cornerProfiles, cornerProfile)}</span>


                  </>


                )}


                {isFreeKick && (


                  <>


                    <span className="text-muted-foreground">Free-kick Taker</span>


                    <span>{currentPlayers.find((p) => p.id === freekickTakerId)?.name ?? "-"}</span>


                    <span className="text-muted-foreground">Free-kick Type</span>


                    <span>{labelFromOption(freekickProfiles, freekickProfile)}</span>


                  </>


                )}


                {isPenalty && (


                  <>


                    <span className="text-muted-foreground">Penalty Taker</span>


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


                    <span className="text-muted-foreground">Throw-in Type</span>


                    <span>{labelFromOption(throwInProfiles, throwInProfile)}</span>


                  </>


                )}


                <span className="text-muted-foreground">Assist Area</span>


                <span>{assistDrawingPoint ? `(${assistDrawingPoint.x.toFixed(2)}, ${assistDrawingPoint.y.toFixed(2)})` : "N/A"}</span>

                {shouldShowTransitionStep && (
                  <>
                    <span className="text-muted-foreground">Recovery Area</span>
                    <span>{attackingSpaceId ? `Area ${attackingSpaceId}` : "N/A"}</span>
                  </>
                )}


                <span className="text-muted-foreground">Goal</span>


                <span>{goalPoint ? `(${goalPoint.x.toFixed(2)}, ${goalPoint.y.toFixed(2)})` : "N/A"}</span>


                <span className="text-muted-foreground">Shot Area</span>


                <span>{fieldPoint ? `(${fieldPoint.x.toFixed(2)}, ${fieldPoint.y.toFixed(2)})` : "N/A"}</span>
                <span className="text-muted-foreground">Video</span>


                <span>{videoPath || mediaAssetId ? "Anexado" : "—"}</span>


              </div>


              {involvements.length > 0 && (


                <div className="flex flex-wrap gap-2">


                  {involvements.map((inv) => (


                    <Badge key={`${inv.playerId}-${inv.role}`} className="bg-emerald-500/10 text-emerald-100">


                      {currentPlayers.find((p) => p.id === inv.playerId)?.name ?? inv.playerId} /{" "}


                      {inv.role === "assist" ? "assist" : "involvement"}


                    </Badge>


                  ))}


                </div>


              )}


              <div className={`grid gap-3 ${shouldShowTransitionStep ? "md:grid-cols-4" : "md:grid-cols-3"}`}>


                <div className="space-y-1 rounded-xl border border-border/60 bg-card/60 p-3">


                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assist</div>


                  <div className="rounded-lg border border-border/50 bg-slate-950/60 p-2">


                    <svg viewBox="0 0 105 68" className="w-full">


                      <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />


                      <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />


                      <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />


                      <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />


                      <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />


                      {assistDrawingPoint && (


                        <g transform={`translate(${assistDrawingPoint.x * 105}, ${assistDrawingPoint.y * 68})`}>


                          <circle r="3.4" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />


                          <circle r="1.8" fill="#0f172a" />


                          <circle r="0.9" fill="#38bdf8" />


                        </g>


                      )}


                    </svg>


                  </div>


                </div>


                {shouldShowTransitionStep && (
                  <div className="space-y-1 rounded-xl border border-border/60 bg-card/60 p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recovery Area</div>
                    <div className="rounded-lg border border-border/50 bg-slate-950/60 p-2">
                      <RecoverySpaceGrid
                        variant={recoveryGridVariant}
                        value={attackingSpaceId}
                        readOnly
                        showHelperText={false}
                      />
                    </div>
                  </div>
                )}


                <div className="space-y-1 rounded-xl border border-border/60 bg-card/60 p-3">


                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shot Area</div>


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


                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Goal</div>


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





          <div className="sticky bottom-0 z-20 -mx-6 mt-6 border-t border-border/60 bg-[#0b1220]/85 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl md:static md:mx-0 md:mt-2 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Step {currentIndex + 1} / {visibleSteps.length}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <Button className="w-full sm:w-auto" variant="ghost" type="button" onClick={movePrev} disabled={currentIndex === 0}>
                  Back
                </Button>

                {currentIndex < visibleSteps.length - 1 && (
                  <Button className="w-full sm:w-auto" type="button" onClick={moveNext} disabled={!canNext(step)}>
                    Next
                  </Button>
                )}

                {step === "review" && (
                  <Button
                    className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                    type="button"
                    onClick={() => (existingGoal ? updateMutation.mutate() : createMutation.mutate())}
                    disabled={createMutation.isPending || updateMutation.isPending || !readyToSave}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "A gravar..."
                      : existingGoal
                        ? "Update Goal"
                        : "Save Goal"}
                  </Button>
                )}
              </div>
            </div>
          </div>





          {message && <div className="text-sm text-cyan-300">{message}</div>}


        </CardContent>


      </Card>





      <CreateItemModal


        open={modal.open && modal.kind === "moment"}


        title="Create Phase"


        placeholder="Phase name"


        onClose={() => setModal({ ...modal, open: false })}


        onSave={(name) => handleCreate("moment", name)}


      />


      <CreateItemModal


        open={modal.open && modal.kind === "submoment"}


        title="Create Sub-phase"


        placeholder="Sub-phase name"


        onClose={() => setModal({ ...modal, open: false })}


        onSave={(name) => handleCreate("submoment", name)}


      />


      <CreateItemModal


        open={modal.open && modal.kind === "action"}


        title="Create Action"


        placeholder="Action name"


        onClose={() => setModal({ ...modal, open: false })}


        includeContext


        onSave={(name, context) => handleCreate("action", name, context)}


      />


    </>


  );


}


