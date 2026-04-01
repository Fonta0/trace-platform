// src/types/index.ts
export type { Asset, TraceLog, User, Category, AssetStatus, ActionType, UserRole } from "@prisma/client";

export interface CheckOutInput {
  assetId: string;
  userId: string;
  destinationLocation: string;
  notes?: string;
}

export interface CheckInInput {
  assetId: string;
  userId: string;
  returnLocation: string;
  notes?: string;
}

export interface MaintenanceInput {
  assetId: string;
  userId: string;
  notes?: string;
}

export interface AssetSearchInput {
  query: string;
  status?: import("@prisma/client").AssetStatus;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface WeeklyMovement {
  date: string;
  checkOuts: number;
  checkIns: number;
}

export interface InventoryDashboardData {
  countByStatus: Record<import("@prisma/client").AssetStatus, number>;
  weeklyMovements: WeeklyMovement[];
}

export interface MovementResult {
  asset: import("@prisma/client").Asset;
  traceLog: import("@prisma/client").TraceLog;
}

export interface PaginatedAssets {
  data: import("@prisma/client").Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: "Admin" | "Operator" | "Viewer";
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
