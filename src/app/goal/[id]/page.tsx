import { notFound } from "next/navigation";
import { getGoalById } from "@/server/goals";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

function Pitch({ x, y }: { x: number; y: number }) {
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

export default async function GoalDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return notFound();

  const goal = await getGoalById(id);
  if (!goal) return notFound();

  const hasGoalPoint = Boolean(goal.goalCoordinates);
  const hasFieldPoint = Boolean(goal.fieldDrawing);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stats">
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
          <CardHeader title="Vídeo" description={goal.videoUrl ? "Replay do lance" : "Sem vídeo disponível"} />
          <CardContent>
            {goal.videoUrl ? (
              <video controls className="w-full rounded-xl border border-border/60" src={goal.videoUrl} />
            ) : (
              <div className="text-sm text-muted-foreground">Sem URL de vídeo.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Dados do Lance" />
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Equipa</span>
              <span>{goal.teamName ?? goal.teamId}</span>
              <span className="text-muted-foreground">Adversário</span>
              <span>{goal.opponentName ?? goal.opponentTeamId ?? "-"}</span>
              <span className="text-muted-foreground">Marcador</span>
              <span>{goal.scorerName ?? goal.scorerId}</span>
              <span className="text-muted-foreground">Assistência</span>
              <span>{goal.assistName ?? goal.assistId ?? "—"}</span>
              <span className="text-muted-foreground">Minuto</span>
              <span>{goal.minute}'</span>
              <span className="text-muted-foreground">Momento</span>
              <span>{goal.momentName ?? goal.momentId}</span>
              <span className="text-muted-foreground">Sub-momento</span>
              <span>{goal.subMomentName ?? goal.subMomentId}</span>
              <span className="text-muted-foreground">Ação</span>
              <span>{goal.actionName ?? goal.actionId}</span>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ponto do Remate no Campo" />
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
    </div>
  );
}
