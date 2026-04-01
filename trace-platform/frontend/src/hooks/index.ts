// src/hooks/index.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { Asset, AssetStatus, CheckOutInput, CheckInInput, MaintenanceInput, TraceLog, InventoryDashboard, PaginatedAssets } from "../types";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
  dashboard:    ["inventory-dashboard"]                            as const,
  search:       (q: string, s?: AssetStatus | "") => ["assets-search", q, s ?? ""] as const,
  assetDetail:  (id: string) => ["asset-detail",   id]           as const,
  timeline:     (id: string) => ["asset-timeline", id]           as const,
};

// ── useDebounce ───────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// ── useInventoryDashboard ─────────────────────────────────────────────────────
export function useInventoryDashboard() {
  return useQuery<InventoryDashboard, Error>({
    queryKey: QK.dashboard,
    queryFn:  api.getInventoryDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

// ── useSmartSearch ────────────────────────────────────────────────────────────
export function useSmartSearch(query: string, status?: AssetStatus | "", page = 1, limit = 20) {
  const dq = useDebounce(query, 280);
  return useQuery<PaginatedAssets, Error>({
    queryKey: QK.search(dq, status),
    queryFn:  () => api.searchAssets({ query: dq, status: status || undefined, page, limit }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

// ── useAssetDetail ────────────────────────────────────────────────────────────
export function useAssetDetail(id: string | null) {
  return useQuery<Asset, Error>({
    queryKey: QK.assetDetail(id ?? ""),
    queryFn:  () => api.getAssetById(id!),
    enabled:  !!id,
    staleTime: 20_000,
  });
}

// ── useAssetTimeline ──────────────────────────────────────────────────────────
export function useAssetTimeline(id: string | null) {
  return useQuery<TraceLog[], Error>({
    queryKey: QK.timeline(id ?? ""),
    queryFn:  () => api.getAssetTimeline(id!),
    enabled:  !!id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

// ── Helpers de invalidação ────────────────────────────────────────────────────
function useInvalidateAsset() {
  const qc = useQueryClient();
  return (assetId: string) => {
    qc.invalidateQueries({ queryKey: QK.dashboard });
    qc.invalidateQueries({ queryKey: ["assets-search"] });
    qc.invalidateQueries({ queryKey: QK.timeline(assetId) });
  };
}

// ── useCheckOut ───────────────────────────────────────────────────────────────
export function useCheckOut() {
  const invalidate = useInvalidateAsset();
  const qc = useQueryClient();
  return useMutation<{ asset: Asset; traceLog: TraceLog; message: string }, Error, CheckOutInput>({
    mutationFn: api.checkOut,
    onSuccess: (data) => {
      invalidate(data.asset.id);
      qc.setQueryData(QK.assetDetail(data.asset.id), data.asset);
    },
  });
}

// ── useCheckIn ────────────────────────────────────────────────────────────────
export function useCheckIn() {
  const invalidate = useInvalidateAsset();
  const qc = useQueryClient();
  return useMutation<{ asset: Asset; traceLog: TraceLog; message: string }, Error, CheckInInput>({
    mutationFn: api.checkIn,
    onSuccess: (data) => {
      invalidate(data.asset.id);
      qc.setQueryData(QK.assetDetail(data.asset.id), data.asset);
    },
  });
}

// ── useMaintenance ────────────────────────────────────────────────────────────
export function useMaintenance(action: "start" | "end") {
  const invalidate = useInvalidateAsset();
  const qc = useQueryClient();
  return useMutation<{ asset: Asset; traceLog: TraceLog }, Error, MaintenanceInput>({
    mutationFn: action === "start" ? api.startMaintenance : api.endMaintenance,
    onSuccess: (data) => {
      invalidate(data.asset.id);
      qc.setQueryData(QK.assetDetail(data.asset.id), data.asset);
    },
  });
}
