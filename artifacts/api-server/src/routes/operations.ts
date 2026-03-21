import { Router } from "express";
import multer from "multer";
import path from "path";
import { db } from "@workspace/db";
import { operationsTable, receiptsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { GetOperationsQueryParams } from "@workspace/api-zod";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.js";
import fs from "fs";

const router = Router();

// New formula: tasa is the spread multiplier (e.g. 1.08 = 8% profit)
// montoBruto is in USDT; all commissions in USDT
const CreateOperationBody = z.object({
  fecha: z.string().min(1),
  moneda: z.string().min(1),
  tasaDeCambio: z.coerce.number().min(1, "Tasa inválida"),
  tasaCompra: z.coerce.number().optional(),
  tasaVenta: z.coerce.number().optional(),
  plataformaOrigen: z.string().min(1),
  plataformaIntermediaria: z.string().optional(),
  plataformaDestino: z.string().min(1),
  montoBruto: z.coerce.number().min(0),
  comisionBanco: z.coerce.number().min(0).default(0),
  comisionBinance: z.coerce.number().min(0).default(0),
  comisionServidor: z.coerce.number().min(0).default(0),
  comisionServidorEnUsdt: z.boolean().default(true),
  notas: z.string().optional(),
});

const CerrarCicloBody = z.object({
  montoFinalUsdt: z.coerce.number().min(0),
});

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// New calculation: tasa = spread multiplier (1.08 = 8% profit per USDT)
// All commissions are in USDT
function calculateNetProfit(
  montoBruto: number,
  tasa: number,
  comisionBanco: number,
  comisionBinance: number,
  comisionServidor: number
) {
  const spread = tasa - 1; // e.g. 1.08 - 1 = 0.08
  const gananciaBrutaUsdt = montoBruto * spread;
  const totalComisiones = comisionBanco + comisionBinance + comisionServidor;
  const gananciaNetaUsdt = gananciaBrutaUsdt - totalComisiones;
  const gananciaNeta = gananciaNetaUsdt; // stored as USDT equivalent
  return { gananciaNeta, gananciaNetaUsdt };
}

function formatOperation(op: any, receipts: any[]) {
  return {
    ...op,
    tasaDeCambio: parseFloat(op.tasaDeCambio),
    tasaCompra: op.tasaCompra != null ? parseFloat(op.tasaCompra) : null,
    tasaVenta: op.tasaVenta != null ? parseFloat(op.tasaVenta) : null,
    montoBruto: parseFloat(op.montoBruto),
    comisionBanco: parseFloat(op.comisionBanco),
    comisionBinance: parseFloat(op.comisionBinance),
    comisionServidor: parseFloat(op.comisionServidor),
    gananciaNeta: parseFloat(op.gananciaNeta),
    gananciaNetaUsdt: parseFloat(op.gananciaNetaUsdt),
    montoFinalUsdt: op.montoFinalUsdt != null ? parseFloat(op.montoFinalUsdt) : null,
    gananciaRealUsdt: op.gananciaRealUsdt != null ? parseFloat(op.gananciaRealUsdt) : null,
    receipts,
  };
}

router.get("/", authenticate, async (req, res) => {
  const parsed = GetOperationsQueryParams.safeParse(req.query);
  const { startDate, endDate, currency } = parsed.success ? parsed.data : {};

  const conditions = [];
  if (startDate) conditions.push(gte(operationsTable.fecha, new Date(startDate)));
  if (endDate) conditions.push(lte(operationsTable.fecha, new Date(endDate)));
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
      return formatOperation(op, receipts);
    })
  );

  res.json(withReceipts);
});

router.get("/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  const [op] = await db.select().from(operationsTable).where(eq(operationsTable.id, id));
  if (!op) {
    res.status(404).json({ error: "not_found", message: "Operación no encontrada" });
    return;
  }
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.operationId, id));
  res.json(formatOperation(op, receipts));
});

router.post("/", authenticate, async (req, res) => {
  const parsed = CreateOperationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const montoBruto = parseFloat(data.montoBruto as any);
  const tasaDeCambio = parseFloat(data.tasaDeCambio as any);
  const comisionBanco = parseFloat((data.comisionBanco ?? 0) as any);
  const comisionBinance = parseFloat((data.comisionBinance ?? 0) as any);
  const comisionServidor = parseFloat((data.comisionServidor ?? 0) as any);

  const { gananciaNeta, gananciaNetaUsdt } = calculateNetProfit(
    montoBruto, tasaDeCambio, comisionBanco, comisionBinance, comisionServidor
  );

  const [op] = await db.insert(operationsTable).values({
    userId: req.user!.userId,
    fecha: new Date(data.fecha),
    moneda: data.moneda,
    tasaDeCambio: tasaDeCambio.toString(),
    tasaCompra: data.tasaCompra != null ? data.tasaCompra.toString() : null,
    tasaVenta: data.tasaVenta != null ? data.tasaVenta.toString() : null,
    plataformaOrigen: data.plataformaOrigen,
    plataformaIntermediaria: data.plataformaIntermediaria || null,
    plataformaDestino: data.plataformaDestino,
    montoBruto: montoBruto.toString(),
    comisionBanco: comisionBanco.toString(),
    comisionBinance: comisionBinance.toString(),
    comisionServidor: comisionServidor.toString(),
    comisionServidorEnUsdt: data.comisionServidorEnUsdt,
    gananciaNeta: gananciaNeta.toString(),
    gananciaNetaUsdt: gananciaNetaUsdt.toString(),
    statusCiclo: "abierta",
    notas: data.notas,
  }).returning();

  res.status(201).json(formatOperation(op, []));
});

router.put("/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = CreateOperationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos" });
    return;
  }
  const data = parsed.data;
  const montoBruto = parseFloat(data.montoBruto as any);
  const tasaDeCambio = parseFloat(data.tasaDeCambio as any);
  const comisionBanco = parseFloat((data.comisionBanco ?? 0) as any);
  const comisionBinance = parseFloat((data.comisionBinance ?? 0) as any);
  const comisionServidor = parseFloat((data.comisionServidor ?? 0) as any);

  const { gananciaNeta, gananciaNetaUsdt } = calculateNetProfit(
    montoBruto, tasaDeCambio, comisionBanco, comisionBinance, comisionServidor
  );

  const [op] = await db.update(operationsTable).set({
    fecha: new Date(data.fecha),
    moneda: data.moneda,
    tasaDeCambio: tasaDeCambio.toString(),
    plataformaOrigen: data.plataformaOrigen,
    plataformaIntermediaria: data.plataformaIntermediaria || null,
    plataformaDestino: data.plataformaDestino,
    montoBruto: montoBruto.toString(),
    comisionBanco: comisionBanco.toString(),
    comisionBinance: comisionBinance.toString(),
    comisionServidor: comisionServidor.toString(),
    comisionServidorEnUsdt: data.comisionServidorEnUsdt,
    gananciaNeta: gananciaNeta.toString(),
    gananciaNetaUsdt: gananciaNetaUsdt.toString(),
    notas: data.notas,
  }).where(eq(operationsTable.id, id)).returning();

  if (!op) {
    res.status(404).json({ error: "not_found", message: "Operación no encontrada" });
    return;
  }
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.operationId, id));
  res.json(formatOperation(op, receipts));
});

router.delete("/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(operationsTable).where(eq(operationsTable.id, id));
  res.json({ success: true, message: "Operación eliminada" });
});

// Cerrar Ciclo: register the final USDT received after buying back
router.post("/:id/cerrar-ciclo", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = CerrarCicloBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "montoFinalUsdt requerido" });
    return;
  }

  const [op] = await db.select().from(operationsTable).where(eq(operationsTable.id, id));
  if (!op) {
    res.status(404).json({ error: "not_found", message: "Operación no encontrada" });
    return;
  }

  const montoBruto = parseFloat(op.montoBruto as any);
  const montoFinal = parsed.data.montoFinalUsdt;
  const gananciaRealUsdt = montoFinal - montoBruto;

  const [updated] = await db.update(operationsTable).set({
    statusCiclo: "cerrada",
    montoFinalUsdt: montoFinal.toString(),
    gananciaRealUsdt: gananciaRealUsdt.toString(),
  }).where(eq(operationsTable.id, id)).returning();

  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.operationId, id));
  res.json(formatOperation(updated, receipts));
});

router.post("/:id/receipts", authenticate, upload.single("file"), async (req, res) => {
  const operationId = parseInt(req.params.id);
  if (!req.file) {
    res.status(400).json({ error: "bad_request", message: "Archivo requerido" });
    return;
  }
  const type = req.body.type as "enviado" | "recibido";
  if (!["enviado", "recibido"].includes(type)) {
    res.status(400).json({ error: "bad_request", message: "Tipo debe ser 'enviado' o 'recibido'" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  const [receipt] = await db.insert(receiptsTable).values({
    operationId,
    filename: req.file.filename,
    url,
    type,
  }).returning();
  res.status(201).json(receipt);
});

export default router;
