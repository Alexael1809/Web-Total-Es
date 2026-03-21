import React, { useState } from "react";
import { useCalculateDistribution, useSaveDistributionReport, useGetDistributionReports } from "@workspace/api-client-react";
import { Plus, Trash2, Calculator, Save, Download, CheckCircle2, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

export default function Distribution() {
  const queryClient = useQueryClient();
  const calculateMutation = useCalculateDistribution();
  const saveMutation = useSaveDistributionReport();
  const { data: reports } = useGetDistributionReports();

  const [gananciaNeta, setGananciaNeta] = useState(0);
  const [porcentajeOperador, setPorcentajeOperador] = useState(30);
  const [participantes, setParticipantes] = useState([
    { id: 1, nombre: "Operador", capital: 1000, esOperador: true },
    { id: 2, nombre: "Socio 1", capital: 5000, esOperador: false },
  ]);

  const [resultado, setResultado] = useState<any>(null);

  const handleCalculate = async () => {
    try {
      const res = await calculateMutation.mutateAsync({
        data: {
          gananciaNeta,
          porcentajeOperador,
          participantes: participantes.map((p) => ({
            nombre: p.nombre,
            capital: p.capital,
            esOperador: p.esOperador,
          })),
        },
      });
      setResultado(res);
    } catch (e) {
      alert("Error al calcular distribución");
    }
  };

  const handleSave = async () => {
    if (!resultado) return;
    const titulo = prompt("Título del reporte:");
    if (!titulo) return;

    try {
      await saveMutation.mutateAsync({ data: { titulo, resultado } });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/reports"] });
      alert("Reporte guardado con éxito");
    } catch (e) {
      alert("Error al guardar el reporte");
    }
  };

  const handleDownloadExcel = (report: any) => {
    const r = report.resultado;
    const rows = r.distribuciones.map((d: any) => ({
      Socio: d.nombre,
      Rol: d.esOperador ? "Operador" : "Socio",
      "Capital ($)": d.capital,
      "Porcentaje (%)": d.porcentaje.toFixed(2),
      "Ganancia por Capital ($)": d.gananciaCapital.toFixed(4),
      "Fee Extra ($)": d.feeExtra.toFixed(4),
      "Total a Recibir ($)": d.totalRecibe.toFixed(4),
    }));

    const summary = [
      { Campo: "Título", Valor: report.titulo },
      { Campo: "Ganancia a Repartir ($)", Valor: r.gananciaNeta },
      { Campo: "Pool Total de Capital ($)", Valor: r.poolTotal },
      { Campo: "Fee Operador ($)", Valor: r.feeOperador },
      { Campo: "Fondo Restante ($)", Valor: r.fondoRestante },
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    const wsDistrib = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsDistrib, "Distribución");
    XLSX.writeFile(wb, `Distribucion_${report.titulo.replace(/\s+/g, "_")}_${report.id}.xlsx`);
  };

  const handleShareWhatsapp = (report: any) => {
    const r = report.resultado;
    let text = `*Distribución de Capitales — ${report.titulo}*\n\n`;
    text += `*Ganancia a repartir:* ${formatCurrency(r.gananciaNeta)}\n`;
    text += `*Pool total de capital:* ${formatCurrency(r.poolTotal)}\n`;
    text += `*Fee del operador:* ${formatCurrency(r.feeOperador)}\n`;
    text += `*Fondo distribuible:* ${formatCurrency(r.fondoRestante)}\n\n`;
    text += `*Distribución por socio:*\n`;
    r.distribuciones.forEach((d: any) => {
      text += `• ${d.nombre}${d.esOperador ? " (OP)" : ""}: *${formatCurrency(d.totalRecibe)}* (${d.porcentaje.toFixed(1)}%)\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Distribución de Capitales</h1>
        <p className="text-muted-foreground mt-1">Calculadora para repartir ganancias entre socios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Ganancia a Repartir ($)
                </label>
                <input
                  type="number"
                  value={gananciaNeta || ""}
                  onChange={(e) => setGananciaNeta(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  % Fee Operador
                </label>
                <input
                  type="number"
                  value={porcentajeOperador || ""}
                  onChange={(e) => setPorcentajeOperador(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:border-primary"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-foreground">Participantes</label>
                <button
                  onClick={() =>
                    setParticipantes([
                      ...participantes,
                      { id: Date.now(), nombre: "", capital: 0, esOperador: false },
                    ])
                  }
                  className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
                >
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              </div>

              <div className="space-y-3">
                {participantes.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5"
                  >
                    <input
                      type="text"
                      value={p.nombre}
                      onChange={(e) => {
                        const newP = [...participantes];
                        newP[idx] = { ...newP[idx], nombre: e.target.value };
                        setParticipantes(newP);
                      }}
                      placeholder="Nombre"
                      className="w-1/2 bg-transparent border-none focus:ring-0 text-sm px-2"
                    />
                    <input
                      type="number"
                      value={p.capital || ""}
                      onChange={(e) => {
                        const newP = [...participantes];
                        newP[idx] = { ...newP[idx], capital: Number(e.target.value) };
                        setParticipantes(newP);
                      }}
                      placeholder="Capital"
                      className="w-1/3 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <label className="flex items-center justify-center w-8" title="Es Operador">
                      <input
                        type="checkbox"
                        checked={p.esOperador}
                        onChange={(e) => {
                          const newP = [...participantes];
                          newP[idx] = { ...newP[idx], esOperador: e.target.checked };
                          setParticipantes(newP);
                        }}
                        className="rounded text-primary focus:ring-primary bg-black/20 border-white/10"
                      />
                    </label>
                    <button
                      onClick={() => setParticipantes(participantes.filter((_, i) => i !== idx))}
                      className="p-1.5 text-muted-foreground hover:text-danger rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCalculate}
              disabled={calculateMutation.isPending || gananciaNeta <= 0 || participantes.length === 0}
              className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Calculator className="w-5 h-5" /> Calcular Distribución
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {resultado ? (
            <div className="glass-panel p-6 rounded-2xl border-primary/20 shadow-[0_0_30px_rgba(0,165,255,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-success" /> Resultados
                </h3>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-primary/20 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Pool Total</p>
                  <p className="font-bold text-lg">{formatCurrency(resultado.poolTotal)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Fondo Restante</p>
                  <p className="font-bold text-lg">{formatCurrency(resultado.fondoRestante)}</p>
                </div>
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                  <p className="text-xs text-primary mb-1">Fee Total Operador</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(resultado.feeOperador)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-3 font-medium">Socio</th>
                      <th className="pb-3 font-medium">Capital</th>
                      <th className="pb-3 font-medium">%</th>
                      <th className="pb-3 font-medium text-right text-success">Total a Recibir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {resultado.distribuciones.map((d: any, idx: number) => (
                      <tr key={idx} className={d.esOperador ? "bg-primary/5" : ""}>
                        <td className="py-3 flex items-center gap-2">
                          <span className="font-medium">{d.nombre}</span>
                          {d.esOperador && (
                            <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-sm">
                              OP
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{formatCurrency(d.capital)}</td>
                        <td className="py-3 text-muted-foreground">{d.porcentaje.toFixed(2)}%</td>
                        <td className="py-3 text-right font-bold text-success">
                          {formatCurrency(d.totalRecibe)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-2 h-full min-h-[200px]">
              <Calculator className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Ingresa los datos y presiona calcular para ver los resultados.
              </p>
            </div>
          )}

          {reports && reports.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-semibold text-lg mb-4">Reportes Guardados</h3>
              <div className="space-y-3">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{r.titulo}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(String(r.createdAt))}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <button
                        onClick={() => handleShareWhatsapp(r)}
                        title="Compartir por WhatsApp"
                        className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadExcel(r)}
                        title="Descargar Excel"
                        className="p-2 bg-[#107c41]/10 text-[#107c41] hover:bg-[#107c41] hover:text-white rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
