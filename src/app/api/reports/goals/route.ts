export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getGoalReports } from "@/server/reports";

const optionalNumber = z.preprocess(
  (value) => (value === null || value === "" || value === undefined ? undefined : Number(value)),
  z.number().int().nonnegative().optional()
);

const filtersSchema = z.object({
  seasonId: optionalNumber,
  championshipId: optionalNumber,
  teamId: optionalNumber,
  opponentTeamId: optionalNumber,
  momentId: optionalNumber,
  subMomentId: optionalNumber,
  actionId: optionalNumber,
  scorerId: optionalNumber,
  assistId: optionalNumber,
  involvedPlayerId: optionalNumber,
  minuteFrom: optionalNumber,
  minuteTo: optionalNumber,
  hasVideo: z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : undefined),
    z.boolean().optional()
  )
});

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    return NextResponse.json(await getGoalReports(filtersSchema.parse(params)));
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
