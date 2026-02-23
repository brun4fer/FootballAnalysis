import { z } from "zod";

export const roleEnum = z.enum(["assist", "involvement"]);

export const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});

export const fieldDrawingSchema = pointSchema;

export const goalInputSchema = z.object({
  opponentTeamId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  scorerId: z.number().int().positive(),
  assistId: z.number().int().positive().optional().nullable(),
  minute: z.number().int().min(0).max(130),
  momentId: z.number().int().positive(),
  subMomentId: z.number().int().positive(),
  actionId: z.number().int().positive(),
  cornerTakerId: z.number().int().positive().optional().nullable(),
  freekickTakerId: z.number().int().positive().optional().nullable(),
  penaltyTakerId: z.number().int().positive().optional().nullable(),
  crossAuthorId: z.number().int().positive().optional().nullable(),
  goalCoordinates: pointSchema.optional(),
  videoPath: z.string().optional().or(z.literal("")).nullable(),
  fieldDrawing: fieldDrawingSchema.optional(),
  notes: z.string().optional().or(z.literal("")),
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
  emblemPath: z.string().optional().or(z.literal("")),
  radiographyPdfUrl: z.string().optional().or(z.literal("")),
  videoReportUrl: z.string().optional().or(z.literal("")),
  stadium: z.string().optional().or(z.literal("")),
  pitchDimensions: z.string().optional().or(z.literal("")),
  pitchRating: z.number().int().min(0).max(100).optional().nullable(),
  coach: z.string().optional().or(z.literal("")),
  president: z.string().optional().or(z.literal(""))
});

export const playerUpsertSchema = z.object({
  teamId: z.number().int().positive(),
  name: z.string().min(2),
  photoPath: z.string().optional().or(z.literal("")),
  primaryPosition: z.string().min(2),
  secondaryPosition: z.string().optional().or(z.literal("")),
  tertiaryPosition: z.string().optional().or(z.literal("")),
  dominantFoot: z.string().optional().or(z.literal("")),
  heightCm: z.number().int().min(120).max(220).optional().nullable(),
  weightKg: z.number().int().min(40).max(120).optional().nullable()
});

export const seasonUpsertSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional().or(z.literal(""))
});

export const championshipUpsertSchema = z.object({
  name: z.string().min(2),
  country: z.string().min(2),
  seasonId: z.number().int().positive(),
  logo: z.string().url().optional().or(z.literal(""))
});
