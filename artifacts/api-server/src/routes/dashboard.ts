import { Router } from "express";
import { db } from "@workspace/db";
import { operationsTable } from "@workspace/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/summary", authenticate, async (req, res) => {
  const dateStr = req.query.date as string | undefined;
  const period = req.query.period as string | undefined; // 'today' | 'week' | 'month' | 'all'

  const conditions: any[] = [];

  // Determine date range
  if (period === "all" || (!period && !dateStr)) {
    // No date filter — return all operations
  } else if (period === "week") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(operationsTable.fecha, start), lte(operationsTable.fecha, end));
  } else if (period === "month") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(operationsTable.fecha, start), lte(operationsTable.fecha, end));
  } else if (period === "today" || dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(operationsTable.fecha, start), lte(operationsTable.fecha, end));
  }

  if (req.user?.role === "socio") {
    conditions.push(eq(operationsTable.userId, req.user.userId));
  }

  const ops = await db
    .select()
    .from(operationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const gananciasNetas: Record<string, number> = { PAB: 0, USD: 0, VES: 0, COP: 0 };
  const comisionesTotales = { banco: 0, binance: 0, servidor: 0 };
  let gananciasTotalesUsdt = 0;
  let gananciaRealUsdt = 0;
  let montoBrutoTotal = 0;
  let operacionesAbiertas = 0;
  let operacionesCerradas = 0;

  const plataformaMap: Record<string, { volumen: number; operaciones: number }> = {};

  let masRentable: any = null;
  let masLarga: any = null;

  for (const op of ops) {
    const gn = parseFloat(op.gananciaNeta as any);
    const gnUsdt = parseFloat(op.gananciaNetaUsdt as any);
    const mb = parseFloat(op.montoBruto as any);
    const cb = parseFloat(op.comisionBanco as any);
    const cbin = parseFloat(op.comisionBinance as any);
    const cs = parseFloat(op.comisionServidor as any);

    gananciasNetas[op.moneda] = (gananciasNetas[op.moneda] || 0) + gn;
    gananciasTotalesUsdt += gnUsdt;
    montoBrutoTotal += mb;
    comisionesTotales.banco += cb;
    comisionesTotales.binance += cbin;
    comisionesTotales.servidor += cs;

    if (op.statusCiclo === "abierta") {
      operacionesAbiertas += 1;
    } else {
      operacionesCerradas += 1;
      if (op.gananciaRealUsdt != null) {
        gananciaRealUsdt += parseFloat(op.gananciaRealUsdt as any);
      }
    }

    if (!plataformaMap[op.plataformaOrigen]) {
      plataformaMap[op.plataformaOrigen] = { volumen: 0, operaciones: 0 };
    }
    plataformaMap[op.plataformaOrigen].volumen += mb;
    plataformaMap[op.plataformaOrigen].operaciones += 1;

    if (!masRentable || gnUsdt > parseFloat(masRentable.gananciaNetaUsdt)) {
      masRentable = op;
    }
    if (!masLarga || new Date(op.fecha).getTime() > new Date(masLarga.fecha).getTime()) {
      masLarga = op;
    }
  }

  const volumenPorPlataforma = Object.entries(plataformaMap)
    .map(([plataforma, data]) => ({ plataforma, ...data }))
    .sort((a, b) => b.volumen - a.volumen);

  const formatOp = (op: any) =>
    op
      ? {
          ...op,
          tasaDeCambio: parseFloat(op.tasaDeCambio),
          montoBruto: parseFloat(op.montoBruto),
          comisionBanco: parseFloat(op.comisionBanco),
          comisionBinance: parseFloat(op.comisionBinance),
          comisionServidor: parseFloat(op.comisionServidor),
          gananciaNeta: parseFloat(op.gananciaNeta),
          gananciaNetaUsdt: parseFloat(op.gananciaNetaUsdt),
          montoFinalUsdt:
            op.montoFinalUsdt != null ? parseFloat(op.montoFinalUsdt) : null,
          gananciaRealUsdt:
            op.gananciaRealUsdt != null ? parseFloat(op.gananciaRealUsdt) : null,
          receipts: [],
        }
      : null;

  res.json({
    gananciasNetas,
    gananciasTotalesUsdt,
    gananciaRealUsdt,
    comisionesTotales,
    operacionMasRentable: formatOp(masRentable),
    operacionMasLarga: formatOp(masLarga),
    volumenPorPlataforma,
    totalOperaciones: ops.length,
    operacionesAbiertas,
    operacionesCerradas,
    montoBrutoTotal,
  });
});

export default router;
