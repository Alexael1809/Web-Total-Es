import React from "react";
import { useGetOperations, useDeleteOperation } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Trash2, Edit2, FileText, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function OperationsList() {
  const queryClient = useQueryClient();
  const { data: operations, isLoading } = useGetOperations();
  const deleteMutation = useDeleteOperation();

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta operación?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    }
  };

  return (
    <div className="space-y-6">
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">Fecha</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">Ruta</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">Monto Bruto</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground">Ganancia Neta</th>
                <th className="px-6 py-4 text-sm font-medium text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Cargando operaciones...</td>
                </tr>
              ) : operations?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No hay operaciones registradas.
                  </td>
                </tr>
              ) : (
                operations?.map((op) => (
                  <tr key={op.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(op.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">{op.plataformaOrigen}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">{op.plataformaDestino}</span>
                        <span className="font-bold text-primary ml-1">{op.moneda}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatCurrency(op.montoBruto, op.moneda)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`font-bold ${op.gananciaNetaUsdt >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(op.gananciaNetaUsdt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(op.gananciaNeta, op.moneda)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDelete(op.id)}
                          className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
