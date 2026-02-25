import { listTeams } from "@/server/catalog";
import RadiographyPanel from "./radiography-panel";

export const dynamic = "force-dynamic";

export default async function RadiographyPage() {
  const teams = await listTeams();
  return <RadiographyPanel teams={teams} />;
}
