// src/services/api.ts
import type { Asset, TraceLog, InventoryDashboard, PaginatedAssets, CheckOutInput, CheckInInput, MaintenanceInput, AssetStatus, AuthUser } from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

// ── Erros tipados ────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public code: string, message: string, public statusCode: number) {
    super(message); this.name = "ApiError";
  }
}
export class AssetNotAvailableError extends ApiError {
  constructor(msg: string) { super("ASSET_NOT_AVAILABLE", msg, 409); }
}
export class AssetNotFoundError extends ApiError {
  constructor(msg: string) { super("ASSET_NOT_FOUND", msg, 404); }
}
export class UnauthorizedError extends ApiError {
  constructor(msg = "Sessão expirada.") { super("UNAUTHORIZED", msg, 401); }
}

// ── Cliente base ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("trace_token"); }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code    = body?.error?.code    ?? "UNKNOWN";
    const message = body?.error?.message ?? "Erro desconhecido.";
    if (code === "ASSET_NOT_AVAILABLE") throw new AssetNotAvailableError(message);
    if (code === "ASSET_NOT_FOUND")     throw new AssetNotFoundError(message);
    if (res.status === 401)             throw new UnauthorizedError(message);
    throw new ApiError(code, message, res.status);
  }
  return (body as { data: T }).data;
}

// ── Métodos ───────────────────────────────────────────────────────────────────
export const api = {
  login: (email: string, password: string): Promise<AuthUser> =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getInventoryDashboard: (): Promise<InventoryDashboard> =>
    request("/inventory/dashboard"),

  searchAssets: (params: { query: string; status?: AssetStatus; page?: number; limit?: number }): Promise<PaginatedAssets> => {
    const qs = new URLSearchParams();
    if (params.query)  qs.set("q", params.query);
    if (params.status) qs.set("status", params.status);
    if (params.page)   qs.set("page",   String(params.page));
    if (params.limit)  qs.set("limit",  String(params.limit));
    return request(`/assets?${qs}`);
  },

  getAssetById:    (id: string): Promise<Asset>      => request(`/assets/${id}`),
  getAssetTimeline:(id: string): Promise<TraceLog[]>  => request(`/assets/${id}/timeline`),

  checkOut: (i: CheckOutInput): Promise<{ asset: Asset; traceLog: TraceLog; message: string }> =>
    request("/trace/check-out", { method: "POST", body: JSON.stringify(i) }),

  checkIn: (i: CheckInInput): Promise<{ asset: Asset; traceLog: TraceLog; message: string }> =>
    request("/trace/check-in", { method: "POST", body: JSON.stringify(i) }),

  startMaintenance: (i: MaintenanceInput): Promise<{ asset: Asset; traceLog: TraceLog }> =>
    request("/trace/maintenance/start", { method: "POST", body: JSON.stringify(i) }),

  endMaintenance: (i: MaintenanceInput): Promise<{ asset: Asset; traceLog: TraceLog }> =>
    request("/trace/maintenance/end", { method: "POST", body: JSON.stringify(i) }),
};
