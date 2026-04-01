// src/services/TraceService.ts
import { PrismaClient, Asset, TraceLog, AssetStatus, ActionType, Prisma } from "@prisma/client";
import {
  AssetNotFoundError,
  AssetNotAvailableError,
  AssetNotInUseError,
  InvalidOperationError,
} from "../errors/AppError";
import type {
  CheckOutInput, CheckInInput, MaintenanceInput,
  AssetSearchInput, MovementResult, PaginatedAssets, InventoryDashboardData,
} from "../types";

export class TraceService {
  constructor(private readonly prisma: PrismaClient) {}

  async checkOut(input: CheckOutInput): Promise<MovementResult> {
    const asset = await this.prisma.asset.findUnique({ where: { id: input.assetId } });
    if (!asset) throw new AssetNotFoundError(input.assetId);
    if (asset.status !== AssetStatus.Available) throw new AssetNotAvailableError(input.assetId, asset.status);

    const [updatedAsset, traceLog] = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.asset.findUnique({ where: { id: input.assetId } });
      if (!locked || locked.status !== AssetStatus.Available)
        throw new AssetNotAvailableError(input.assetId, locked?.status ?? "unknown");

      const updated = await tx.asset.update({
        where: { id: input.assetId },
        data: { status: AssetStatus.In_Use, currentLocation: input.destinationLocation, lastMovementAt: new Date() },
      });
      const log = await tx.traceLog.create({
        data: { assetId: input.assetId, userId: input.userId, actionType: ActionType.Check_Out, notes: input.notes, locationSnapshot: input.destinationLocation },
      });
      return [updated, log];
    });
    return { asset: updatedAsset, traceLog };
  }

  async checkIn(input: CheckInInput): Promise<MovementResult> {
    const asset = await this.prisma.asset.findUnique({ where: { id: input.assetId } });
    if (!asset) throw new AssetNotFoundError(input.assetId);
    if (asset.status !== AssetStatus.In_Use) throw new AssetNotInUseError(input.assetId, asset.status);

    const [updatedAsset, traceLog] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id: input.assetId },
        data: { status: AssetStatus.Available, currentLocation: input.returnLocation, lastMovementAt: new Date() },
      });
      const log = await tx.traceLog.create({
        data: { assetId: input.assetId, userId: input.userId, actionType: ActionType.Check_In, notes: input.notes, locationSnapshot: input.returnLocation },
      });
      return [updated, log];
    });
    return { asset: updatedAsset, traceLog };
  }

  async startMaintenance(input: MaintenanceInput): Promise<MovementResult> {
    const asset = await this.prisma.asset.findUnique({ where: { id: input.assetId } });
    if (!asset) throw new AssetNotFoundError(input.assetId);
    if (asset.status === AssetStatus.Maintenance) throw new InvalidOperationError(`Asset já está em manutenção.`);

    const [updatedAsset, traceLog] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id: input.assetId },
        data: { status: AssetStatus.Maintenance, lastMovementAt: new Date() },
      });
      const log = await tx.traceLog.create({
        data: { assetId: input.assetId, userId: input.userId, actionType: ActionType.Maintenance_Start, notes: input.notes, locationSnapshot: asset.currentLocation },
      });
      return [updated, log];
    });
    return { asset: updatedAsset, traceLog };
  }

  async endMaintenance(input: MaintenanceInput): Promise<MovementResult> {
    const asset = await this.prisma.asset.findUnique({ where: { id: input.assetId } });
    if (!asset) throw new AssetNotFoundError(input.assetId);
    if (asset.status !== AssetStatus.Maintenance) throw new InvalidOperationError(`Asset não está em manutenção.`);

    const [updatedAsset, traceLog] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id: input.assetId },
        data: { status: AssetStatus.Available, lastMovementAt: new Date() },
      });
      const log = await tx.traceLog.create({
        data: { assetId: input.assetId, userId: input.userId, actionType: ActionType.Maintenance_End, notes: input.notes, locationSnapshot: asset.currentLocation },
      });
      return [updated, log];
    });
    return { asset: updatedAsset, traceLog };
  }

  async getAssetTimeline(assetId: string): Promise<TraceLog[]> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AssetNotFoundError(assetId);
    return this.prisma.traceLog.findMany({
      where: { assetId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: "desc" },
    });
  }

  async searchAssets(input: AssetSearchInput): Promise<PaginatedAssets> {
    const { query, status, categoryId, page = 1, limit = 20 } = input;
    const where: Prisma.AssetWhereInput = {
      AND: [
        { OR: [{ serialNumber: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] },
        ...(status ? [{ status }] : []),
        ...(categoryId ? [{ categoryId }] : []),
      ],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({ where, include: { category: true }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.asset.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getInventoryDashboard(): Promise<InventoryDashboardData> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [statusGroups, weeklyLogs] = await Promise.all([
      this.prisma.asset.groupBy({ by: ["status"], _count: { status: true } }),
      this.prisma.traceLog.findMany({
        where: { timestamp: { gte: sevenDaysAgo }, actionType: { in: [ActionType.Check_Out, ActionType.Check_In] } },
        select: { timestamp: true, actionType: true },
        orderBy: { timestamp: "asc" },
      }),
    ]);

    const countByStatus: Record<AssetStatus, number> = { Available: 0, In_Use: 0, Maintenance: 0 };
    for (const g of statusGroups) countByStatus[g.status] = g._count.status;

    const movementMap = new Map<string, { checkOuts: number; checkIns: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      movementMap.set(d.toISOString().split("T")[0], { checkOuts: 0, checkIns: 0 });
    }
    for (const log of weeklyLogs) {
      const key = log.timestamp.toISOString().split("T")[0];
      const entry = movementMap.get(key);
      if (!entry) continue;
      if (log.actionType === ActionType.Check_Out) entry.checkOuts++;
      if (log.actionType === ActionType.Check_In) entry.checkIns++;
    }

    return {
      countByStatus,
      weeklyMovements: Array.from(movementMap.entries()).map(([date, counts]) => ({ date, ...counts })),
    };
  }
}
