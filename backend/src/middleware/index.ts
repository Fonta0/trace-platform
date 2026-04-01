// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError } from "../errors/AppError";
import type { JwtPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET!;

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new UnauthorizedError("Token não fornecido."));
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) return next(new UnauthorizedError("Token expirado."));
    next(new UnauthorizedError("Token inválido."));
  }
}

export function authorize(...roles: JwtPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError(`Requer role: ${roles.join(" ou ")}.`));
    next();
  };
}

// src/middleware/asyncHandler.ts
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// src/middleware/errorHandler.ts
import { Prisma } from "@prisma/client";
import {
  AppError, AssetNotFoundError, AssetNotAvailableError,
  AssetNotInUseError, InvalidOperationError,
} from "../errors/AppError";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const ts = new Date().toISOString();
  const path = req.path;

  if (err instanceof AssetNotFoundError) {
    res.status(404).json({ error: { code: "ASSET_NOT_FOUND", message: err.message, ts, path } }); return;
  }
  if (err instanceof AssetNotAvailableError) {
    res.status(409).json({ error: { code: "ASSET_NOT_AVAILABLE", message: err.message, ts, path } }); return;
  }
  if (err instanceof AssetNotInUseError) {
    res.status(409).json({ error: { code: "ASSET_NOT_IN_USE", message: err.message, ts, path } }); return;
  }
  if (err instanceof InvalidOperationError) {
    res.status(422).json({ error: { code: "INVALID_OPERATION", message: err.message, ts, path } }); return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const msgs: Record<string, [number, string]> = {
      P2002: [409, "Registro duplicado."],
      P2025: [404, "Registro não encontrado."],
      P2003: [400, "Referência inválida."],
    };
    const [status, message] = msgs[err.code] ?? [500, "Erro de banco."];
    res.status(status).json({ error: { code: err.code, message, ts, path } }); return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, ts, path } }); return;
  }

  console.error("[TRACE ERROR]", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: process.env.NODE_ENV === "production" ? "Erro interno." : err.message,
      ts, path,
    },
  });
}
