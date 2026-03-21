import React, { useState } from "react";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Clock,
  Landmark,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Period = "all" | "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  all: "Todo el tiempo",
  today: "Hoy",
  week: "Últimos 7 días",
  month: "Este mes",
};

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useGetDashboardSummary(
    { period } as any,
    {
      query: {
        staleTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
      },
    }
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    refetch();
  };

  const summary = data as any;
  const volumenData: Array<{ plataforma: string; volumen: number }> =
    summary?.volumenPorPlataforma ?? [];
  const maxVolumen = Math.max(...volumenData.map((d) => d.volumen), 1);

  const isActive = isFetching || isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen de operaciones y ganancias.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center bg-card border border-white/5 rounded-xl p-1 gap-0.5">
            {(["all", "today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p
                    ? "bg-primary text-white shadow-[0_0_12px_rgba(0,165,255,0.3)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "all" ? "Todo" : p === "today" ? "Hoy" : p === "week" ? "7 días" : "Mes"}
              </button>
            ))}
          </div>
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isActive}
            className="p-2 bg-card border border-white/5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isActive ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !summary || summary.totalOperaciones === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl">
          <Activity className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Sin operaciones en este período</p>
          <p className="text-muted-foreground/60 text-sm mt-2">
            {period !== "all" ? "Prueba cambiando el filtro de período." : "Registra tu primera operación para comenzar."}
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-2xl border border-success/10">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-success mb-1">Ganancia Real USDT</p>
                  <h3 className="text-2xl font-display font-bold text-success truncate">
                    {formatCurrency(summary.gananciaRealUsdt ?? 0)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.operacionesCerradas} op. cerradas
                  </p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl shrink-0 ml-3">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">G. Proyectada USDT</p>
                  <h3 className="text-2xl font-display font-bold text-foreground truncate">
                    {formatCurrency(summary.gananciasTotalesUsdt ?? 0)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Todas las operaciones</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl shrink-0 ml-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Volumen Operado</p>
                  <h3 className="text-2xl font-display font-bold text-foreground truncate">
                    {formatCurrency(summary.montoBrutoTotal ?? 0)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">USDT total</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl shrink-0 ml-3">
                  <Activity className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Operaciones</p>
                  <h3 className="text-2xl font-display font-bold text-foreground">
                    {summary.totalOperaciones ?? 0}
                  </h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-yellow-400">🟡 {summary.operacionesAbiertas ?? 0} abiertas</span>
                    <span className="text-xs text-success">🟢 {summary.operacionesCerradas ?? 0} cerradas</span>
                  </div>
                </div>
                <div className="p-3 bg-secondary rounded-xl shrink-0 ml-3">
                  <Wallet className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Volumen por plataforma */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Volumen por Plataforma (USDT)
              </h3>
              {volumenData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                  Sin datos para mostrar
                </div>
              ) : (
                <div className="flex items-end gap-4 h-[200px] px-2">
                  {volumenData.map((entry, index) => {
                    const pct = maxVolumen > 0 ? (entry.volumen / maxVolumen) * 100 : 0;
                    const colors = ["#0ea5e9", "#10b981", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
                    const color = colors[index % colors.length];
                    return (
                      <div key={entry.plataforma} className="flex flex-col items-center flex-1 gap-1 min-w-0">
                        <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
                          {formatCurrency(entry.volumen)}
                        </span>
                        <div
                          className="w-full rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${Math.max(pct * 1.7, 6)}px`,
                            backgroundColor: color,
                            minHeight: "6px",
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                          {entry.plataforma}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ganancias por moneda */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" /> G. Proyectada por Moneda
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.gananciasNetas ?? {})
                  .filter(([, val]) => (val as number) !== 0)
                  .map(([moneda, valor]) => (
                    <div
                      key={moneda}
                      className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5"
                    >
                      <span className="font-medium text-muted-foreground text-sm">{moneda}</span>
                      <span className={`font-bold text-sm ${(valor as number) >= 0 ? "text-success" : "text-danger"}`}>
                        {formatCurrency(valor as number, moneda)}
                      </span>
                    </div>
                  ))}
                {!Object.values(summary.gananciasNetas ?? {}).some((v) => v !== 0) && (
                  <p className="text-muted-foreground text-sm text-center py-4">Sin datos</p>
                )}
              </div>
            </div>

            {/* Comisiones */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-danger" /> Comisiones Totales
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Banco / Transferencia", val: summary.comisionesTotales?.banco ?? 0 },
                  { label: "Binance", val: summary.comisionesTotales?.binance ?? 0 },
                  { label: "Servidor / Intermediaria", val: summary.comisionesTotales?.servidor ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-muted-foreground text-sm">{label}</span>
                    <span className="text-danger font-medium text-sm">{formatCurrency(val)}</span>
                  </div>
                ))}
                <div className="flex justify-between p-3 bg-danger/5 rounded-xl border border-danger/20">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="text-danger font-bold text-sm">
                    {formatCurrency(
                      (summary.comisionesTotales?.banco ?? 0) +
                        (summary.comisionesTotales?.binance ?? 0) +
                        (summary.comisionesTotales?.servidor ?? 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Rendimiento individual */}
            <div className="glass-panel p-6 rounded-2xl lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <h4 className="text-sm font-medium text-success mb-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Operación Más Rentable
                </h4>
                {summary.operacionMasRentable ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      +{formatCurrency(summary.operacionMasRentable.gananciaNetaUsdt)} USDT
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {summary.operacionMasRentable.plataformaOrigen} → {summary.operacionMasRentable.plataformaDestino}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.operacionMasRentable.moneda} • {formatCurrency(summary.operacionMasRentable.montoBruto)} USDT
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin datos</p>
                )}
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Última Operación Registrada
                </h4>
                {summary.operacionMasLarga ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {formatCurrency(summary.operacionMasLarga.montoBruto)} USDT
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {summary.operacionMasLarga.plataformaOrigen} → {summary.operacionMasLarga.plataformaDestino}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.operacionMasLarga.moneda} •{" "}
                      <span
                        className={`font-medium ${
                          summary.operacionMasLarga.statusCiclo === "cerrada"
                            ? "text-success"
                            : "text-yellow-400"
                        }`}
                      >
                        {summary.operacionMasLarga.statusCiclo === "cerrada" ? "Cerrada" : "Abierta"}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin datos</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
