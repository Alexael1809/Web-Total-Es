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

const CreateOperationBody = z.object({
  fecha: z.string().min(1),
  moneda: z.enum(["PAB", "USD", "VES", "COP"]),
  tasaDeCambio: z.coerce.number(),
  plataformaOrigen: z.string().min(1),
  plataformaDestino: z.string().min(1),
  montoBruto: z.coerce.number(),
  comisionBanco: z.coerce.number().default(0),
  comisionBinance: z.coerce.number().default(0),
  comisionServidor: z.coerce.number().default(0),
  comisionServidorEnUsdt: z.boolean().default(false),
  notas: z.string().optional(),
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

function calculateNetProfit(
  montoBruto: number,
  tasaDeCambio: number,
  comisionBanco: number,
  comisionBinance: number,
  comisionServidor: number,
  comisionServidorEnUsdt: boolean
) {
  const spreadUsdt = montoBruto / tasaDeCambio;
  const comisionBancoUsdt = comisionBanco / tasaDeCambio;
  const comisionServidorUsdt = comisionServidorEnUsdt
    ? comisionServidor
    : comisionServidor / tasaDeCambio;
  const totalComisionesUsdt = comisionBancoUsdt + comisionBinance + comisionServidorUsdt;
  const gananciaNetaUsdt = spreadUsdt - totalComisionesUsdt;
  const gananciaNeta = gananciaNetaUsdt * tasaDeCambio;
  return { gananciaNeta, gananciaNetaUsdt };
}

function formatOperation(op: any, receipts: any[]) {
  return {
    ...op,
    tasaDeCambio: parseFloat(op.tasaDeCambio),
    montoBruto: parseFloat(op.montoBruto),
    comisionBanco: parseFloat(op.comisionBanco),
    comisionBinance: parseFloat(op.comisionBinance),
    comisionServidor: parseFloat(op.comisionServidor),
    gananciaNeta: parseFloat(op.gananciaNeta),
    gananciaNetaUsdt: parseFloat(op.gananciaNetaUsdt),
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
    montoBruto, tasaDeCambio, comisionBanco, comisionBinance, comisionServidor, data.comisionServidorEnUsdt
  );

  const [op] = await db.insert(operationsTable).values({
    userId: req.user!.userId,
    fecha: new Date(data.fecha),
    moneda: data.moneda,
    tasaDeCambio: tasaDeCambio.toString(),
    plataformaOrigen: data.plataformaOrigen,
    plataformaDestino: data.plataformaDestino,
    montoBruto: montoBruto.toString(),
    comisionBanco: comisionBanco.toString(),
    comisionBinance: comisionBinance.toString(),
    comisionServidor: comisionServidor.toString(),
    comisionServidorEnUsdt: data.comisionServidorEnUsdt,
    gananciaNeta: gananciaNeta.toString(),
    gananciaNetaUsdt: gananciaNetaUsdt.toString(),
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
    montoBruto, tasaDeCambio, comisionBanco, comisionBinance, comisionServidor, data.comisionServidorEnUsdt
  );

  const [op] = await db.update(operationsTable).set({
    fecha: new Date(data.fecha),
    moneda: data.moneda,
    tasaDeCambio: tasaDeCambio.toString(),
    plataformaOrigen: data.plataformaOrigen,
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
