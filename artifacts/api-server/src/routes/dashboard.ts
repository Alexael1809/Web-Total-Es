import { Router } from "express";
import { db } from "@workspace/db";
import { operationsTable } from "@workspace/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/summary", authenticate, async (req, res) => {
  const dateStr = req.query.date as string | undefined;
  let start: Date;
  let end: Date;

  if (dateStr) {
    start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  const conditions = [gte(operationsTable.fecha, start), lte(operationsTable.fecha, end)];
  if (req.user?.role === "socio") {
    conditions.push(eq(operationsTable.userId, req.user.userId));
  }

  const ops = await db.select().from(operationsTable).where(and(...conditions));

  const gananciasNetas = { PAB: 0, USD: 0, VES: 0, COP: 0 };
  const comisionesTotales = { banco: 0, binance: 0, servidor: 0 };
  let gananciasTotalesUsdt = 0;
  let montoBrutoTotal = 0;

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

    gananciasNetas[op.moneda as keyof typeof gananciasNetas] += gn;
    gananciasTotalesUsdt += gnUsdt;
    montoBrutoTotal += mb;
    comisionesTotales.banco += cb;
    comisionesTotales.binance += cbin;
    comisionesTotales.servidor += cs;

    const plataforma = `${op.plataformaOrigen}→${op.plataformaDestino}`;
    if (!plataformaMap[op.plataformaOrigen]) {
      plataformaMap[op.plataformaOrigen] = { volumen: 0, operaciones: 0 };
    }
    plataformaMap[op.plataformaOrigen].volumen += mb;
    plataformaMap[op.plataformaOrigen].operaciones += 1;

    if (!masRentable || gnUsdt > parseFloat(masRentable.gananciaNetaUsdt)) {
      masRentable = op;
    }
    if (!masLarga || new Date(op.createdAt).getTime() - new Date(op.fecha).getTime() > new Date(masLarga.createdAt).getTime() - new Date(masLarga.fecha).getTime()) {
      masLarga = op;
    }
  }

  const volumenPorPlataforma = Object.entries(plataformaMap).map(([plataforma, data]) => ({
    plataforma,
    ...data,
  }));

  const formatOp = (op: any) => op ? {
    ...op,
    tasaDeCambio: parseFloat(op.tasaDeCambio),
    montoBruto: parseFloat(op.montoBruto),
    comisionBanco: parseFloat(op.comisionBanco),
    comisionBinance: parseFloat(op.comisionBinance),
    comisionServidor: parseFloat(op.comisionServidor),
    gananciaNeta: parseFloat(op.gananciaNeta),
    gananciaNetaUsdt: parseFloat(op.gananciaNetaUsdt),
    receipts: [],
  } : null;

  res.json({
    gananciasNetas,
    gananciasTotalesUsdt,
    comisionesTotales,
    operacionMasRentable: formatOp(masRentable),
    operacionMasLarga: formatOp(masLarga),
    volumenPorPlataforma,
    totalOperaciones: ops.length,
    montoBrutoTotal,
  });
});

export default router;
