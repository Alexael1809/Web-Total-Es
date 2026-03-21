import { Router } from "express";
import { db } from "@workspace/db";
import { operationsTable, receiptsTable } from "@workspace/db/schema";
import { and, gte, lte, eq, desc } from "drizzle-orm";
import { GetOperationsReportQueryParams } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/operations", authenticate, async (req, res) => {
  const parsed = GetOperationsReportQueryParams.safeParse(req.query);
  const { startDate, endDate, currency } = parsed.success ? parsed.data : {};

  const conditions = [];
  if (startDate) conditions.push(gte(operationsTable.fecha, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(operationsTable.fecha, end));
  }
  if (currency) conditions.push(eq(operationsTable.moneda, currency as any));
  if (req.user?.role === "socio") {
    conditions.push(eq(operationsTable.userId, req.user.userId));
  }

  const ops = await db.select().from(operationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(operationsTable.fecha));

  const withReceipts = await Promise.all(
    ops.map(async (op) => {
      const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.operationId, op.id));
      return {
        ...op,
        tasaDeCambio: parseFloat(op.tasaDeCambio as any),
        montoBruto: parseFloat(op.montoBruto as any),
        comisionBanco: parseFloat(op.comisionBanco as any),
        comisionBinance: parseFloat(op.comisionBinance as any),
        comisionServidor: parseFloat(op.comisionServidor as any),
        gananciaNeta: parseFloat(op.gananciaNeta as any),
        gananciaNetaUsdt: parseFloat(op.gananciaNetaUsdt as any),
        receipts,
      };
    })
  );

  const currencyMap: Record<string, { montoBruto: number; cantidadRecibida: number; gananciaNeta: number; operaciones: any[] }> = {};
  let totalMontoBruto = 0;
  let totalCantidadRecibida = 0;
  let totalGananciaNeta = 0;

  for (const op of withReceipts) {
    const key = op.moneda;
    if (!currencyMap[key]) {
      currencyMap[key] = { montoBruto: 0, cantidadRecibida: 0, gananciaNeta: 0, operaciones: [] };
    }
    currencyMap[key].montoBruto += op.montoBruto;
    const cantidadRecibida = op.montoBruto + op.gananciaNeta;
    currencyMap[key].cantidadRecibida += cantidadRecibida;
    currencyMap[key].gananciaNeta += op.gananciaNeta;
    currencyMap[key].operaciones.push(op);

    totalMontoBruto += op.montoBruto;
    totalCantidadRecibida += cantidadRecibida;
    totalGananciaNeta += op.gananciaNeta;
  }

  const porMoneda = Object.entries(currencyMap).map(([moneda, data]) => ({
    moneda,
    ...data,
  }));

  res.json({
    totalMontoBruto,
    totalCantidadRecibida,
    totalGananciaNeta,
    porMoneda,
    operaciones: withReceipts,
  });
});

export default router;
