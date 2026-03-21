import React, { useState } from "react";
import { useGetOperations, useDeleteOperation, useCerrarCiclo } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, FileText, ArrowRight, CheckCircle2, Clock, X, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isDanger?: boolean;
}

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Confirmar", isDanger = false }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl mx-4">
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-2 rounded-xl shrink-0 ${isDanger ? "bg-danger/10" : "bg-primary/10"}`}>
            <AlertTriangle className={`w-6 h-6 ${isDanger ? "text-danger" : "text-primary"}`} />
          </div>
          <p className="text-foreground leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white font-medium transition-colors text-sm ${isDanger ? "bg-danger hover:bg-danger/80" : "bg-primary hover:bg-primary/80"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CerrarCicloModalProps {
  operationId: number;
  montoBruto: number;
  onConfirm: (montoFinal: number) => void;
  onCancel: () => void;
  isPending: boolean;
}

function CerrarCicloModal({ operationId, montoBruto, onConfirm, onCancel, isPending }: CerrarCicloModalProps) {
  const [montoFinal, setMontoFinal] = useState(montoBruto);
  const ganancia = montoFinal - montoBruto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-success" /> Cerrar Ciclo
          </h3>
          <button onClick={onCancel} className="p-2 text-muted-foreground hover:text-foreground rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-muted-foreground text-sm mb-4">
          Ingresa el monto final de USDT recibido tras recomprar en el mercado.
        </p>

        <div className="bg-white/5 rounded-xl p-4 mb-4 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Monto Bruto Inicial</span>
            <span className="font-medium">{formatCurrency(montoBruto)} USDT</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Monto Final Recibido</span>
            <span className="font-medium text-foreground">{formatCurrency(montoFinal)} USDT</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/10">
            <span className="font-medium">Ganancia Real USDT</span>
            <span className={`font-bold text-lg ${ganancia >= 0 ? "text-success" : "text-danger"}`}>
              {ganancia >= 0 ? "+" : ""}{formatCurrency(ganancia)} USDT
            </span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Monto Final USDT Recibido
          </label>
          <input
            type="number"
            step="any"
            value={montoFinal}
            onChange={(e) => setMontoFinal(parseFloat(e.target.value) || 0)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-foreground text-lg focus:outline-none focus:border-primary"
            placeholder="Ej: 108.50"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(montoFinal)}
            disabled={isPending || montoFinal <= 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-success text-white font-bold hover:bg-success/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Cerrar Ciclo
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OperationsList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: operations, isLoading } = useGetOperations();
  const deleteMutation = useDeleteOperation();
  const cerrarCicloMutation = useCerrarCiclo();

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [cerrarCicloId, setCerrarCicloId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    setDeleteConfirm(null);
  };

  const handleCerrarCiclo = async (montoFinal: number) => {
    if (!cerrarCicloId) return;
    await cerrarCicloMutation.mutateAsync({ id: cerrarCicloId, data: { montoFinalUsdt: montoFinal } });
    queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    setCerrarCicloId(null);
  };

  const opToClose = operations?.find((o) => o.id === cerrarCicloId);

  return (
    <div className="space-y-6">
      {deleteConfirm !== null && (
        <ConfirmModal
          message="¿Estás seguro de eliminar esta operación? Esta acción no se puede deshacer."
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          confirmLabel="Eliminar"
          isDanger
        />
      )}

      {cerrarCicloId !== null && opToClose && (
        <CerrarCicloModal
          operationId={cerrarCicloId}
          montoBruto={Number(opToClose.montoBruto)}
          onConfirm={handleCerrarCiclo}
          onCancel={() => setCerrarCicloId(null)}
          isPending={cerrarCicloMutation.isPending}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Operaciones</h1>
          <p className="text-muted-foreground mt-1">Gestiona el registro de tus arbitrajes.</p>
        </div>
        <Link href="/operaciones/nueva" className="block">
          <div className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,165,255,0.3)] hover:shadow-[0_0_20px_rgba(0,165,255,0.5)]">
            <Plus className="w-5 h-5" /> Nueva Operación
          </div>
        </Link>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground">Ruta</th>
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground">Bruto</th>
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground">G. Proyectada</th>
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground">G. Real</th>
                <th className="px-4 py-4 text-sm font-medium text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : operations?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No hay operaciones registradas.
                  </td>
                </tr>
              ) : (
                operations?.map((op) => {
                  const isCerrada = (op as any).statusCiclo === "cerrada";
                  const gananciaReal = (op as any).gananciaRealUsdt;
                  return (
                    <tr key={op.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setLocation(`/operaciones/${op.id}`)}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          {isCerrada ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                              <CheckCircle2 className="w-3 h-3" /> Cerrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                              <Clock className="w-3 h-3" /> Abierta
                            </span>
                          )}
                          {(op as any).receipts && (op as any).receipts.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 w-fit">
                              <ImageIcon className="w-3 h-3" /> {(op as any).receipts.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">{formatDate(String(op.fecha))}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{op.plataformaOrigen}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          {(op as any).plataformaIntermediaria && (
                            <>
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{(op as any).plataformaIntermediaria}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            </>
                          )}
                          <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{op.plataformaDestino}</span>
                          <span className="font-bold text-primary ml-1">{op.moneda}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-medium text-sm">
                        {formatCurrency(op.montoBruto)} USDT
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`font-medium text-sm ${op.gananciaNetaUsdt >= 0 ? "text-success/70" : "text-danger"}`}>
                          {op.gananciaNetaUsdt >= 0 ? "+" : ""}{formatCurrency(op.gananciaNetaUsdt)} USDT
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isCerrada && gananciaReal != null ? (
                          <span className={`font-bold text-sm ${gananciaReal >= 0 ? "text-success" : "text-danger"}`}>
                            {gananciaReal >= 0 ? "+" : ""}{formatCurrency(gananciaReal)} USDT
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isCerrada && (
                            <button
                              onClick={() => setCerrarCicloId(op.id)}
                              className="px-2.5 py-1.5 text-xs bg-success/10 text-success hover:bg-success hover:text-white rounded-lg transition-colors flex items-center gap-1 font-medium"
                              title="Cerrar Ciclo"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Cerrar
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(op.id)}
                            className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
