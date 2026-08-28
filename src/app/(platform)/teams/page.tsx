import { listTeams } from "@/server/catalog";
import { TeamDashboard } from "./team-dashboard";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teams = await listTeams();
  return <TeamDashboard initialTeams={teams} />;
}

