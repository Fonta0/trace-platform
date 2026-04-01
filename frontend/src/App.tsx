// src/App.tsx
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInventoryDashboard, useSmartSearch } from "./hooks";
import {
  AssetCard, AssetCardSkeleton, InventoryTable, AssetTimeline,
  MovementForm, ToastProvider, useToast, STATUS_CFG,
} from "./components";
import type { Asset, WeeklyMovement } from "./types";

// ── QueryClient corporativo ────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 2, staleTime: 10_000, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

// ── Mini bar chart ─────────────────────────────────────────────────────────
function WeeklyChart({ data }: { data: WeeklyMovement[] }) {
  const max = Math.max(...data.flatMap(d => [d.checkOuts, d.checkIns]), 1);
  const fmt = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />Saídas</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />Entradas</span>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "96px" }}>
              <div title={`Saídas: ${d.checkOuts}`}   className="w-full bg-amber-400/70 hover:bg-amber-400 rounded-t transition-all"   style={{ height: `${(d.checkOuts / max) * 80}px` }} />
              <div title={`Entradas: ${d.checkIns}`}  className="w-full bg-emerald-400/70 hover:bg-emerald-400 rounded-t transition-all" style={{ height: `${(d.checkIns  / max) * 80}px` }} />
            </div>
            <span className="text-[10px] text-zinc-600 mt-1">{fmt(d.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard() {
  const { data, isLoading } = useInventoryDashboard();
  const Skel = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-white/5 rounded ${className}`} />
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Painel de Controle</h1>
        <p className="text-sm text-zinc-500 mt-1">Visão analítica em tempo real · atualiza automaticamente a cada 60s.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["Available", "In_Use", "Maintenance"] as const).map(status => {
          const cfg = STATUS_CFG[status];
          return (
            <div key={status} className={`bg-zinc-900 border rounded-xl p-5 ${cfg.badge}`}>
              {isLoading ? <div className="space-y-2"><Skel className="h-8 w-16" /><Skel className="h-4 w-20" /></div> : (
                <>
                  <div className={`text-3xl font-bold font-mono ${cfg.text}`}>{data?.countByStatus[status] ?? 0}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs text-zinc-400">{cfg.label}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-zinc-900 border border-white/8 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Movimentações — últimos 7 dias</h3>
        {isLoading
          ? <div className="flex items-end gap-2 h-28">{Array.from({length:7},(_,i)=><Skel key={i} className="flex-1 rounded-t" style={{height:`${40+i*6}%`} as React.CSSProperties} />)}</div>
          : data?.weeklyMovements && <WeeklyChart data={data.weeklyMovements} />}
      </div>
    </div>
  );
}

// ── Cards grid ─────────────────────────────────────────────────────────────
function CardsGrid({ onView }: { onView: (a: Asset) => void }) {
  const { data, isLoading } = useSmartSearch("");
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold text-white">Ativos</h1><p className="text-sm text-zinc-500 mt-1">Visualização em cartões.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }, (_, i) => <AssetCardSkeleton key={i} />)
          : data?.data.map(a => <AssetCard key={a.id} asset={a} onViewTimeline={onView} />)}
      </div>
    </div>
  );
}

// ── Timeline slide-over ────────────────────────────────────────────────────
function TimelinePanel({ asset, onClose, currentUserId }: { asset: Asset | null; onClose: () => void; currentUserId: string }) {
  const toast = useToast();
  if (!asset) return null;
  const cfg = STATUS_CFG[asset.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Asset Trace</span>
            <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">✕</button>
          </div>
          <div>
            <h2 className="text-white font-semibold">{asset.name}</h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">{asset.serialNumber}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-6">Histórico Completo</h3>
            <AssetTimeline assetId={asset.id} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Nova Movimentação</h3>
            <MovementForm
              asset={asset}
              currentUserId={currentUserId}
              onSuccess={msg => { toast.success(msg); onClose(); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App root ───────────────────────────────────────────────────────────────
type Tab = "dashboard" | "inventory" | "cards";

function TraceApp() {
  const [tab, setTab]             = useState<Tab>("dashboard");
  const [selectedAsset, setSelected] = useState<Asset | null>(null);
  // Em produção: vem do contexto de autenticação
  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard",  icon: "◈" },
    { id: "inventory", label: "Inventário", icon: "≡" },
    { id: "cards",     label: "Ativos",     icon: "⊞" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* Topbar */}
      <div className="border-b border-white/8 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8 flex-wrap">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-white/10 border border-white/15 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold font-mono text-white">TR</span>
            </div>
            <span className="font-bold text-white tracking-tight">TRACE</span>
            <span className="text-zinc-600 text-xs font-mono">v1.0</span>
          </div>
          <nav className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white/10 text-white border border-white/15" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-xs text-zinc-600 shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="font-mono">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {tab === "dashboard" && <Dashboard />}
        {tab === "inventory" && (
          <div className="space-y-6">
            <div><h1 className="text-xl font-bold text-white">Inventário</h1><p className="text-sm text-zinc-500 mt-1">Smart Search por S/N ou nome · simula leitura de QR Code.</p></div>
            <InventoryTable onViewTimeline={setSelected} />
          </div>
        )}
        {tab === "cards" && <CardsGrid onView={setSelected} />}
      </div>

      <TimelinePanel asset={selectedAsset} onClose={() => setSelected(null)} currentUserId={MOCK_USER_ID} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
        `}</style>
        <TraceApp />
      </ToastProvider>
    </QueryClientProvider>
  );
}
