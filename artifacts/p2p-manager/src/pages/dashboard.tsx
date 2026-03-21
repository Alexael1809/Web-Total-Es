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
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useGetDashboardSummary(
    { date },
    {
      query: {
        queryKey: ["/api/dashboard/summary", date],
      },
    }
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const summary = data;
  const volumenData: Array<{ plataforma: string; volumen: number }> =
    (summary?.volumenPorPlataforma as any) ?? [];
  const maxVolumen = Math.max(...volumenData.map((d) => d.volumen), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen general de operaciones y ganancias.</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-white/5 p-2 rounded-xl">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent border-none text-foreground focus:ring-0 cursor-pointer"
          />
        </div>
      </div>

      {!summary ? (
        <div className="p-8 text-center glass-panel rounded-2xl">
          <p className="text-muted-foreground">No hay datos para la fecha seleccionada.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Ganancia Neta (USDT)</p>
                  <h3 className="text-3xl font-display font-bold text-success">
                    {formatCurrency(summary.gananciasTotalesUsdt || 0)}
                  </h3>
                </div>
                <div className="p-3 bg-success/10 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Volumen Operado</p>
                  <h3 className="text-3xl font-display font-bold text-foreground">
                    {formatCurrency(summary.montoBrutoTotal || 0)}
                  </h3>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Comisiones Totales</p>
                  <h3 className="text-3xl font-display font-bold text-danger">
                    {formatCurrency(
                      (summary.comisionesTotales?.banco || 0) +
                        (summary.comisionesTotales?.binance || 0) +
                        (summary.comisionesTotales?.servidor || 0)
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-danger/10 rounded-xl">
                  <ArrowDownRight className="w-5 h-5 text-danger" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Operaciones</p>
                  <h3 className="text-3xl font-display font-bold text-foreground">
                    {summary.totalOperaciones || 0}
                  </h3>
                </div>
                <div className="p-3 bg-secondary rounded-xl">
                  <Wallet className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" /> Ganancias por Moneda
              </h3>
              <div className="space-y-4">
                {Object.entries(summary.gananciasNetas || {}).map(([moneda, valor]) => (
                  <div
                    key={moneda}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5"
                  >
                    <span className="font-medium text-muted-foreground">{moneda}</span>
                    <span className={`font-bold ${(valor as number) >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(valor as number, moneda)}
                    </span>
                  </div>
                ))}
                {Object.keys(summary.gananciasNetas || {}).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Sin datos</p>
                )}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Volumen por Plataforma
              </h3>
              {volumenData.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                  Sin operaciones en esta fecha
                </div>
              ) : (
                <div className="flex items-end gap-3 h-[220px] px-2">
                  {volumenData.map((entry, index) => {
                    const pct = maxVolumen > 0 ? (entry.volumen / maxVolumen) * 100 : 0;
                    const colors = ["#0ea5e9", "#10b981", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"];
                    const color = colors[index % colors.length];
                    return (
                      <div key={entry.plataforma} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatCurrency(entry.volumen)}
                        </span>
                        <div className="w-full rounded-t-lg transition-all" style={{
                          height: `${Math.max(pct * 1.7, 8)}px`,
                          backgroundColor: color,
                          minHeight: "8px",
                        }} />
                        <span className="text-xs text-muted-foreground truncate w-full text-center">
                          {entry.plataforma}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-2xl lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Operación Más Rentable
                </h4>
                {summary.operacionMasRentable ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {formatCurrency(summary.operacionMasRentable.gananciaNetaUsdt)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {summary.operacionMasRentable.plataformaOrigen} →{" "}
                      {summary.operacionMasRentable.plataformaDestino} (
                      {summary.operacionMasRentable.moneda})
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin datos</p>
                )}
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Última Operación Registrada
                </h4>
                {summary.operacionMasLarga ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {formatCurrency(
                        summary.operacionMasLarga.montoBruto,
                        summary.operacionMasLarga.moneda
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hace momentos • {summary.operacionMasLarga.plataformaOrigen}
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
