// src/components/index.tsx
// AssetCard | InventoryTable | AssetTimeline | MovementForm | Toast | Skeletons

import { useState, useCallback, createContext, useContext, useRef, useEffect } from "react";
import { useSmartSearch, useAssetTimeline, useCheckOut, useCheckIn, useMaintenance } from "../hooks";
import { ApiError, AssetNotAvailableError } from "../services/api";
import type { Asset, AssetStatus, TraceLog, ActionType } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_CFG: Record<AssetStatus, { label: string; dot: string; badge: string; text: string }> = {
  Available:   { label: "Disponível",  dot: "bg-emerald-400", badge: "bg-emerald-400/10 border-emerald-400/20", text: "text-emerald-400" },
  In_Use:      { label: "Em Uso",      dot: "bg-amber-400",   badge: "bg-amber-400/10 border-amber-400/20",     text: "text-amber-400"  },
  Maintenance: { label: "Manutenção",  dot: "bg-rose-400",    badge: "bg-rose-400/10 border-rose-400/20",       text: "text-rose-400"   },
};

const ACTION_CFG: Record<ActionType, { label: string; icon: string; color: string }> = {
  Check_Out:         { label: "Retirada",            icon: "→", color: "text-amber-400"   },
  Check_In:          { label: "Devolução",           icon: "←", color: "text-emerald-400" },
  Maintenance_Start: { label: "Início Manutenção",   icon: "⚙", color: "text-rose-400"    },
  Maintenance_End:   { label: "Fim Manutenção",      icon: "✓", color: "text-sky-400"     },
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// ─────────────────────────────────────────────────────────────────────────────
// SKELETONS
// ─────────────────────────────────────────────────────────────────────────────
const Skel = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded ${className}`} />
);

export const AssetCardSkeleton = () => (
  <div className="bg-zinc-900 border border-white/8 rounded-xl p-5 space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1"><Skel className="h-3 w-24" /><Skel className="h-5 w-40" /></div>
      <Skel className="h-6 w-20 rounded-full" />
    </div>
    <div className="space-y-2"><Skel className="h-3 w-32" /><Skel className="h-3 w-24" /></div>
    <div className="flex gap-2"><Skel className="h-8 flex-1 rounded-lg" /><Skel className="h-8 w-8 rounded-lg" /></div>
  </div>
);

export const TableRowSkeleton = () => (
  <tr className="border-b border-white/5">
    {[40, 20, 24, 20, 16, 20, 12].map((w, i) => (
      <td key={i} className="px-4 py-3"><Skel className={`h-4`} style={{ width: `${w * 3}px` } as React.CSSProperties} /></td>
    ))}
  </tr>
);

export const TimelineSkeleton = () => (
  <div className="space-y-6">
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="flex gap-4">
        <div className="flex flex-col items-center">
          <Skel className="w-8 h-8 rounded-full" />
          {i < 3 && <Skel className="w-0.5 h-12 mt-1" />}
        </div>
        <div className="flex-1 pb-6 space-y-2">
          <Skel className="h-4 w-28" /><Skel className="h-3 w-48" /><Skel className="h-3 w-36" />
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ASSET CARD
// ─────────────────────────────────────────────────────────────────────────────
interface AssetCardProps { asset: Asset; onViewTimeline: (a: Asset) => void; }

export function AssetCard({ asset, onViewTimeline }: AssetCardProps) {
  const cfg = STATUS_CFG[asset.status];
  return (
    <div className="bg-zinc-900 border border-white/8 rounded-xl p-5 space-y-4 hover:border-white/20 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-zinc-500 tracking-wider">{asset.serialNumber}</p>
          <h3 className="text-sm font-semibold text-white mt-0.5 truncate">{asset.name}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${cfg.badge} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <div className="space-y-1.5 text-xs text-zinc-500">
        <div className="flex items-center gap-2"><span>📁</span><span>{asset.category.name}</span></div>
        {asset.currentLocation && <div className="flex items-center gap-2"><span>📍</span><span className="truncate">{asset.currentLocation}</span></div>}
        {asset.lastMovementAt  && <div className="flex items-center gap-2 text-zinc-600"><span>🕐</span><span>{fmt(asset.lastMovementAt)}</span></div>}
      </div>
      <button
        onClick={() => onViewTimeline(asset)}
        className="w-full py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg transition-all border border-white/5 hover:border-white/15"
      >
        Ver Histórico →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSET TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
export function AssetTimeline({ assetId }: { assetId: string }) {
  const { data: logs, isLoading } = useAssetTimeline(assetId);
  if (isLoading) return <TimelineSkeleton />;
  if (!logs?.length) return <p className="text-zinc-600 text-sm">Nenhum evento registrado.</p>;

  return (
    <div>
      {logs.map((log, i) => {
        const cfg = ACTION_CFG[log.actionType];
        return (
          <div key={log.id} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${cfg.color} bg-zinc-800 border border-white/10 shrink-0 z-10`}>
                {cfg.icon}
              </div>
              {i < logs.length - 1 && <div className="w-0.5 flex-1 my-1 bg-white/5 min-h-[32px]" />}
            </div>
            <div className="pb-6 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[11px] text-zinc-600 font-mono">{fmt(log.timestamp)}</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 font-medium">{log.user.name}</p>
              {log.notes && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{log.notes}</p>}
              {log.locationSnapshot && <p className="text-[11px] text-zinc-600 mt-1">📍 {log.locationSnapshot}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY TABLE
// ─────────────────────────────────────────────────────────────────────────────
interface InventoryTableProps { onViewTimeline: (a: Asset) => void; }

export function InventoryTable({ onViewTimeline }: InventoryTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const { data, isLoading, isFetching } = useSmartSearch(query, status);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome ou S/N..."
            className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-8 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/25 font-mono transition-all"
          />
          {isFetching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 animate-pulse">●●●</span>}
        </div>
        <select
          value={status} onChange={e => setStatus(e.target.value as AssetStatus | "")}
          className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="Available">Disponível</option>
          <option value="In_Use">Em Uso</option>
          <option value="Maintenance">Manutenção</option>
        </select>
      </div>
      <p className="text-xs text-zinc-600 font-mono">{data ? `${data.total} ativo(s)` : "—"}</p>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {["Ativo","S/N","Status","Categoria","Localização","Última Mov.",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }, (_, i) => <TableRowSkeleton key={i} />)
              : data?.data.map(a => {
                  const cfg = STATUS_CFG[a.status];
                  return (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{a.serialNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{a.category.name}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{a.currentLocation || "—"}</td>
                      <td className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">{a.lastMovementAt ? fmt(a.lastMovementAt) : "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => onViewTimeline(a)} className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition-all">
                          Trace →
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT FORM
// ─────────────────────────────────────────────────────────────────────────────
type MovType = "check-out" | "check-in" | "maintenance-start" | "maintenance-end";

interface MovementFormProps { asset: Asset; currentUserId: string; onSuccess?: (msg: string) => void; }

export function MovementForm({ asset, currentUserId, onSuccess }: MovementFormProps) {
  const available: MovType[] = asset.status === "Available" ? ["check-out","maintenance-start"] : asset.status === "In_Use" ? ["check-in"] : ["maintenance-end"];
  const [type, setType] = useState<MovType>(available[0]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const checkOut        = useCheckOut();
  const checkIn         = useCheckIn();
  const maintStart      = useMaintenance("start");
  const maintEnd        = useMaintenance("end");
  const mutation        = { "check-out": checkOut, "check-in": checkIn, "maintenance-start": maintStart, "maintenance-end": maintEnd }[type];
  const needsLocation   = type === "check-out" || type === "check-in";
  const isLoading       = mutation.isPending;

  const labels: Record<MovType, string> = {
    "check-out": "Check-Out", "check-in": "Check-In",
    "maintenance-start": "Iniciar Manutenção", "maintenance-end": "Encerrar Manutenção",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      if (type === "check-out") {
        const r = await checkOut.mutateAsync({ assetId: asset.id, userId: currentUserId, destinationLocation: location, notes: notes || undefined });
        onSuccess?.(r.message);
      } else if (type === "check-in") {
        const r = await checkIn.mutateAsync({ assetId: asset.id, userId: currentUserId, returnLocation: location, notes: notes || undefined });
        onSuccess?.(r.message);
      } else if (type === "maintenance-start") {
        await maintStart.mutateAsync({ assetId: asset.id, userId: currentUserId, notes: notes || undefined });
        onSuccess?.("Manutenção iniciada.");
      } else {
        await maintEnd.mutateAsync({ assetId: asset.id, userId: currentUserId, notes: notes || undefined });
        onSuccess?.("Manutenção encerrada. Ativo disponível.");
      }
      setLocation(""); setNotes("");
    } catch (e) {
      if (e instanceof AssetNotAvailableError) setErr("Status mudou. Recarregue a página.");
      else if (e instanceof ApiError)          setErr(e.message);
      else                                     setErr("Erro de conexão.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {available.map(t => (
          <button key={t} type="button" onClick={() => { setType(t); setErr(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${type === t ? "bg-white/10 border-white/25 text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"}`}>
            {labels[t]}
          </button>
        ))}
      </div>
      {needsLocation && (
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500">{type === "check-out" ? "Destino" : "Local de devolução"}</label>
          <input required value={location} onChange={e => setLocation(e.target.value)} disabled={isLoading}
            placeholder="Ex: Sala A-101..." className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/25 disabled:opacity-50" />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500">Observações (opcional)</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} disabled={isLoading}
          placeholder="Detalhes para auditoria..." className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/25 resize-none disabled:opacity-50" />
      </div>
      {err && (
        <div className="flex items-start gap-2 p-3 bg-rose-400/10 border border-rose-400/20 rounded-lg">
          <span className="text-rose-400 shrink-0">⚠</span>
          <p className="text-xs text-rose-300">{err}</p>
        </div>
      )}
      {mutation.isSuccess && !err && (
        <div className="flex items-center gap-2 p-3 bg-emerald-400/10 border border-emerald-400/20 rounded-lg">
          <span className="text-emerald-400">✓</span>
          <p className="text-xs text-emerald-300">Operação registrada com sucesso.</p>
        </div>
      )}
      <button type="submit" disabled={isLoading}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2">
        {isLoading
          ? <><span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />Processando...</>
          : `${labels[type]} →`}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info" | "warning";
interface ToastItem { id: string; type: ToastType; message: string; duration: number; }
interface ToastCtx  { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; }

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const add = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = `t-${Date.now()}-${counter.current++}`;
    setToasts(p => [...p, { id, type, message, duration }]);
  }, []);

  const remove = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ success: m => add(m,"success"), error: m => add(m,"error",6000), info: m => add(m,"info") }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => <ToastItemCmp key={t.id} toast={t} onDismiss={remove} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemCmp({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }, toast.duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, toast.duration, onDismiss]);

  const cfg = {
    success: { dot: "bg-emerald-400", border: "border-emerald-400/20", text: "text-emerald-300" },
    error:   { dot: "bg-rose-400",    border: "border-rose-400/20",    text: "text-rose-300"    },
    warning: { dot: "bg-amber-400",   border: "border-amber-400/20",   text: "text-amber-300"   },
    info:    { dot: "bg-sky-400",     border: "border-sky-400/20",     text: "text-sky-300"     },
  }[toast.type];

  return (
    <div className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-900 border ${cfg.border} max-w-sm w-full transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1`} />
      <p className={`text-xs leading-relaxed flex-1 ${cfg.text}`}>{toast.message}</p>
      <button onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }} className="text-zinc-600 hover:text-zinc-400 text-sm shrink-0">✕</button>
    </div>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}
