import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader title="Capture Goal" description="Log a goal with contextual metadata" />
        <CardContent className="flex items-center justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Step-by-step wizard for team, scorer, moment, action and net zone.</p>
            <Badge>Real-time validation</Badge>
          </div>
          <Link href="/goals">
            <Button>Open Wizard</Button>
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Team Dashboards" description="Live analytics built from raw events" />
        <CardContent className="flex items-center justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Top scorers, involvements, moments, actions and goal zones.</p>
            <Badge>SSR + Charts</Badge>
          </div>
          <Link href="/teams">
            <Button variant="secondary">View Stats</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

