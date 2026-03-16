"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Coordinate = { x: number; y: number };
type GoalActionDto = { actionId: number; actionName?: string | null };
type GoalSubMomentSequenceDto = {
  subMomentId: number;
  subMomentName?: string | null;
  actionId: number;
  actionName?: string | null;
  sequenceOrder: number;
};

type GoalDetailProps = {
  goal: {
    id: number;
    opponentTeamId?: number | null;
    teamId: number;
    scorerId: number;
    assistId?: number | null;
    minute: number;
    momentName?: string | null;
    subMomentName?: string | null;
    actionName?: string | null;
    actions?: GoalActionDto[];
    subMomentSequence?: GoalSubMomentSequenceDto[];
    videoPath?: string | null;
    fieldDrawing?: Coordinate | null;
    goalCoordinates?: Coordinate | null;
    assistCoordinates?: { x?: number; y?: number; label?: string } | null;
    cornerProfile?: "fechado" | "aberto" | "combinado" | null;
    freekickProfile?: "fechado" | "aberto" | "combinado" | null;
    throwInProfile?: "area" | "organizacao" | null;
    goalkeeperOutlet?: "organizacao" | "curto_para_longo" | "bola_longa" | null;
    notes?: string | null;
    scorerName?: string | null;
    opponentName?: string | null;
    teamName?: string | null;
    assistName?: string | null;
    cornerTakerName?: string | null;
    freekickTakerName?: string | null;
    penaltyTakerName?: string | null;
    crossAuthorName?: string | null;
  };
};

const goalProfiles = {
  aberto: "Aberto",
  fechado: "Fechado",
  combinado: "Combinado"
} as const;

const throwInProfiles = {
  area: "Área",
  organizacao: "Organização"
} as const;

const goalkeeperOutlets = {
  organizacao: "Em Organização",
  curto_para_longo: "Curto para longo",
  bola_longa: "Bola longa"
} as const;

function formatProfile(value?: string | null) {
  if (!value) return "—";
  return goalProfiles[value as keyof typeof goalProfiles] ?? value;
}

function formatThrowIn(value?: string | null) {
  if (!value) return "—";
  return throwInProfiles[value as keyof typeof throwInProfiles] ?? value;
}

function formatOutlet(value?: string | null) {
  if (!value) return "—";
  return goalkeeperOutlets[value as keyof typeof goalkeeperOutlets] ?? value;
}

function GoalNet({ x, y }: Coordinate) {
  return (
    <svg viewBox="0 0 120 80" className="w-full rounded-xl border border-border/60 bg-slate-900/60 p-2">
      <rect x="4" y="6" width="112" height="68" rx="6" fill="#0b1220" stroke="#1f2937" strokeWidth="1.4" />
      <rect x="8" y="10" width="104" height="60" rx="5" fill="url(#netPattern)" stroke="#0ea5e9" strokeWidth="0.6" strokeDasharray="4 3" />
      <path d="M8 22h104M8 36h104M8 50h104M8 64h104" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />
      <path d="M26 10v60M46 10v60M66 10v60M86 10v60" stroke="rgba(226,232,240,0.18)" strokeWidth="0.6" />
      <g transform={`translate(${x * 120}, ${y * 80})`}>
        <circle r="5" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />
        <circle r="2.4" fill="#0f172a" />
        <circle r="1.2" fill="#f97316" />
      </g>
      <defs>
        <pattern id="netPattern" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0h6M0 0v6" stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />
        </pattern>
      </defs>
    </svg>
  );
}

function Pitch({ x, y }: Coordinate) {
  return (
    <svg viewBox="0 0 105 68" className="w-full rounded-xl border border-border/60 bg-slate-900/60 p-2">
      <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />
      <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
      <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />
      <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />
      <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />
      <g transform={`translate(${x * 105}, ${y * 68})`}>
        <circle r="4" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />
        <circle r="2.1" fill="#0f172a" />
        <circle r="1" fill="#22c55e" />
      </g>
    </svg>
  );
}

export default function GoalDetailContent({ goal }: GoalDetailProps) {
  const [goalPoint, setGoalPoint] = useState<Coordinate | null>(null);
  const [fieldPoint, setFieldPoint] = useState<Coordinate | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setGoalPoint(goal.goalCoordinates ?? null);
    setFieldPoint(goal.fieldDrawing ?? null);
    setHydrated(true);
  }, [goal.goalCoordinates, goal.fieldDrawing]);

  const actionLabels = useMemo(() => {
    const listed = goal.actions?.map((a) => a.actionName || `#${a.actionId}`) ?? [];
    if (listed.length === 0 && goal.actionName) return [goal.actionName];
    return listed;
  }, [goal.actionName, goal.actions]);

  const subMomentSequenceLabels = useMemo(() => {
    const ordered = [...(goal.subMomentSequence ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    return ordered.map((entry) => {
      const subMomentLabel = entry.subMomentName ?? `#${entry.subMomentId}`;
      const actionLabel = entry.actionName ?? `#${entry.actionId}`;
      return {
        key: `${entry.sequenceOrder}-${entry.subMomentId}-${entry.actionId}`,
        label: `${subMomentLabel} - ${actionLabel}`
      };
    });
  }, [goal.subMomentSequence]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stats">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Golo #{goal.id}</h1>
          <p className="text-sm text-muted-foreground">Visualização detalhada com vídeo e pinpoints.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Vídeo" description={goal.videoPath ? "Replay do lance" : "Sem vídeo disponível"} />
          <CardContent>
            {goal.videoPath ? (
              <video controls className="w-full rounded-xl border border-border/60" src={goal.videoPath} />
            ) : (
              <div className="text-sm text-muted-foreground">Sem vídeo disponível.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Dados do lance" />
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Equipa</span>
              <span>{goal.teamName ?? goal.teamId}</span>
              <span className="text-muted-foreground">Adversário</span>
              <span>{goal.opponentName ?? goal.opponentTeamId ?? "—"}</span>
              <span className="text-muted-foreground">Marcador</span>
              <span>{goal.scorerName ?? goal.scorerId}</span>
              <span className="text-muted-foreground">Assistência</span>
              <span>{goal.assistName ?? goal.assistId ?? "—"}</span>
              <span className="text-muted-foreground">Minuto</span>
              <span>
                {goal.minute}
                &apos;
              </span>
              <span className="text-muted-foreground">Momento</span>
              <span>{goal.momentName ?? "—"}</span>
              <span className="text-muted-foreground">Sub-momentos</span>
              <span>
                {subMomentSequenceLabels.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {subMomentSequenceLabels.map((entry) => (
                      <span key={entry.key} className="text-xs text-white/90">
                        {entry.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  goal.subMomentName ?? "-"
                )}
              </span>
              <span className="text-muted-foreground">Ações registadas</span>
              <span className="col-span-1">
                {actionLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {actionLabels.map((label) => (
                      <Badge key={label} className="bg-white/5 text-xs text-white">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Sem ações registadas.</span>
                )}
              </span>
              {goal.cornerTakerName && (
                <>
                  <span className="text-muted-foreground">Marcador do canto</span>
                  <span>{goal.cornerTakerName}</span>
                </>
              )}
              {goal.freekickTakerName && (
                <>
                  <span className="text-muted-foreground">Marcador da falta</span>
                  <span>{goal.freekickTakerName}</span>
                </>
              )}
              {goal.penaltyTakerName && (
                <>
                  <span className="text-muted-foreground">Marcador do penálti</span>
                  <span>{goal.penaltyTakerName}</span>
                </>
              )}
              {goal.crossAuthorName && (
                <>
                  <span className="text-muted-foreground">Autor do cruzamento</span>
                  <span>{goal.crossAuthorName}</span>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Saída do GR</span>
              <span>{formatOutlet(goal.goalkeeperOutlet)}</span>
              <span className="text-muted-foreground">Perfil de canto</span>
              <span>{formatProfile(goal.cornerProfile)}</span>
              <span className="text-muted-foreground">Perfil de livre</span>
              <span>{formatProfile(goal.freekickProfile)}</span>
              <span className="text-muted-foreground">Perfil de lançamento</span>
              <span>{formatThrowIn(goal.throwInProfile)}</span>
            </div>
            {goal.notes && (
              <div>
                <span className="text-muted-foreground">Notas</span>
                <p className="text-sm text-white/90">{goal.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ponto de entrada na baliza" />
          <CardContent>
            {hydrated ? (
              goalPoint ? (
                <GoalNet x={goalPoint.x} y={goalPoint.y} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem coordenadas de baliza.</div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Carregando coordenadas...</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Zona de Remate" />
          <CardContent>
            {hydrated ? (
              fieldPoint ? (
                <Pitch x={fieldPoint.x} y={fieldPoint.y} />
              ) : (
                <div className="text-sm text-muted-foreground">Sem coordenadas de campo.</div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Carregando coordenadas...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

