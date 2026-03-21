import React, { useState } from "react";
import { useGetOperationsReport } from "@workspace/api-client-react";
import { Download, MessageCircle, FileText, Search } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("");

  const { data: report, isLoading } = useGetOperationsReport({
    query: {
      queryKey: ["/api/reports/operations", startDate, endDate, currency]
    },
    request: undefined
  });

  const handleExportExcel = () => {
    if (!report || report.operaciones.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(report.operaciones.map(op => ({
      ID: op.id,
      Fecha: formatShortDate(op.fecha),
      Moneda: op.moneda,
      Ruta: `${op.plataformaOrigen} a ${op.plataformaDestino}`,
      'Monto Bruto': op.montoBruto,
      'Ganancia USDT': op.gananciaNetaUsdt,
      'Ganancia Fiat': op.gananciaNeta
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operaciones");
    XLSX.writeFile(wb, `Reporte_P2P_${new Date().getTime()}.xlsx`);
  };

  const handleExportWhatsapp = () => {
    if (!report) return;
    
    let text = `*Reporte de Arbitraje P2P*\n\n`;
    text += `*Monto Bruto Operado:* ${formatCurrency(report.totalMontoBruto)}\n`;
    text += `*Ganancia Neta Total:* ${formatCurrency(report.totalGananciaNeta)}\n\n`;
    
    text += `*Desglose por Moneda:*\n`;
    report.porMoneda.forEach(m => {
      text += `• ${m.moneda}: Bruto ${m.montoBruto.toFixed(2)} | Neta ${m.gananciaNeta.toFixed(2)}\n`;
    });
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground mt-1">Exporta y analiza tus operaciones.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleExportWhatsapp}
            disabled={!report || report.operaciones.length === 0}
            className="bg-[#25D366] hover:bg-[#1ebd5c] text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <MessageCircle className="w-5 h-5" /> WhatsApp
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={!report || report.operaciones.length === 0}
            className="bg-[#107c41] hover:bg-[#0e6b38] text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-5 h-5" /> Excel
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Moneda</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary">
            <option value="">Todas</option>
            <option value="VES">VES</option>
            <option value="COP">COP</option>
            <option value="PAB">PAB</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground"><Search className="w-8 h-8 mx-auto mb-3 animate-pulse" /> Generando reporte...</div>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground mb-1">Monto Bruto Total</p>
              <p className="text-2xl font-bold">{formatCurrency(report.totalMontoBruto)}</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-success">
              <p className="text-sm text-muted-foreground mb-1">Ganancia Neta (USDT)</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(report.totalGananciaNeta)}</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-secondary">
              <p className="text-sm text-muted-foreground mb-1">Total Operaciones</p>
              <p className="text-2xl font-bold">{report.operaciones.length}</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-border text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Moneda</th>
                    <th className="px-6 py-4 font-medium">Ruta</th>
                    <th className="px-6 py-4 font-medium">Bruto Operado</th>
                    <th className="px-6 py-4 font-medium">Ganancia (USDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.operaciones.map(op => (
                    <tr key={op.id} className="hover:bg-white/5">
                      <td className="px-6 py-3">{formatShortDate(op.fecha)}</td>
                      <td className="px-6 py-3 font-bold text-primary">{op.moneda}</td>
                      <td className="px-6 py-3">{op.plataformaOrigen} → {op.plataformaDestino}</td>
                      <td className="px-6 py-3">{formatCurrency(op.montoBruto, op.moneda)}</td>
                      <td className={`px-6 py-3 font-bold ${op.gananciaNetaUsdt >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(op.gananciaNetaUsdt)}
                      </td>
                    </tr>
                  ))}
                  {report.operaciones.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No hay datos en este rango.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
