// src/routes/index.ts — agrega todas as rotas
import { Router } from "express";
import { PrismaClient, AssetStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TraceService } from "../services/TraceService";
import { asyncHandler, authenticate, authorize } from "../middleware/index";
import { ValidationError, NotFoundError } from "../errors/AppError";
import {
  checkOutSchema, checkInSchema, maintenanceSchema,
  searchSchema, uuidParam, loginSchema,
} from "../validators/index";

const prisma = new PrismaClient();
const traceService = new TraceService(prisma);

// ── AUTH ────────────────────────────────────────────────────────────────────
export const authRouter = Router();

authRouter.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ValidationError("Credenciais inválidas.");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ValidationError("Credenciais inválidas.");

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  res.json({ data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
}));

// ── TRACE (movimentações) ────────────────────────────────────────────────────
export const traceRouter = Router();
traceRouter.use(authenticate);

traceRouter.post("/check-out", authorize("Admin", "Operator"), asyncHandler(async (req, res) => {
  const p = checkOutSchema.safeParse(req.body);
  if (!p.success) throw new ValidationError(p.error.errors.map(e => e.message).join("; "));
  const result = await traceService.checkOut(p.data);
  res.json({ data: result, message: `Ativo "${result.asset.name}" retirado com sucesso.` });
}));

traceRouter.post("/check-in", authorize("Admin", "Operator"), asyncHandler(async (req, res) => {
  const p = checkInSchema.safeParse(req.body);
  if (!p.success) throw new ValidationError(p.error.errors[0].message);
  const result = await traceService.checkIn(p.data);
  res.json({ data: result, message: `Ativo "${result.asset.name}" devolvido com sucesso.` });
}));

traceRouter.post("/maintenance/start", authorize("Admin", "Operator"), asyncHandler(async (req, res) => {
  const p = maintenanceSchema.safeParse(req.body);
  if (!p.success) throw new ValidationError(p.error.errors[0].message);
  const result = await traceService.startMaintenance(p.data);
  res.json({ data: result });
}));

traceRouter.post("/maintenance/end", authorize("Admin", "Operator"), asyncHandler(async (req, res) => {
  const p = maintenanceSchema.safeParse(req.body);
  if (!p.success) throw new ValidationError(p.error.errors[0].message);
  const result = await traceService.endMaintenance(p.data);
  res.json({ data: result });
}));

// ── ASSETS ───────────────────────────────────────────────────────────────────
export const assetRouter = Router();
assetRouter.use(authenticate);

assetRouter.get("/", asyncHandler(async (req, res) => {
  const p = searchSchema.safeParse(req.query);
  if (!p.success) throw new ValidationError(p.error.errors[0].message);
  const result = await traceService.searchAssets({ query: p.data.q, status: p.data.status as AssetStatus | undefined, categoryId: p.data.categoryId, page: p.data.page, limit: p.data.limit });
  res.json({ data: result });
}));

assetRouter.get("/:id/timeline", asyncHandler(async (req, res) => {
  const p = uuidParam.safeParse(req.params);
  if (!p.success) throw new ValidationError(p.error.errors[0].message);
  const logs = await traceService.getAssetTimeline(p.data.id);
  res.json({ data: logs });
}));

assetRouter.get("/:id", asyncHandler(async (req, res) => {
  const p = uuidParam.safeParse(req.params);
  if (!p.success) throw new ValidationError(p.error.errors[0].message);
  const asset = await prisma.asset.findUnique({ where: { id: p.data.id }, include: { category: true } });
  if (!asset) throw new NotFoundError("Asset", p.data.id);
  res.json({ data: asset });
}));

// ── INVENTORY ────────────────────────────────────────────────────────────────
export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

inventoryRouter.get("/dashboard", asyncHandler(async (_req, res) => {
  const data = await traceService.getInventoryDashboard();
  res.json({ data });
}));

inventoryRouter.get("/categories", asyncHandler(async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json({ data: cats });
}));
