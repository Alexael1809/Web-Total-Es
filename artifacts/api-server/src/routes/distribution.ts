import { Router } from "express";
import { db } from "@workspace/db";
import { distributionReportsTable } from "@workspace/db/schema";
import { CalculateDistributionBody, SaveDistributionReportBody } from "@workspace/api-zod";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/calculate", authenticate, requireAdmin, async (req, res) => {
  const parsed = CalculateDistributionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos" });
    return;
  }
  const { gananciaNeta, porcentajeOperador, participantes } = parsed.data;

  const feeOperador = gananciaNeta * (porcentajeOperador / 100);
  const fondoRestante = gananciaNeta - feeOperador;
  const poolTotal = participantes.reduce((sum, p) => sum + p.capital, 0);

  const distribuciones = participantes.map((p) => {
    const porcentaje = poolTotal > 0 ? (p.capital / poolTotal) * 100 : 0;
    const gananciaCapital = poolTotal > 0 ? (p.capital / poolTotal) * fondoRestante : 0;
    const feeExtra = p.esOperador ? feeOperador : 0;
    const totalRecibe = gananciaCapital + feeExtra;
    return {
      nombre: p.nombre,
      capital: p.capital,
      esOperador: p.esOperador,
      porcentaje,
      gananciaCapital,
      feeExtra,
      totalRecibe,
    };
  });

  res.json({ gananciaNeta, feeOperador, fondoRestante, poolTotal, distribuciones });
});

router.get("/reports", authenticate, async (_req, res) => {
  const reports = await db.select().from(distributionReportsTable).orderBy(distributionReportsTable.createdAt);
  res.json(reports);
});

router.post("/reports", authenticate, requireAdmin, async (req, res) => {
  const parsed = SaveDistributionReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos" });
    return;
  }
  const [report] = await db.insert(distributionReportsTable).values({
    titulo: parsed.data.titulo,
    resultado: parsed.data.resultado,
  }).returning();
  res.status(201).json(report);
});

router.delete("/reports/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(distributionReportsTable).where(eq(distributionReportsTable.id, id));
  res.json({ success: true, message: "Reporte eliminado" });
});

export default router;
