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

export const teamUpsertSchema = z.object({
  name: z.string().min(2),
  championshipId: z.number().int().positive(),
  emblem: z.string().url().optional().or(z.literal("")),
  stadium: z.string().optional().or(z.literal("")),
  pitchDimensions: z.string().optional().or(z.literal("")),
  pitchRating: z.number().int().min(0).max(100).optional().nullable(),
  coach: z.string().optional().or(z.literal("")),
  president: z.string().optional().or(z.literal(""))
});

export const playerUpsertSchema = z.object({
  teamId: z.number().int().positive(),
  name: z.string().min(2),
  primaryPosition: z.string().min(2),
  secondaryPosition: z.string().optional().or(z.literal("")),
  tertiaryPosition: z.string().optional().or(z.literal("")),
  dominantFoot: z.string().optional().or(z.literal("")),
  heightCm: z.number().int().min(120).max(220).optional().nullable(),
  weightKg: z.number().int().min(40).max(120).optional().nullable(),
  description: z.string().optional().or(z.literal(""))
});
