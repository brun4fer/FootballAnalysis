export type TeamVenue = "home" | "away";

export type MatchContext = {
  teamId?: number | null;
  opponentTeamId?: number | null;
  teamName?: string | null;
  opponentName?: string | null;
  matchday?: number | null;
  matchDate?: string | null;
  teamVenue?: TeamVenue | null;
};

export function formatMatchDate(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function getFixtureLabel(context: MatchContext) {
  const team = context.teamName || "Team";
  const opponent = context.opponentName || "Opponent";
  return context.teamVenue === "away" ? `${opponent} vs ${team}` : `${team} vs ${opponent}`;
}

export function getMatchContextKey(context: MatchContext) {
  if (!context.teamId || !context.opponentTeamId || !context.matchday || !context.matchDate) return null;
  return [context.teamId, context.opponentTeamId, context.matchday, context.matchDate.slice(0, 10)].join(":");
}

export function getGoalHeading(goalNumber?: number | null, _legacyId?: number | null) {
  return goalNumber ? `Golo n.º ${goalNumber}` : "Golo";
}

export function getGoalContextLine(
  context: MatchContext & { goalNumber?: number | null; minute?: number | null },
  options: { includeGoal?: boolean } = {}
) {
  const parts: string[] = [];
  if (options.includeGoal && context.goalNumber) parts.push(`Golo n.º ${context.goalNumber}`);
  if (context.matchday) parts.push(`Jornada ${context.matchday}`);
  if (context.matchDate) parts.push(formatMatchDate(context.matchDate));
  if (context.teamName || context.opponentName) parts.push(getFixtureLabel(context));
  if (context.minute !== null && context.minute !== undefined) parts.push(`${context.minute}'`);
  return parts.join(" · ");
}
