import { notFound } from "next/navigation";
import { displayFootballTerm } from "@/lib/presentation";

import { getGoalById } from "@/server/goals";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { ArrowLeft } from "lucide-react";

import { GoalDeleteButton } from "./goal-delete-button";
import { PlayerPhoto } from "@/components/player-photo";
import { formatMatchDate, getFixtureLabel, getGoalContextLine, getGoalHeading } from "@/lib/match-context";



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



function Pitch({
  x,
  y,
  attackDirection = "left_to_right",
  pinColor = "#22c55e"
}: {
  x: number;
  y: number;
  attackDirection?: "left_to_right" | "right_to_left";
  pinColor?: string;
}) {

  return (

    <svg viewBox="0 0 105 68" className="w-full rounded-xl border border-border/60 bg-slate-900/60 p-2">

      <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />

      <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />

      <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />

      <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />

      <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />

      <line
        x1={attackDirection === "left_to_right" ? 39 : 66}
        y1="6"
        x2={attackDirection === "left_to_right" ? 64 : 41}
        y2="6"
        stroke="#94a3b8"
        strokeWidth="0.8"
      />

      <path d={attackDirection === "left_to_right" ? "M64 3.8L69 6L64 8.2Z" : "M41 3.8L36 6L41 8.2Z"} fill="#94a3b8" />

      <text x="52.5" y="4" textAnchor="middle" fill="#94a3b8" fontSize="2.8">Sentido do ataque</text>

      <g transform={`translate(${x * 105}, ${y * 68})`}>

        <circle r="4" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />

        <circle r="2.1" fill="#0f172a" />

        <circle r="1" fill={pinColor} />

      </g>

    </svg>

  );

}

type PitchPoint = { x: number; y: number };

function AssistToShotPitch({
  assist,
  shot,
  attackDirection = "left_to_right"
}: {
  assist: PitchPoint | null;
  shot: PitchPoint | null;
  attackDirection?: "left_to_right" | "right_to_left";
}) {
  const assistX = assist ? assist.x * 105 : 0;
  const assistY = assist ? assist.y * 68 : 0;
  const shotX = shot ? shot.x * 105 : 0;
  const shotY = shot ? shot.y * 68 : 0;

  return (
    <div className="space-y-3">
      <svg
        viewBox="0 0 105 68"
        className="w-full rounded-xl border border-border/60 bg-slate-900/60 p-2"
        role="img"
        aria-label="Trajetoria entre a zona da assistencia e a zona do remate"
      >
        <defs>
          <marker id="assist-shot-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0L6 3L0 6Z" fill="#f8fafc" />
          </marker>
          <marker id="attack-direction-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0L6 3L0 6Z" fill="#94a3b8" />
          </marker>
        </defs>
        <rect x="1" y="1" width="103" height="66" rx="8" fill="#0b172a" stroke="#1e293b" strokeWidth="1.2" />
        <line x1="52.5" y1="1" x2="52.5" y2="67" stroke="rgba(148,163,184,0.35)" strokeDasharray="3 3" />
        <circle cx="52.5" cy="34" r="9.15" stroke="rgba(148,163,184,0.35)" fill="none" />
        <rect x="1" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />
        <rect x="90" y="20" width="14" height="28" stroke="rgba(148,163,184,0.35)" fill="none" />

        <line
          x1={attackDirection === "left_to_right" ? 39 : 66}
          y1="6"
          x2={attackDirection === "left_to_right" ? 66 : 39}
          y2="6"
          stroke="#94a3b8"
          strokeWidth="0.8"
          markerEnd="url(#attack-direction-arrow)"
        />
        <text x="52.5" y="4" textAnchor="middle" fill="#94a3b8" fontSize="2.8">
          Sentido do ataque
        </text>

        {assist && shot && (
          <line
            x1={assistX}
            y1={assistY}
            x2={shotX}
            y2={shotY}
            stroke="#f8fafc"
            strokeWidth="1.25"
            strokeDasharray="3 2"
            markerEnd="url(#assist-shot-arrow)"
          />
        )}
        {assist && (
          <g transform={`translate(${assistX}, ${assistY})`}>
            <circle r="4" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />
            <circle r="2.15" fill="#38bdf8" />
            <text x="5" y="-3" fill="#e0f2fe" fontSize="3.2" fontWeight="600">
              Assistencia
            </text>
          </g>
        )}
        {shot && (
          <g transform={`translate(${shotX}, ${shotY})`}>
            <circle r="4" fill="#f5f5f5" stroke="#0f172a" strokeWidth="0.6" />
            <circle r="2.15" fill="#22c55e" />
            <text x="5" y="5" fill="#dcfce7" fontSize="3.2" fontWeight="600">
              Remate
            </text>
          </g>
        )}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Assistencia</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Remate</span>
      </div>
    </div>
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
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>

          <h1 className="text-2xl font-semibold">{getGoalHeading(goal.goalNumber, id)}</h1>

          <p className="text-sm text-muted-foreground">
            {getGoalContextLine(goal) || "Detailed view with video and locations."}
          </p>

        </div>

      </div>
      <div className="grid gap-4 lg:grid-cols-2">

        <Card>

          <CardHeader title="Video" description={goal.videoPlaybackUrl || goal.videoPath ? "Replay de the move" : "No video available"} />

          <CardContent>

            {goal.videoPlaybackUrl || goal.videoPath ? (

              <video controls className="w-full rounded-xl border border-border/60" src={goal.videoPlaybackUrl || goal.videoPath || undefined} />

            ) : (

              <div className="text-sm text-muted-foreground">No video URL.</div>

            )}

            {involvements.length > 0 && (

              <div className="mt-4 space-y-2">

                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Players envolventes</div>

                <div className="space-y-2">

                  {involvements.map((inv) => (

                    <div key={`${inv.playerId}-${inv.role}`} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">

                      <PlayerPhoto src={inv.photoPath} name={inv.playerName ?? String(inv.playerId)} className="h-7 w-7" />

                      <div className="flex-1">

                        <div className="text-sm font-semibold">{inv.playerName ?? inv.playerId}</div>

                        <div className="text-xs text-muted-foreground">{inv.role === "assist" ? "Assist" : "Involvement"}</div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </CardContent>

        </Card>

        <Card>

          <CardHeader title="Move Details" />

          <CardContent className="space-y-3 text-sm">

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {goal.teamCoach && <span>Treinador: {goal.teamCoach}</span>}
              {goal.teamStadium && <span>Stadium: {goal.teamStadium}</span>}
              {goal.teamPitchDimensions && <span>Relvado: {goal.teamPitchDimensions}</span>}
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recorded Actions</span>
              <div className="flex flex-wrap gap-2">
                {goal.actions && goal.actions.length > 0 ? (
                  goal.actions.map((action) => (
                    <Badge key={`goal-action-${action.actionId}`} className="bg-emerald-500/10 text-emerald-100">
                      {displayFootballTerm(action.actionName) || `#${action.actionId}`}
                    </Badge>
                  ))
                ) : goal.actionName ? (
                  <Badge className="bg-emerald-500/10 text-emerald-100">{displayFootballTerm(goal.actionName)}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No actions recorded.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">

              <span className="text-muted-foreground">Team</span>

              <span>{goal.teamName ?? goal.teamId}</span>

              <span className="text-muted-foreground">Opponent</span>

              <span>{goal.opponentName ?? goal.opponentTeamId ?? "-"}</span>

              <span className="text-muted-foreground">Fixture</span>
              <span>{getFixtureLabel(goal)}</span>

              <span className="text-muted-foreground">Matchday</span>
              <span>{goal.matchday ?? "-"}</span>

              <span className="text-muted-foreground">Match date</span>
              <span>{formatMatchDate(goal.matchDate) || "-"}</span>

              <span className="text-muted-foreground">Analysed team venue</span>
              <span>{goal.teamVenue === "home" ? "Home" : goal.teamVenue === "away" ? "Away" : "-"}</span>

              <span className="text-muted-foreground">Scorer</span>

              <span>{goal.scorerName ?? goal.scorerId}</span>

              <span className="text-muted-foreground">Assist</span>

              <span>{goal.assistName ?? goal.assistId ?? "-"}</span>

              <span className="text-muted-foreground">Assist Location</span>

              <span>{assistDrawing ? `(${assistDrawing.x.toFixed(2)}, ${assistDrawing.y.toFixed(2)})` : "-"}</span>

              {isTransitionGoal && (
                <>
                  <span className="text-muted-foreground">Recovery Point</span>
                  <span>{transitionDrawing ? `(${transitionDrawing.x.toFixed(2)}, ${transitionDrawing.y.toFixed(2)})` : "-"}</span>
                </>
              )}

              {throwInTakerDisplay && (
                <div className="col-span-2 grid grid-cols-2">
                  <span className="text-muted-foreground">Throw-in Taker</span>
                  <span className="text-right font-medium">{throwInTakerDisplay}</span>
                </div>
              )}
              {referencePlayerName && (
                <div className="col-span-2 grid grid-cols-2">
                  <span className="text-muted-foreground">Reference Player</span>
                  <span className="text-right font-medium">{referencePlayerName}</span>
                </div>
              )}
              {foulVictimName && (
                <div className="col-span-2 grid grid-cols-2">
                  <span className="text-muted-foreground">Player Fouled</span>
                  <span className="text-right font-medium">{foulVictimName}</span>
                </div>
              )}
              {previousMomentDescription && (
                <div className="col-span-2 mt-2 border-t pt-2">
                  <span className="text-muted-foreground mb-1 block text-xs uppercase">Phase Previous</span>
                  <p className="text-sm italic text-white/90">&apos;{previousMomentDescription}&apos;</p>
                </div>
              )}

              <span className="text-muted-foreground">Minuto</span>

              <span>
                {goal.minute}
                &apos;
              </span>

              <span className="text-muted-foreground">Sentido do ataque</span>

              <span>{goal.attackDirection === "right_to_left" ? "Direita → esquerda" : "Esquerda → direita"}</span>

              <span className="text-muted-foreground">Phase</span>

              <span>{displayFootballTerm(goal.momentName) || goal.momentId}</span>

              <span className="text-muted-foreground">Sub-phases</span>

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
                  displayFootballTerm(goal.subMomentName) || goal.subMomentId
                )}
              </span>


              {goal.cornerTakerId && (

                <>

                  <span className="text-muted-foreground">Corner Taker</span>

                  <span>{goal.cornerTakerName ?? goal.cornerTakerId}</span>

                </>

              )}

              {goal.freekickTakerId && (

                <>

                  <span className="text-muted-foreground">Free-kick Taker</span>

                  <span>{goal.freekickTakerName ?? goal.freekickTakerId}</span>

                </>

              )}

              {goal.penaltyTakerId && (

                <>

                  <span className="text-muted-foreground">Penalty Taker</span>

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



      <div className={`grid gap-4 ${isTransitionGoal ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>

        <Card>

          <CardHeader title="Trajetoria da Assistencia ao Remate" />

          <CardContent>

            {hasAssistDrawing || hasFieldPoint ? (
              <AssistToShotPitch assist={assistDrawing} shot={goal.fieldDrawing ?? null} attackDirection={goal.attackDirection} />
            ) : (
              <div className="text-sm text-muted-foreground">Sem coordenadas de assistencia ou remate.</div>
            )}

          </CardContent>

        </Card>

        {isTransitionGoal && (
          <Card>
            <CardHeader title="Recovery Point" />
            <CardContent>
              {hasTransitionDrawing && transitionDrawing ? (
                <Pitch x={transitionDrawing.x} y={transitionDrawing.y} attackDirection={goal.attackDirection} pinColor="#eab308" />
              ) : (
                <div className="text-sm text-muted-foreground">No recovery coordinates.</div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>

          <CardHeader title="Ponto de Entrada na Goal" />

          <CardContent>

            {hasGoalPoint && goal.goalCoordinates ? (

              <GoalNet x={goal.goalCoordinates.x} y={goal.goalCoordinates.y} />

            ) : (

              <div className="text-sm text-muted-foreground">No goal coordinates.</div>

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




