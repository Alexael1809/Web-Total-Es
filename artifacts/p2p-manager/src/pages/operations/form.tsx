import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateOperation, useGetPaymentMethods } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Calculator, ArrowLeft, Save, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const operationSchema = z.object({
  fecha: z.string().min(1, "Requerido"),
  moneda: z.enum(["PAB", "USD", "VES", "COP"]),
  tasaInput: z.coerce.number().min(0.000001, "Valor inválido"),
  tasaEnPorcentaje: z.boolean().default(false),
  plataformaOrigen: z.string().min(1, "Requerido"),
  plataformaIntermediaria: z.string().optional(),
  plataformaDestino: z.string().min(1, "Requerido"),
  montoBruto: z.coerce.number().min(0, "Monto inválido"),
  comisionBanco: z.coerce.number().min(0).default(0),
  comisionBinance: z.coerce.number().min(0).default(0),
  comisionServidor: z.coerce.number().min(0).default(0),
  notas: z.string().optional(),
});

type OperationFormType = z.infer<typeof operationSchema>;

export default function OperationForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateOperation();
  const { data: platforms } = useGetPaymentMethods();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OperationFormType>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 16),
      moneda: "VES",
      tasaInput: 1.08,
      tasaEnPorcentaje: false,
      montoBruto: 100,
      comisionBanco: 0,
      comisionBinance: 0,
      comisionServidor: 0,
      plataformaOrigen: "",
      plataformaIntermediaria: "",
      plataformaDestino: "",
    },
  });

  const formValues = watch();
  const tasaInput = Number(formValues.tasaInput) || 0;
  const esPorc = Boolean(formValues.tasaEnPorcentaje);
  const spreadMultiplier = esPorc ? 1 + tasaInput / 100 : tasaInput;
  const bruto = Number(formValues.montoBruto) || 0;
  const comBanco = Number(formValues.comisionBanco) || 0;
  const comBin = Number(formValues.comisionBinance) || 0;
  const comServ = Number(formValues.comisionServidor) || 0;
  const gananciaBruta = bruto * Math.max(spreadMultiplier - 1, 0);
  const netUsdt = gananciaBruta - comBanco - comBin - comServ;

  const onSubmit = async (data: OperationFormType) => {
    const mult = data.tasaEnPorcentaje ? 1 + data.tasaInput / 100 : data.tasaInput;
    try {
      await createMutation.mutateAsync({
        data: {
          fecha: new Date(data.fecha).toISOString(),
          moneda: data.moneda,
          tasaDeCambio: mult,
          plataformaOrigen: data.plataformaOrigen,
          plataformaIntermediaria: data.plataformaIntermediaria || undefined,
          plataformaDestino: data.plataformaDestino,
          montoBruto: data.montoBruto,
          comisionBanco: data.comisionBanco,
          comisionBinance: data.comisionBinance,
          comisionServidor: data.comisionServidor,
          comisionServidorEnUsdt: true,
          notas: data.notas,
        },
      });
    } catch (e) {
      console.error(e);
      alert("Error al guardar la operación. Por favor intenta de nuevo.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    setLocation("/operaciones");
  };

  const platformOptions = [
    ...(platforms?.map((p) => p.name) ?? []),
    "Binance",
    "Zinli",
    "Wise",
    "PayPal",
    "Pago Móvil",
  ].filter((v, i, arr) => arr.indexOf(v) === i);

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
          {/* Datos principales */}
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <h3 className="font-semibold text-foreground">Datos de la Operación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  {...register("fecha")}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
                {errors.fecha && <p className="text-danger text-xs mt-1">{errors.fecha.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Moneda Fiat</label>
                <select
                  {...register("moneda")}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary appearance-none"
                >
                  <option value="VES">VES (Bolívares)</option>
                  <option value="COP">COP (Pesos Col.)</option>
                  <option value="PAB">PAB (Balboas/USD)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Monto Bruto (USDT)</label>
                <input
                  type="number"
                  step="any"
                  {...register("montoBruto")}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="Ej: 100"
                />
              </div>

              {/* Tasa/Spread con toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    {esPorc ? "Spread %" : "Tasa Directa (×)"}
                  </label>
                  <div className="flex items-center bg-black/30 border border-white/10 rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setValue("tasaEnPorcentaje", false)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${!esPorc ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      ×Tasa
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("tasaEnPorcentaje", true)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${esPorc ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    {...register("tasaInput")}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-foreground focus:outline-none focus:border-primary"
                    placeholder={esPorc ? "Ej: 8" : "Ej: 1.080"}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {esPorc ? "%" : "×"}
                  </span>
                </div>
                {errors.tasaInput && <p className="text-danger text-xs mt-1">{errors.tasaInput.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  ={" "}×{spreadMultiplier.toFixed(6)} — spread {((spreadMultiplier - 1) * 100).toFixed(3)}%
                </p>
              </div>
            </div>

            {/* Flujo de Plataformas */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Flujo de Plataformas</h4>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">Origen</label>
                  <select
                    {...register("plataformaOrigen")}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary appearance-none text-sm"
                  >
                    <option value="">Seleccione...</option>
                    {platformOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.plataformaOrigen && <p className="text-danger text-xs mt-1">{errors.plataformaOrigen.message}</p>}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-7" />
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">Intermediaria (opcional)</label>
                  <select
                    {...register("plataformaIntermediaria")}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary appearance-none text-sm"
                  >
                    <option value="">— Ninguna —</option>
                    {platformOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-7" />
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">Destino</label>
                  <select
                    {...register("plataformaDestino")}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary appearance-none text-sm"
                  >
                    <option value="">Seleccione...</option>
                    {platformOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.plataformaDestino && <p className="text-danger text-xs mt-1">{errors.plataformaDestino.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Comisiones */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-semibold text-foreground">Comisiones (USDT)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Com. Banco</label>
                <input
                  type="number"
                  step="any"
                  {...register("comisionBanco")}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Com. Binance</label>
                <input
                  type="number"
                  step="any"
                  {...register("comisionBinance")}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Com. Servidor</label>
                <input
                  type="number"
                  step="any"
                  {...register("comisionServidor")}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Notas</label>
              <textarea
                {...register("notas")}
                rows={2}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary resize-none"
                placeholder="Opcional..."
              />
            </div>
          </div>
        </div>

        {/* Panel de resultados */}
        <div>
          <div className="glass-panel p-6 rounded-2xl sticky top-24 space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Proyección
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-muted-foreground text-sm">Monto Bruto</span>
                <span className="font-medium">{formatCurrency(bruto)} USDT</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-muted-foreground text-sm">Ganancia Bruta</span>
                <span className="font-medium">{formatCurrency(gananciaBruta)} USDT</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-muted-foreground text-sm">Total Comisiones</span>
                <span className="text-danger text-sm">-{formatCurrency(comBanco + comBin + comServ)} USDT</span>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl">
              <p className="text-sm font-medium text-muted-foreground mb-1">Ganancia Neta Proyectada</p>
              <p className={`text-3xl font-display font-bold ${netUsdt >= 0 ? "text-success" : "text-danger"}`}>
                {formatCurrency(netUsdt)} USDT
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Spread: {((spreadMultiplier - 1) * 100).toFixed(3)}%
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              La ganancia real se confirma al cerrar el ciclo
            </p>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,165,255,0.3)] hover:shadow-[0_0_25px_rgba(0,165,255,0.5)] transition-all flex justify-center items-center gap-2"
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
