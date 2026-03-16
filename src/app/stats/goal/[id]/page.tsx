import { notFound } from "next/navigation";

import { getGoalById } from "@/server/goals";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { ArrowLeft } from "lucide-react";

import Image from "next/image";
import { GoalDeleteButton } from "./goal-delete-button";



export const dynamic = "force-dynamic";



function GoalNet({ x, y }: { x: number; y: number }) {

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



function Pitch({ x, y, pinColor = "#22c55e" }: { x: number; y: number; pinColor?: string }) {

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

        <circle r="1" fill={pinColor} />

      </g>

    </svg>

  );

}

const normalizeToken = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default async function GoalDetail({ params }: { params: { id: string } }) {

  const id = Number(params.id);

  if (Number.isNaN(id)) return notFound();



  const goal = await getGoalById(id);

  if (!goal) return notFound();



  const hasGoalPoint = Boolean(goal.goalCoordinates);

  const hasFieldPoint = Boolean(goal.fieldDrawing);
  const assistDrawing =
    goal.assistDrawing && typeof goal.assistDrawing.x === "number" && typeof goal.assistDrawing.y === "number"
      ? goal.assistDrawing
      : goal.assistCoordinates && typeof goal.assistCoordinates.x === "number" && typeof goal.assistCoordinates.y === "number"
        ? { x: goal.assistCoordinates.x, y: goal.assistCoordinates.y }
        : null;
  const hasAssistDrawing = Boolean(assistDrawing);
  const transitionDrawing =
    goal.transitionDrawing && typeof goal.transitionDrawing.x === "number" && typeof goal.transitionDrawing.y === "number"
      ? goal.transitionDrawing
      : null;
  const isTransitionGoal = normalizeToken(goal.momentName).includes("transicao ofensiva");
  const hasTransitionDrawing = Boolean(transitionDrawing);

  const involvements = goal.involvements ?? [];
  const throwInTakerDisplay = goal.throwInTakerName ?? (goal.throwInTakerId ? `#${goal.throwInTakerId}` : null);
  const referencePlayerName = goal.referencePlayerName ?? null;
  const foulVictimName = goal.foulVictimName ?? goal.foulSufferedByName ?? null;
  const previousMomentDescription = goal.previousMomentDescription ?? null;
  const subMomentSequenceLines =
    goal.subMomentSequence && goal.subMomentSequence.length > 0
      ? [...goal.subMomentSequence]
          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
          .map((entry) => `${entry.subMomentName ?? `#${entry.subMomentId}`} - ${entry.actionName ?? `#${entry.actionId}`}`)
      : [];



  return (

    <div className="space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/teams">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
        <div>

          <h1 className="text-2xl font-semibold">Golo #{id}</h1>

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

              <div className="text-sm text-muted-foreground">Sem URL de vídeo.</div>

            )}

            {involvements.length > 0 && (

              <div className="mt-4 space-y-2">

                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Jogadores envolventes</div>

                <div className="space-y-2">

                  {involvements.map((inv) => (

                    <div key={`${inv.playerId}-${inv.role}`} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">

                      {inv.photoPath ? (

                        <Image src={inv.photoPath} alt={inv.playerName ?? String(inv.playerId)} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />

                      ) : (

                        <div className="h-7 w-7 rounded-full bg-slate-700" />

                      )}

                      <div className="flex-1">

                        <div className="text-sm font-semibold">{inv.playerName ?? inv.playerId}</div>

                        <div className="text-xs text-muted-foreground">{inv.role === "assist" ? "Assistência" : "Envolvimento"}</div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </CardContent>

        </Card>

        <Card>

          <CardHeader title="Dados do Lance" />

          <CardContent className="space-y-3 text-sm">

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {goal.teamCoach && <span>Treinador: {goal.teamCoach}</span>}
              {goal.teamStadium && <span>Estádio: {goal.teamStadium}</span>}
              {goal.teamPitchDimensions && <span>Relvado: {goal.teamPitchDimensions}</span>}
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ações registadas</span>
              <div className="flex flex-wrap gap-2">
                {goal.actions && goal.actions.length > 0 ? (
                  goal.actions.map((action) => (
                    <Badge key={`goal-action-${action.actionId}`} className="bg-emerald-500/10 text-emerald-100">
                      {action.actionName ?? `#${action.actionId}`}
                    </Badge>
                  ))
                ) : goal.actionName ? (
                  <Badge className="bg-emerald-500/10 text-emerald-100">{goal.actionName}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem ações registadas.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">

              <span className="text-muted-foreground">Equipa</span>

              <span>{goal.teamName ?? goal.teamId}</span>

              <span className="text-muted-foreground">Adversário</span>

              <span>{goal.opponentName ?? goal.opponentTeamId ?? "-"}</span>

              <span className="text-muted-foreground">Marcador</span>

              <span>{goal.scorerName ?? goal.scorerId}</span>

              <span className="text-muted-foreground">Assistência</span>

              <span>{goal.assistName ?? goal.assistId ?? "-"}</span>

              <span className="text-muted-foreground">Ponto da assistencia</span>

              <span>{assistDrawing ? `(${assistDrawing.x.toFixed(2)}, ${assistDrawing.y.toFixed(2)})` : "-"}</span>

              {isTransitionGoal && (
                <>
                  <span className="text-muted-foreground">Ponto de recuperacao</span>
                  <span>{transitionDrawing ? `(${transitionDrawing.x.toFixed(2)}, ${transitionDrawing.y.toFixed(2)})` : "-"}</span>
                </>
              )}

              {throwInTakerDisplay && (
                <div className="col-span-2 grid grid-cols-2">
                  <span className="text-muted-foreground">Marcador do lançamento</span>
                  <span className="text-right font-medium">{throwInTakerDisplay}</span>
                </div>
              )}
              {referencePlayerName && (
                <div className="col-span-2 grid grid-cols-2">
                  <span className="text-muted-foreground">Jogador Referência</span>
                  <span className="text-right font-medium">{referencePlayerName}</span>
                </div>
              )}
              {foulVictimName && (
                <div className="col-span-2 grid grid-cols-2">
                  <span className="text-muted-foreground">Falta sobre</span>
                  <span className="text-right font-medium">{foulVictimName}</span>
                </div>
              )}
              {previousMomentDescription && (
                <div className="col-span-2 mt-2 border-t pt-2">
                  <span className="text-muted-foreground mb-1 block text-xs uppercase">Momento Anterior</span>
                  <p className="text-sm italic text-white/90">&apos;{previousMomentDescription}&apos;</p>
                </div>
              )}

              <span className="text-muted-foreground">Minuto</span>

              <span>
                {goal.minute}
                &apos;
              </span>

              <span className="text-muted-foreground">Momento</span>

              <span>{goal.momentName ?? goal.momentId}</span>

              <span className="text-muted-foreground">Sub-momentos</span>

              <span>
                {subMomentSequenceLines.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {subMomentSequenceLines.map((line) => (
                      <span key={line} className="text-xs text-white/90">
                        {line}
                      </span>
                    ))}
                  </div>
                ) : (
                  goal.subMomentName ?? goal.subMomentId
                )}
              </span>


              {goal.cornerTakerId && (

                <>

                  <span className="text-muted-foreground">Marcador do canto</span>

                  <span>{goal.cornerTakerName ?? goal.cornerTakerId}</span>

                </>

              )}

              {goal.freekickTakerId && (

                <>

                  <span className="text-muted-foreground">Marcador da falta</span>

                  <span>{goal.freekickTakerName ?? goal.freekickTakerId}</span>

                </>

              )}

              {goal.penaltyTakerId && (

                <>

                  <span className="text-muted-foreground">Marcador do penálti</span>

                  <span>{goal.penaltyTakerName ?? goal.penaltyTakerId}</span>

                </>

              )}

              {goal.crossAuthorId && (

                <>

                  <span className="text-muted-foreground">Autor do cruzamento</span>

                  <span>{goal.crossAuthorName ?? goal.crossAuthorId}</span>

                </>

              )}

            </div>

          </CardContent>

        </Card>

      </div>



      <div className={`grid gap-4 ${isTransitionGoal ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>

        <Card>

          <CardHeader title="Ponto da Assistencia no Campo" />

          <CardContent>

            {hasAssistDrawing && assistDrawing ? (
              <Pitch x={assistDrawing.x} y={assistDrawing.y} pinColor="#38bdf8" />
            ) : (
              <div className="text-sm text-muted-foreground">Sem coordenadas de assistencia.</div>
            )}

          </CardContent>

        </Card>

        {isTransitionGoal && (
          <Card>
            <CardHeader title="Ponto de Recuperacao" />
            <CardContent>
              {hasTransitionDrawing && transitionDrawing ? (
                <Pitch x={transitionDrawing.x} y={transitionDrawing.y} pinColor="#eab308" />
              ) : (
                <div className="text-sm text-muted-foreground">Sem coordenadas de recuperacao.</div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>

          <CardHeader title="Zona de Remate" />

          <CardContent>

            {hasFieldPoint && goal.fieldDrawing ? (

              <Pitch x={goal.fieldDrawing.x} y={goal.fieldDrawing.y} />

            ) : (

              <div className="text-sm text-muted-foreground">Sem coordenadas de campo.</div>

            )}

          </CardContent>

        </Card>

        <Card>

          <CardHeader title="Ponto de Entrada na Baliza" />

          <CardContent>

            {hasGoalPoint && goal.goalCoordinates ? (

              <GoalNet x={goal.goalCoordinates.x} y={goal.goalCoordinates.y} />

            ) : (

              <div className="text-sm text-muted-foreground">Sem coordenadas de baliza.</div>

            )}

          </CardContent>

        </Card>

      </div>
      <div className="flex justify-end">
        <GoalDeleteButton goalId={id} />
      </div>

    </div>

  );

}




