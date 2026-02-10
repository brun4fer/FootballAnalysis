import { GoalWizard } from "./goal-wizard";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Registar Golo</h1>
        <p className="text-sm text-muted-foreground">Fluxo guiado com seleção de zona da baliza e desenho tático em SVG.</p>
      </div>
      <GoalWizard />
    </div>
  );
}

