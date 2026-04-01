// src/validators/index.ts
import { z } from "zod";

export const checkOutSchema = z.object({
  assetId:             z.string().uuid(),
  userId:              z.string().uuid(),
  destinationLocation: z.string().min(2).max(255),
  notes:               z.string().max(1000).optional(),
});

export const checkInSchema = z.object({
  assetId:        z.string().uuid(),
  userId:         z.string().uuid(),
  returnLocation: z.string().min(2).max(255),
  notes:          z.string().max(1000).optional(),
});

export const maintenanceSchema = z.object({
  assetId: z.string().uuid(),
  userId:  z.string().uuid(),
  notes:   z.string().max(1000).optional(),
});

export const searchSchema = z.object({
  q:          z.string().max(100).default(""),
  status:     z.enum(["Available", "In_Use", "Maintenance"]).optional(),
  categoryId: z.string().uuid().optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidParam = z.object({ id: z.string().uuid("Parâmetro :id inválido.") });

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});
