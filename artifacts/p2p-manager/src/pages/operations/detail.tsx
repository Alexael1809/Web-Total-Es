import React, { useRef, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetOperations, useUploadReceipt, useDeleteReceipt } from "@workspace/api-client-react";
import { ArrowLeft, Upload, Trash2, Download, Send, ReceiptText, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function OperationDetail() {
  const [, params] = useRoute("/operaciones/:id");
  const [, setLocation] = useLocation();
  const operationId = params?.id ? parseInt(params.id) : null;
  const queryClient = useQueryClient();

  const { data: operations } = useGetOperations();
  const uploadMutation = useUploadReceipt();
  const deleteMutation = useDeleteReceipt();

  const [uploadType, setUploadType] = useState<"enviado" | "recibido">("enviado");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const operation = operations?.find(op => op.id === operationId);

  if (!operationId || !operation) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="text-muted-foreground mb-4">Operación no encontrada</p>
        <Link href="/operaciones" className="text-primary hover:underline">
          Volver a operaciones
        </Link>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !operationId) return;

    try {
      await uploadMutation.mutateAsync({
        operationId,
        file,
        type: uploadType,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert("Error al subir la captura");
    }
  };

  const handleDeleteReceipt = async (receiptId: number) => {
    if (!confirm("¿Eliminar esta captura?")) return;
    try {
      await deleteMutation.mutateAsync({ operationId, receiptId });
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
    } catch (err) {
      alert("Error al eliminar la captura");
    }
  };

  const receipts = operation.receipts || [];
  const enviados = receipts.filter(r => r.type === "enviado");
  const recibidos = receipts.filter(r => r.type === "recibido");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/operaciones" className="p-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Detalles de Operación</h1>
          <p className="text-muted-foreground">ID: {operationId} • {formatDate(operation.fecha)}</p>
        </div>
      </div>

      {/* Resumen de la operación */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Moneda</p>
            <p className="text-2xl font-bold text-foreground">{operation.moneda}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm mb-1">Monto Bruto (USDT)</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(operation.montoBruto)} USDT</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm mb-1">Tasa de Cambio</p>
            <p className="text-2xl font-bold text-primary">×{operation.tasaDeCambio.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm mb-1">Ganancia Neta Proyectada</p>
            <p className={`text-2xl font-bold ${operation.gananciaNetaUsdt >= 0 ? "text-success" : "text-danger"}`}>
              {formatCurrency(operation.gananciaNetaUsdt)} USDT
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground text-sm mb-1">Plataformas</p>
            <div className="flex items-center gap-2 text-foreground">
              <span className="font-medium">{operation.plataformaOrigen}</span>
              <span>→</span>
              {operation.plataformaIntermediaria && (
                <>
                  <span className="font-medium">{operation.plataformaIntermediaria}</span>
                  <span>→</span>
                </>
              )}
              <span className="font-medium">{operation.plataformaDestino}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notas */}
      {operation.notas && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-3">Notas</h3>
          <div className="bg-white/5 rounded-xl p-4 text-foreground whitespace-pre-wrap break-words">
            {operation.notas}
          </div>
        </div>
      )}

      {/* Capturas de Pago */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Capturas de Pago</h3>

        {/* Upload Section */}
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setUploadType("enviado")}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                uploadType === "enviado"
                  ? "bg-primary text-white"
                  : "bg-black/20 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="w-4 h-4" /> Enviado
            </button>
            <button
              onClick={() => setUploadType("recibido")}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                uploadType === "recibido"
                  ? "bg-primary text-white"
                  : "bg-black/20 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ReceiptText className="w-4 h-4" /> Recibido
            </button>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
              ) : (
                <><Upload className="w-4 h-4" /> Seleccionar imagen</>
              )}
            </button>
          </div>
        </div>

        {/* Enviados */}
        {enviados.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Enviados ({enviados.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {enviados.map(receipt => (
                <div key={receipt.id} className="relative group">
                  <img
                    src={receipt.url}
                    alt={`Enviado ${receipt.id}`}
                    className="w-full h-32 object-cover rounded-lg border border-white/10"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <a
                      href={receipt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-primary rounded-lg hover:bg-primary/80 transition-colors"
                      title="Descargar"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 bg-danger rounded-lg hover:bg-danger/80 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{formatDate(receipt.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recibidos */}
        {recibidos.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-success" /> Recibidos ({recibidos.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {recibidos.map(receipt => (
                <div key={receipt.id} className="relative group">
                  <img
                    src={receipt.url}
                    alt={`Recibido ${receipt.id}`}
                    className="w-full h-32 object-cover rounded-lg border border-white/10"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <a
                      href={receipt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-primary rounded-lg hover:bg-primary/80 transition-colors"
                      title="Descargar"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 bg-danger rounded-lg hover:bg-danger/80 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{formatDate(receipt.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {receipts.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No hay capturas aún. Sube tu primer comprobante.</p>
        )}
      </div>
    </div>
  );
}
