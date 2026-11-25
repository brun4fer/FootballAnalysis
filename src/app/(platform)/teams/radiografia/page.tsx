import RadiographyPanel from "./radiography-panel";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function positiveId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function RadiographyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <RadiographyPanel
      initialChampionshipId={positiveId(searchParams.competition)}
      initialTeamId={positiveId(searchParams.team)}
    />
  );
}

