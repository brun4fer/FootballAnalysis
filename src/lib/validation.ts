import { z } from "zod";

export const roleEnum = z.enum(["assist", "involvement"]);

export const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});

export const zoneMarkerSchema = z
  .object({
    x: z.number().min(0).max(1).optional(),
    y: z.number().min(0).max(1).optional(),
    label: z.string().optional(),
    sector: z.string().optional()
  })
  .refine((v) => v.x !== undefined || v.y !== undefined || v.label || v.sector, {
    message: "Fornece coordenadas ou etiqueta da zona"
  });

export const fieldDrawingSchema = pointSchema;

const setPieceProfile = z.enum(["fechado", "aberto", "combinado"]);
const throwProfile = z.enum(["area", "organizacao"]);
const outletProfile = z.enum(["organizacao", "curto_para_longo", "bola_longa"]);

const normalizeToken = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const goalInputSchema = z
  .object({
    opponentTeamId: z.number().int().positive(),
    teamId: z.number().int().positive(),
    scorerId: z.number().int().positive(),
    assistId: z.number().int().positive().optional().nullable(),
    minute: z.number().int().min(0).max(130),
    momentId: z.number().int().positive(),
    momentName: z.string().optional().nullable(),
    subMomentId: z.number().int().positive().optional(),
    actionIds: z.array(z.number().int().positive()).optional().default([]),
    subMomentSequence: z
      .array(
        z.object({
          subMomentId: z.number().int().positive(),
          actionId: z.number().int().positive(),
          sequenceOrder: z.number().int().min(1)
        })
      )
      .optional(),
    cornerTakerId: z.number().int().positive().optional().nullable(),
    freekickTakerId: z.number().int().positive().optional().nullable(),
    penaltyTakerId: z.number().int().positive().optional().nullable(),
    crossAuthorId: z.number().int().positive().optional().nullable(),
    throwInTakerId: z.number().int().positive().optional().nullable(),
    referencePlayerId: z.number().int().positive().optional().nullable(),
    foulSufferedById: z.number().int().positive().optional().nullable(),
    previousMomentDescription: z.string().optional().or(z.literal("")).nullable(),
    goalCoordinates: pointSchema.optional().nullable(),
    videoPath: z.string().optional().or(z.literal("")).nullable(),
    fieldDrawing: fieldDrawingSchema.optional(),
    assistCoordinates: zoneMarkerSchema.optional().nullable(),
    assistDrawing: pointSchema.optional().nullable(),
    transitionDrawing: pointSchema.optional().nullable(),
    attackingSpaceId: z.number().int().min(1).max(10).optional().nullable(),
    cornerProfile: setPieceProfile.optional().nullable(),
    freekickProfile: setPieceProfile.optional().nullable(),
    throwInProfile: throwProfile.optional().nullable(),
    goalkeeperOutlet: outletProfile.optional().nullable(),
    notes: z.string().optional().or(z.literal("")),
    involvements: z
      .array(
        z.object({
          playerId: z.number().int().positive(),
          role: roleEnum
        })
      )
      .optional()
  })
  .superRefine((value, ctx) => {
    const hasSingleFlow = Boolean(value.subMomentId && value.actionIds.length > 0);
    const hasSequenceFlow = Boolean(value.subMomentSequence && value.subMomentSequence.length > 0);
    if (!hasSingleFlow && !hasSequenceFlow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subMomentSequence"],
        message: "Fornece subMomentSequence ou subMomentId + actionIds."
      });
    }
    if (value.subMomentSequence && value.subMomentSequence.length > 0) {
      const sequenceOrders = value.subMomentSequence.map((entry) => entry.sequenceOrder);
      if (new Set(sequenceOrders).size !== sequenceOrders.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subMomentSequence"],
          message: "sequenceOrder duplicado em subMomentSequence."
        });
      }
    }
    const isTransitionMoment = normalizeToken(value.momentName).includes("transicao ofensiva");
    if (isTransitionMoment && !value.transitionDrawing && !value.attackingSpaceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attackingSpaceId"],
        message: "attackingSpaceId ou transitionDrawing obrigatorio para Transicao Ofensiva"
      });
    }
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
