import React, { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateOperation, useGetPaymentMethods } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Calculator, ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const operationSchema = z.object({
  fecha: z.string().min(1, "Requerido"),
  moneda: z.enum(["PAB", "USD", "VES", "COP"]),
  tasaDeCambio: z.coerce.number().min(0.000001, "Tasa inválida"),
  plataformaOrigen: z.string().min(1, "Requerido"),
  plataformaDestino: z.string().min(1, "Requerido"),
  montoBruto: z.coerce.number().min(0, "Monto inválido"),
  comisionBanco: z.coerce.number().min(0).default(0),
  comisionBinance: z.coerce.number().min(0).default(0),
  comisionServidor: z.coerce.number().min(0).default(0),
  comisionServidorEnUsdt: z.boolean().default(false),
  notas: z.string().optional(),
});

type OperationFormType = z.infer<typeof operationSchema>;

export default function OperationForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateOperation();
  const { data: platforms } = useGetPaymentMethods();
  
  const { register, handleSubmit, control, formState: { errors } } = useForm<OperationFormType>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 16), // YYYY-MM-DDThh:mm
      moneda: "VES",
      tasaDeCambio: 1,
      montoBruto: 0,
      comisionBanco: 0,
      comisionBinance: 0,
      comisionServidor: 0,
      comisionServidorEnUsdt: false,
    }
  });

  const formValues = useWatch({ control });
  
  // Real-time calculations
  const [netUsdt, setNetUsdt] = useState(0);
  const [netFiat, setNetFiat] = useState(0);

  useEffect(() => {
    const tasa = Number(formValues.tasaDeCambio) || 1;
    const bruto = Number(formValues.montoBruto) || 0;
    const comBanco = Number(formValues.comisionBanco) || 0;
    const comBin = Number(formValues.comisionBinance) || 0;
    const comServ = Number(formValues.comisionServidor) || 0;
    const servUsdt = formValues.comisionServidorEnUsdt;

    const comBancoUsdt = tasa > 0 ? comBanco / tasa : 0;
    const comServidorUsdt = servUsdt ? comServ : (tasa > 0 ? comServ / tasa : 0);
    const totalCom = comBancoUsdt + comBin + comServidorUsdt;
    
    const spreadUsdt = tasa > 0 ? bruto / tasa : 0;
    const net = spreadUsdt - totalCom;
    
    setNetUsdt(net);
    setNetFiat(net * tasa);
  }, [formValues]);

  const onSubmit = async (data: OperationFormType) => {
    try {
      await createMutation.mutateAsync({ data: {
        ...data,
        fecha: new Date(data.fecha).toISOString()
      }});
    } catch (e) {
      console.error(e);
      alert("Error al guardar la operación. Por favor intenta de nuevo.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    setLocation("/operaciones");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/operaciones" className="p-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Nueva Operación</h1>
          <p className="text-muted-foreground">Registra los detalles del arbitraje P2P</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha y Hora</label>
                <input type="datetime-local" {...register("fecha")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary" />
                {errors.fecha && <p className="text-danger text-xs mt-1">{errors.fecha.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Moneda Fiat</label>
                <select {...register("moneda")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary appearance-none">
                  <option value="VES">VES (Bolívares)</option>
                  <option value="COP">COP (Pesos Col)</option>
                  <option value="PAB">PAB (Balboas/USD)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Plataforma Origen</label>
                <select {...register("plataformaOrigen")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary appearance-none">
                  <option value="">Seleccione...</option>
                  {platforms?.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="Binance">Binance</option>
                  <option value="Zinli">Zinli</option>
                </select>
                {errors.plataformaOrigen && <p className="text-danger text-xs mt-1">{errors.plataformaOrigen.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Plataforma Destino</label>
                <select {...register("plataformaDestino")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary appearance-none">
                  <option value="">Seleccione...</option>
                  {platforms?.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="Binance">Binance</option>
                  <option value="Zinli">Zinli</option>
                </select>
                {errors.plataformaDestino && <p className="text-danger text-xs mt-1">{errors.plataformaDestino.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Monto Bruto Operado</label>
                <input type="number" step="any" {...register("montoBruto")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Tasa de Cambio (1 USDT = ? Fiat)</label>
                <input type="number" step="any" {...register("tasaDeCambio")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary" placeholder="Ej: 36.5" />
              </div>
            </div>

            <hr className="border-border" />

            <h3 className="text-lg font-semibold text-foreground">Comisiones</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Comisión Banco (Fiat)</label>
                <input type="number" step="any" {...register("comisionBanco")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Com. Binance (USDT)</label>
                <input type="number" step="any" {...register("comisionBinance")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 flex justify-between">
                  Comisión Servidor
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("comisionServidorEnUsdt")} className="rounded text-primary focus:ring-primary bg-black/20 border-white/10" />
                    <span className="text-xs text-primary">En USDT</span>
                  </label>
                </label>
                <input type="number" step="any" {...register("comisionServidor")} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>

            <hr className="border-border" />
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Notas</label>
              <textarea {...register("notas")} rows={2} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary resize-none" placeholder="Opcional..."></textarea>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl sticky top-24">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-primary" /> Resultado
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-muted-foreground">Spread (USDT)</span>
                <span className="font-medium text-foreground">{formatCurrency((Number(formValues.montoBruto) || 0) / (Number(formValues.tasaDeCambio) || 1))}</span>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Ganancia Neta USDT</p>
                <p className={`text-3xl font-display font-bold ${netUsdt >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(netUsdt)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Ganancia Neta Fiat</p>
                <p className={`text-xl font-medium ${netFiat >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(netFiat, formValues.moneda || 'VES')}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,165,255,0.3)] hover:shadow-[0_0_25px_rgba(0,165,255,0.5)] transition-all flex justify-center items-center gap-2 mt-8"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-5 h-5" /> Registrar Operación</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
