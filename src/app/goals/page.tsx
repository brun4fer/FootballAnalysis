import { GoalWizard } from "./goal-wizard";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Capture Goal</h1>
        <p className="text-sm text-muted-foreground">Structured event entry with validation and contextual steps.</p>
      </div>
      <GoalWizard />
    </div>
  );
}

