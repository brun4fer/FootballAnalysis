import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-[#0f1729] via-[#0a0f1a] to-[#0f1729] px-8 py-10 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Professional Analytics</p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
              Tactical intelligence for Liga Portugal 2, built on live event data.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Capture goals with structured context, manage rosters, and surface high-signal insights without precomputed stats.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-emerald-500/20 text-emerald-200">Dark Ops UI</Badge>
              <Badge className="bg-cyan-500/20 text-cyan-100">Live Aggregations</Badge>
              <Badge className="bg-white/10 text-white/80">PostgreSQL · Drizzle</Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/goals">
              <Button size="lg">Capture Goal</Button>
            </Link>
            <Link href="/teams">
              <Button variant="secondary" size="lg">
                Team Stats
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Goal Wizard" description="Stateful flow for consistent event capture" />
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Team → scorer → involvements → tactical context → goalkeeper zone with live validation.</p>
            <Link href="/goals">
              <Button size="sm" className="mt-2">
                Open Wizard
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Rosters" description="Manage Liga Portugal 2 teams and players" />
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Pre-seeded clubs, quick player entry, and ready-to-use stats pipelines.</p>
            <div className="flex gap-2">
              <Link href="/manage/teams">
                <Button variant="secondary" size="sm">
                  Teams
                </Button>
              </Link>
              <Link href="/manage/players">
                <Button variant="ghost" size="sm">
                  Players
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
