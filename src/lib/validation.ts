import { z } from "zod";

export const roleEnum = z.enum(["assist", "involvement"]);

export const goalInputSchema = z.object({
  matchId: z.number().int().positive().optional(),
  teamId: z.number().int().positive(),
  scorerId: z.number().int().positive(),
  minute: z.number().int().min(0).max(130),
  momentId: z.number().int().positive(),
  subMomentId: z.number().int().positive(),
  actionId: z.number().int().positive(),
  goalZoneId: z.number().int().positive(),
  notes: z.string().optional(),
  involvements: z
    .array(
      z.object({
        playerId: z.number().int().positive(),
        role: roleEnum
      })
    )
    .optional()
});

export const teamParamSchema = z.object({ teamId: z.coerce.number().int().positive() });

