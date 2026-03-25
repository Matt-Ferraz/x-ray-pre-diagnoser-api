import { z } from "zod";

export const findingSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  severity: z.enum(["normal", "mild", "moderate", "severe"]),
  boundingBox: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(0).max(100),
    height: z.number().min(0).max(100),
  }),
  color: z.string(),
});

export const analysisResponseSchema = z.object({
  findings: z.array(findingSchema),
  summary: z.string(),
  disclaimer: z.string(),
});

export const createExamSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  type: z.string().min(1, "Tipo de exame é obrigatório").max(100),
  reason: z.string().max(500).optional(),
});

export type Finding = z.infer<typeof findingSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
