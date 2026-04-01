// src/types/index.ts
export type AssetStatus = "Available" | "In_Use" | "Maintenance";
export type ActionType  = "Check_Out" | "Check_In" | "Maintenance_Start" | "Maintenance_End";
export type UserRole    = "Admin" | "Operator" | "Viewer";

export interface Category { id: string; name: string; description?: string; }
export interface User     { id: string; name: string; email: string; role: UserRole; }

export interface Asset {
  id: string; serialNumber: string; name: string; description?: string;
  status: AssetStatus; currentLocation?: string; categoryId: string;
  category: Category; lastMovementAt?: string; createdAt: string; updatedAt: string;
}

export interface TraceLog {
  id: string; assetId: string; userId: string; user: User;
  actionType: ActionType; timestamp: string; notes?: string; locationSnapshot?: string;
}

export interface WeeklyMovement { date: string; checkOuts: number; checkIns: number; }

export interface InventoryDashboard {
  countByStatus: Record<AssetStatus, number>;
  weeklyMovements: WeeklyMovement[];
}

export interface PaginatedAssets {
  data: Asset[]; total: number; page: number; limit: number; totalPages: number;
}

export interface CheckOutInput       { assetId: string; userId: string; destinationLocation: string; notes?: string; }
export interface CheckInInput        { assetId: string; userId: string; returnLocation: string; notes?: string; }
export interface MaintenanceInput    { assetId: string; userId: string; notes?: string; }
export interface AuthUser            { id: string; name: string; email: string; role: UserRole; token: string; }
