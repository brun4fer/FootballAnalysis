"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SimplePie } from "@/components/ui/charts";

type TeamOption = {
  id: number;
  name: string;
  emblemPath?: string | null;
  coach?: string | null;
  stadium?: string | null;
  pitchDimensions?: string | null;
};

type MomentOption = {
  id: number;
  name: string;
};

type BpoCategory = "corners" | "free_kicks" | "direct_free_kicks" | "throw_ins";

const BPO_FILTER_OPTIONS: Array<{ value: BpoCategory; label: string }> = [
  { value: "corners", label: "Cantos" },
  { value: "free_kicks", label: "Livres" },
  { value: "direct_free_kicks", label: "Livres Diretos" },
  { value: "throw_ins", label: "Lançamentos Laterais" }
];

type PlayerRow = {
  id: number;
  name: string;
  photoPath?: string | null;
  goals?: number;
  assists?: number;
  involvement?: number;
};

type MapPoint = {
  x?: number | null;
  y?: number | null;
  sector?: string | null;
  scorerName?: string | null;
  minute?: number | null;
};

type SubMomentActionBreakdown = {
  subMomentId: number;
  subMoment: string;
  totalGoals: number;
  actions: Array<{ action: string; goals: number; percent: number }>;
};

type RecoverySpaceBreakdown = {
  subMomentId: number;
  subMoment: string;
  totalGoals: number;
  zones: Array<{ zoneId: number; goals: number; percent: number }>;
};

type RadiographyResponse = {
  distribution: { category: string; goals: number }[];
  assistZones: MapPoint[];
  shotZones: MapPoint[];
  finishZones: MapPoint[];
  topScorers: PlayerRow[];
  topAssists: PlayerRow[];
  topParticipation: PlayerRow[];
  goalkeeperOutlets: Array<{ outlet: string; goals: number }>;
  cornerProfiles: Array<{ profile: string; goals: number }>;
  freekickProfiles: Array<{ profile: string; goals: number }>;
  throwInProfiles: Array<{ profile: string; goals: number }>;
  subMomentActionBreakdown: SubMomentActionBreakdown[];
  recoverySpaces: RecoverySpaceBreakdown[];
  momentGoals: number;
  teamGoals: number;
  team: TeamOption | null;
};

const defaultImage = "/images/default.png";

const LABEL_OVERRIDES: Record<string, string> = {
  organizacao: "Organização",
  curto_para_longo: "Curto para longo",
  bola_longa: "Bola longa",
  area: "Área",
  aberto: "Aberto",
  fechado: "Fechado",
  combinado: "Combinado",
  cruzamento: "Cruzamento",
  "canto aberto": "Canto Aberto",
  "canto fechado": "Canto Fechado"
};

const formatTechnicalLabel = (value?: string | null) => {
  const raw = value?.toString().trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "indefinido") return "";
  if (LABEL_OVERRIDES[lower]) return LABEL_OVERRIDES[lower];
  const words = raw.replace(/_/g, " ").split(" ");
  return words.map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : "")).join(" ").trim();
};

const cleanDataset = <T extends Record<string, any>>(data: T[], labelKey: keyof T, valueKey: keyof T): T[] => {
  return data
    .map((entry) => {
      const rawLabel = entry[labelKey];
      const formattedLabel = formatTechnicalLabel(rawLabel);
      const value = Number(entry[valueKey]);
      if (!formattedLabel || !Number.isFinite(value) || value <= 0) return null;
      return { ...entry, [labelKey]: formattedLabel };
    })
    .filter((entry): entry is T => entry !== null);
};

const EMPTY_GRAPH_MESSAGE = "Não há golos desta maneira";
const MAP_CARD_CONTENT_CLASS = "min-h-[300px] w-full px-0 py-0";
const MAP_WRAPPER_CLASS =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-[#0c1322] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]";
const MAP_SVG_CLASS = "w-full aspect-[3/2]";
const ACTION_BAR_COLOR = "rgba(34,211,238,0.72)";

type RecoveryGridVariant = "defensive" | "offensive";
type TacticalZone = { id: number; x: number; y: number; width: number; height: number };

const DEFENSIVE_RECOVERY_ZONES: TacticalZone[] = [
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

const OFFENSIVE_RECOVERY_ZONES: TacticalZone[] = [
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

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isTransitionOffensiveMoment = (momentName?: string) =>
  normalizeToken(momentName ?? "").includes("transicao ofensiva");

const getRecoveryVariant = (subMomentName: string): RecoveryGridVariant | null => {
  const normalized = normalizeToken(subMomentName);
  if (normalized.includes("meio campo defensivo")) return "defensive";
  if (normalized.includes("meio campo ofensivo")) return "offensive";
  return null;
};

const getRecoveryZones = (variant: RecoveryGridVariant) =>
  variant === "defensive" ? DEFENSIVE_RECOVERY_ZONES : OFFENSIVE_RECOVERY_ZONES;

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return "0%";
  if (Math.abs(value - Math.round(value)) < 0.05) return `${Math.round(value)}%`;
  return `${value.toFixed(1)}%`;
};

function EmptyGraphState() {
  return (
    <div className="flex min-h-[220px] w-full items-center justify-center text-sm text-muted-foreground">
      {EMPTY_GRAPH_MESSAGE}
    </div>
  );
}

function TopPlayersCard({
  title,
  rows,
  valueKey,
  valueLabel
}: {
  title: string;
  rows: PlayerRow[];
  valueKey: "goals" | "assists" | "involvement";
  valueLabel: string;
}) {
  return (
    <Card className="h-full bg-[#0c1220]/70">
      <CardHeader title={title} />
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem dados suficientes.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 3).map((row, idx) => (
              <div
                key={`${row.id}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs text-muted-foreground">{idx + 1}º</span>
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-800">
                    <Image
                      src={row.photoPath || defaultImage}
                      alt={row.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                      priority={idx === 0}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{row.name}</span>
                    <span className="text-xs text-muted-foreground">{valueLabel}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 text-sm font-semibold text-emerald-200">
                  <span>{row[valueKey] ?? 0}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">{valueLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopMetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="bg-[#0c1420]/70 border border-border/60">
      <CardHeader title={title} />
      <CardContent className="space-y-1">
        <div className="text-xl font-semibold text-white">{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function formatPointTooltip(point: MapPoint) {
  const playerName = point.scorerName?.trim() || "Marcador";
  const minuteValue = typeof point.minute === "number" ? point.minute : null;
  return minuteValue !== null ? `${playerName} - ${minuteValue}'` : `${playerName} - --'`;
}

function GoalEntryMap({ points }: { points: MapPoint[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const pins = points.filter((point) => typeof point.x === "number" && typeof point.y === "number");

  if (!pins.length) return <EmptyGraphState />;

  return (
    <div className={MAP_WRAPPER_CLASS} onMouseLeave={() => setTooltip(null)}>
      <svg ref={svgRef} viewBox="0 0 120 80" className={MAP_SVG_CLASS} preserveAspectRatio="xMidYMid meet">
        <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b1220" stroke="#1f2937" strokeWidth="1.4" />
        <rect x="8" y="10" width="104" height="60" rx="5" fill="url(#goalGrid)" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 3" />
        <path d="M8 22h104M8 36h104M8 50h104M8 64h104" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />
        <path d="M26 10v60M46 10v60M66 10v60M86 10v60" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />
        {pins.map((pin, idx) => (
          <g
            key={`${pin.x}-${pin.y}-${idx}`}
            transform={`translate(${(pin.x ?? 0) * 120}, ${(pin.y ?? 0) * 80})`}
            onMouseEnter={(event) => {
              const rect = svgRef.current?.getBoundingClientRect();
              if (!rect) return;
              setTooltip({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                text: formatPointTooltip(pin)
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle r="7.5" fill="transparent" />
            <circle r="4.2" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />
            <circle r="2.2" fill="#0f172a" />
            <circle r="1.1" fill="#f97316" />
          </g>
        ))}
        <defs>
          <pattern id="goalGrid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 0h6M0 0v6" stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />
          </pattern>
        </defs>
      </svg>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 8, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function FieldPinMap({
  points,
  pinColor
}: {
  points: MapPoint[];
  pinColor: "#22c55e" | "#38bdf8";
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const pins = points.filter((point) => typeof point.x === "number" && typeof point.y === "number");

  if (!pins.length) return <EmptyGraphState />;

  return (
    <div className={MAP_WRAPPER_CLASS} onMouseLeave={() => setTooltip(null)}>
      <svg ref={svgRef} viewBox="0 0 120 80" className={MAP_SVG_CLASS} preserveAspectRatio="xMidYMid meet">
        <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b1220" stroke="rgba(148,163,184,0.4)" strokeWidth="1.2" />
        <line x1="60" y1="6" x2="60" y2="74" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <circle cx="60" cy="40" r="9" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <circle cx="60" cy="40" r="0.9" fill="rgba(148,163,184,0.65)" />
        <rect x="4" y="22" width="16" height="36" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <rect x="4" y="29" width="7" height="22" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <circle cx="16" cy="40" r="0.8" fill="rgba(148,163,184,0.65)" />
        <rect x="100" y="22" width="16" height="36" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <rect x="109" y="29" width="7" height="22" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <circle cx="104" cy="40" r="0.8" fill="rgba(148,163,184,0.65)" />
        <path d="M20 33a9 9 0 0 0 0 14" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        <path d="M100 33a9 9 0 0 1 0 14" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
        {pins.map((pin, idx) => (
          <g
            key={`${pin.x}-${pin.y}-${idx}`}
            transform={`translate(${(pin.x ?? 0) * 120}, ${(pin.y ?? 0) * 80})`}
            onMouseEnter={(event) => {
              const rect = svgRef.current?.getBoundingClientRect();
              if (!rect) return;
              setTooltip({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                text: formatPointTooltip(pin)
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle r="3.7" fill="transparent" />
            <circle r="2.2" fill="#f8fafc" stroke="#0f172a" strokeWidth="0.5" />
            <circle r="1.1" fill={pinColor} />
          </g>
        ))}
      </svg>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 8, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function SubMomentActionCard({ row }: { row: SubMomentActionBreakdown }) {
  return (
    <Card className="bg-[#0c1420]/70 border border-border/60">
      <CardHeader
        title={row.subMoment}
        description={`${row.totalGoals.toLocaleString("pt-PT")} golos neste sub-momento`}
      />
      <CardContent>
        {row.actions.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-slate-900/40 px-3 py-4 text-xs text-muted-foreground">
            Sem ações registadas neste sub-momento.
          </div>
        ) : (
          <div className="space-y-3">
            {row.actions.map((entry) => {
              const width = Math.min(100, Math.max(0, entry.percent));
              return (
                <div
                  key={`${row.subMomentId}-${entry.action}`}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-3"
                >
                  <div className="text-xs leading-5 text-slate-100 break-words whitespace-normal">
                    {entry.action}
                  </div>
                  <div className="relative h-7 overflow-hidden rounded-md border border-slate-700/80 bg-slate-900/75">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{ width: `${width}%`, backgroundColor: ACTION_BAR_COLOR }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[11px] font-medium text-white">
                      <span>{entry.goals} golos</span>
                      <span>{formatPercent(entry.percent)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransitionRecoveryCard({ row }: { row: RecoverySpaceBreakdown }) {
  const variant = getRecoveryVariant(row.subMoment);
  if (!variant) return null;
  const tacticalZones = getRecoveryZones(variant);
  const zoneById = new Map(row.zones.map((zone) => [zone.zoneId, zone]));
  const maxZoneGoals = row.zones.reduce((max, zone) => Math.max(max, zone.goals), 0);
  const activeZones = row.zones
    .filter((zone) => zone.goals > 0)
    .sort((a, b) => (b.goals === a.goals ? a.zoneId - b.zoneId : b.goals - a.goals));
  const inertOverlay =
    variant === "defensive" ? (
      <rect x="60" y="10" width="52" height="60" fill="rgba(2,6,23,0.68)" />
    ) : (
      <rect x="8" y="10" width="52" height="60" fill="rgba(2,6,23,0.68)" />
    );

  return (
    <Card className="bg-[#0c1420]/70 border border-border/60">
      <CardHeader
        title={row.subMoment}
        description={`${row.totalGoals.toLocaleString("pt-PT")} golos com recuperação`}
      />
      <CardContent className="space-y-3">
        <div className={MAP_WRAPPER_CLASS}>
          <svg viewBox="0 0 120 80" className={MAP_SVG_CLASS} preserveAspectRatio="xMidYMid meet">
            <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />
            <rect
              x="8"
              y="10"
              width="104"
              height="60"
              rx="4"
              fill="rgba(6,24,40,0.72)"
              stroke="rgba(34,211,238,0.25)"
              strokeWidth="0.8"
            />
            <line
              x1="60"
              y1="10"
              x2="60"
              y2="70"
              stroke="rgba(226,232,240,0.35)"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
            <rect x="8" y="22" width="16" height="36" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
            <rect x="8" y="29" width="7" height="22" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
            <rect x="96" y="22" width="16" height="36" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
            <rect x="105" y="29" width="7" height="22" fill="none" stroke="rgba(226,232,240,0.4)" strokeWidth="0.8" />
            {inertOverlay}
            {tacticalZones.map((zone) => {
              const zoneStats = zoneById.get(zone.id);
              const goalsInZone = zoneStats?.goals ?? 0;
              const intensity = maxZoneGoals > 0 ? goalsInZone / maxZoneGoals : 0;
              const fillAlpha = goalsInZone > 0 ? 0.16 + intensity * 0.5 : 0.03;
              const fillColor = `rgba(34,211,238,${fillAlpha.toFixed(2)})`;
              const strokeColor =
                goalsInZone > 0 ? "rgba(34,211,238,0.95)" : "rgba(226,232,240,0.45)";
              return (
                <g key={`${row.subMomentId}-${zone.id}`}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.width}
                    height={zone.height}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={goalsInZone > 0 ? 1 : 0.7}
                  />
                  <text
                    x={zone.x + zone.width / 2}
                    y={zone.y + zone.height / 2 + 1.5}
                    textAnchor="middle"
                    className="fill-white text-[4px] font-semibold"
                  >
                    {zone.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {activeZones.length > 0 ? (
          <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-200 sm:grid-cols-2">
            {activeZones.map((zone) => (
              <div
                key={`${row.subMomentId}-legend-${zone.zoneId}`}
                className="rounded-md border border-border/60 bg-slate-900/50 px-2 py-1"
              >
                Zona {zone.zoneId}: {zone.goals} golos ({formatPercent(zone.percent)})
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-slate-900/40 px-3 py-3 text-xs text-muted-foreground">
            Sem registos em zonas de recuperação.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RadiographyPanel({
  teams,
  initialTeamId
}: {
  teams: TeamOption[];
  initialTeamId?: number;
}) {
  const [teamId, setTeamId] = useState<number | undefined>(() => {
    if (initialTeamId && teams.some((team) => team.id === initialTeamId)) {
      return initialTeamId;
    }
    return teams[0]?.id;
  });
  const [momentOptions, setMomentOptions] = useState<MomentOption[]>([]);
  const [momentId, setMomentId] = useState<number | undefined>(undefined);
  const [bpoCategory, setBpoCategory] = useState<BpoCategory | undefined>(undefined);
  const handleFilterChange = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      setMomentId(undefined);
      setBpoCategory(undefined);
      return;
    }
    if (normalized.startsWith("moment:")) {
      const parsed = Number(normalized.slice("moment:".length));
      setMomentId(Number.isNaN(parsed) ? undefined : parsed);
      setBpoCategory(undefined);
      return;
    }
    if (normalized.startsWith("bpo:")) {
      const technical = normalized.slice("bpo:".length) as BpoCategory;
      if (BPO_FILTER_OPTIONS.some((item) => item.value === technical)) {
        setBpoCategory(technical);
        setMomentId(undefined);
      } else {
        setMomentId(undefined);
        setBpoCategory(undefined);
      }
      return;
    }
    setMomentId(undefined);
    setBpoCategory(undefined);
  };
  const [radiography, setRadiography] = useState<RadiographyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teams.length) return;
    if (initialTeamId && teams.some((team) => team.id === initialTeamId)) {
      setTeamId(initialTeamId);
    } else if (!teamId) {
      setTeamId(teams[0].id);
    }
  }, [initialTeamId, teams, teamId]);

  useEffect(() => {
    let isCancelled = false;
    fetch("/api/lookups", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar momentos");
        return res.json();
      })
      .then((payload) => {
        if (!isCancelled) {
          setMomentOptions(payload?.moments ?? []);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setMomentOptions([]);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!teamId) return;
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setRadiography(null);

    const searchParams = new URLSearchParams();
    if (momentId) searchParams.set("momentId", String(momentId));
    if (bpoCategory) searchParams.set("bpoCategory", bpoCategory);
    const queryString = searchParams.toString();
    const endpoint = `/api/teams/${teamId}/radiography${queryString ? `?${queryString}` : ""}`;

    fetch(endpoint, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const message = json?.error ?? "Falha ao carregar a radiografia";
          throw new Error(message);
        }
        return res.json() as Promise<RadiographyResponse>;
      })
      .then((payload) => {
        if (!isCancelled) setRadiography(payload);
      })
      .catch((err) => {
        if (!isCancelled) setError(err.message ?? "Erro ao carregar dados");
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [teamId, momentId, bpoCategory]);

  const distribution = useMemo(
    () => cleanDataset(radiography?.distribution ?? [], "category", "goals"),
    [radiography?.distribution]
  );
  const currentTeam = teams.find((team) => team.id === teamId) ?? radiography?.team;
  const isSpecificFilterActive = Boolean(momentId || bpoCategory);
  const selectedMoment = momentId ? momentOptions.find((moment) => moment.id === momentId) : undefined;
  const selectedBpoFilter = bpoCategory ? BPO_FILTER_OPTIONS.find((option) => option.value === bpoCategory) : undefined;
  const isTransitionMomentFilter = Boolean(selectedMoment && isTransitionOffensiveMoment(selectedMoment.name));
  const selectedFilterLabel = selectedMoment?.name ?? selectedBpoFilter?.label ?? "Filtro";
  const momentGoalsValue = radiography?.momentGoals ?? 0;
  const teamGoalsValue = radiography?.teamGoals ?? 0;
  const goalShare = teamGoalsValue > 0 ? (momentGoalsValue / teamGoalsValue) * 100 : 0;
  const formattedGoalShare = `${goalShare.toFixed(1)}%`;
  const bestScorer = radiography?.topScorers[0];
  const bestAssist = radiography?.topAssists[0];
  const bestParticipation = radiography?.topParticipation[0];
  const assistZonePoints = useMemo(
    () => (radiography?.assistZones ?? []).filter((point) => typeof point.x === "number" && typeof point.y === "number"),
    [radiography?.assistZones]
  );
  const shotZonePoints = useMemo(
    () => (radiography?.shotZones ?? []).filter((point) => typeof point.x === "number" && typeof point.y === "number"),
    [radiography?.shotZones]
  );
  const goalEntryPoints = useMemo(
    () => (radiography?.finishZones ?? []).filter((point) => typeof point.x === "number" && typeof point.y === "number"),
    [radiography?.finishZones]
  );
  const subMomentActionBreakdown = useMemo(
    () =>
      (radiography?.subMomentActionBreakdown ?? []).map((entry) => ({
        ...entry,
        actions: entry.actions.map((actionEntry) => ({
          ...actionEntry,
          action: formatTechnicalLabel(actionEntry.action) || actionEntry.action
        }))
      })),
    [radiography?.subMomentActionBreakdown]
  );
  const transitionRecoveryBreakdown = useMemo(
    () =>
      (radiography?.recoverySpaces ?? []).filter((entry) => {
        return getRecoveryVariant(entry.subMoment) !== null;
      }),
    [radiography?.recoverySpaces]
  );

  if (!teams.length) {
    return <div className="text-sm text-muted-foreground">Sem equipas registadas.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-[#0b1220] p-5 shadow-lg">
        {currentTeam?.emblemPath && (
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border/60 bg-slate-900">
            <Image
              src={currentTeam.emblemPath || defaultImage}
              alt={currentTeam.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Momentos da Equipa</p>
          <h1 className="text-2xl font-semibold text-white">{currentTeam?.name ?? "Equipa"}</h1>
          <p className="text-xs text-muted-foreground">
            {currentTeam?.coach && `Treinador: ${currentTeam.coach}`}
            {currentTeam?.stadium && ` · Estádio: ${currentTeam.stadium}`}
            {currentTeam?.pitchDimensions && ` · Relvado: ${currentTeam.pitchDimensions}`}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Equipa
          </label>
          <Select value={teamId ?? ""} onChange={(e) => setTeamId(Number(e.target.value) || undefined)}>
            {teams.map((team) => (
              <option key={team.id} value={team.id} className="text-black">
                {team.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Momento
          </label>
          <Select
            value={momentId ? `moment:${momentId}` : bpoCategory ? `bpo:${bpoCategory}` : ""}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="" className="text-black">
              Todos os momentos
            </option>
            <optgroup label="Momentos Gerais">
              {momentOptions.map((moment) => (
                <option key={moment.id} value={`moment:${moment.id}`} className="text-black">
                  {moment.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Bolas Paradas Ofensivas">
              {BPO_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={`bpo:${option.value}`} className="text-black">
                  {option.label}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Carregando radiografia...</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
      </div>

      {radiography && (
        <div className="space-y-5">
          {isSpecificFilterActive ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <TopMetricCard
                title="Percentagem de Golos"
                value={formattedGoalShare}
                subtitle={`${momentGoalsValue.toLocaleString("pt-PT")} de ${teamGoalsValue.toLocaleString("pt-PT")} golos`}
              />
              <TopMetricCard
                title="Melhor Marcador"
                value={bestScorer?.name ?? "—"}
                subtitle={`${bestScorer?.goals ?? 0} golos`}
              />
              <TopMetricCard
                title="Mais Assistências"
                value={bestAssist?.name ?? "—"}
                subtitle={`${bestAssist?.assists ?? 0} assistências`}
              />
              <TopMetricCard
                title="Mais Participações"
                value={bestParticipation?.name ?? "—"}
                subtitle={`${bestParticipation?.involvement ?? 0} participações`}
              />
              <TopMetricCard
                title="Total de Golos"
                value={momentGoalsValue.toLocaleString("pt-PT")}
                subtitle={`Filtro: ${selectedFilterLabel}`}
              />
            </div>
          ) : (
            <div className="grid gap-4">
              <Card className="bg-[#0c1420]/70 border border-border/60">
                <CardHeader
                  title="Momentos de Jogo"
                  description="Organização, transição e bola parada"
                />
                <CardContent className="min-h-[300px]">
                  {distribution.length > 0 ? (
                    <SimplePie data={distribution} labelKey="category" valueKey="goals" />
                  ) : (
                    <EmptyGraphState />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {isSpecificFilterActive ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Mapa da Baliza" />
                  <CardContent className={MAP_CARD_CONTENT_CLASS}>
                    <GoalEntryMap points={goalEntryPoints} />
                  </CardContent>
                </Card>
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Mapa de remate" />
                  <CardContent className={MAP_CARD_CONTENT_CLASS}>
                    <FieldPinMap points={shotZonePoints} pinColor="#22c55e" />
                  </CardContent>
                </Card>
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Zonas de assistência" />
                  <CardContent className={MAP_CARD_CONTENT_CLASS}>
                    <FieldPinMap points={assistZonePoints} pinColor="#38bdf8" />
                  </CardContent>
                </Card>
              </div>
              {isTransitionMomentFilter ? (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Zonas de Recuperação
                  </div>
                  {transitionRecoveryBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {transitionRecoveryBreakdown.map((entry) => (
                        <TransitionRecoveryCard key={entry.subMomentId} row={entry} />
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-[#0c1420]/70 border border-border/60">
                      <CardHeader title="Zonas de Recuperação" />
                      <CardContent>
                        <div className="rounded-xl border border-border/60 bg-slate-900/40 px-3 py-4 text-sm text-muted-foreground">
                          Sem dados de recuperação para este filtro.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Ações por Sub-momento
                  </div>
                  {subMomentActionBreakdown.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {subMomentActionBreakdown.map((entry) => (
                        <SubMomentActionCard key={entry.subMomentId} row={entry} />
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-[#0c1420]/70 border border-border/60">
                      <CardHeader title="Ações por Sub-momento" />
                      <CardContent>
                        <div className="rounded-xl border border-border/60 bg-slate-900/40 px-3 py-4 text-sm text-muted-foreground">
                          Sem dados de ações para este filtro.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Mapa da Baliza" />
                  <CardContent className={MAP_CARD_CONTENT_CLASS}>
                    <GoalEntryMap points={goalEntryPoints} />
                  </CardContent>
                </Card>
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Mapa de remate" />
                  <CardContent className={MAP_CARD_CONTENT_CLASS}>
                    <FieldPinMap points={shotZonePoints} pinColor="#22c55e" />
                  </CardContent>
                </Card>
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Zonas de assistência" />
                  <CardContent className={MAP_CARD_CONTENT_CLASS}>
                    <FieldPinMap points={assistZonePoints} pinColor="#38bdf8" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Top Marcadores" />
                  <CardContent>
                    <TopPlayersCard
                      title=""
                      rows={radiography.topScorers}
                      valueKey="goals"
                      valueLabel="G"
                    />
                  </CardContent>
                </Card>
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Top Assistências" />
                  <CardContent>
                    <TopPlayersCard
                      title=""
                      rows={radiography.topAssists}
                      valueKey="assists"
                      valueLabel="A"
                    />
                  </CardContent>
                </Card>
                <Card className="bg-[#0c1420]/70 border border-border/60">
                  <CardHeader title="Top Participações" />
                  <CardContent>
                    <TopPlayersCard
                      title=""
                      rows={radiography.topParticipation}
                      valueKey="involvement"
                      valueLabel="Part."
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
