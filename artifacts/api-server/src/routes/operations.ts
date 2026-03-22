import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { operationsTable, receiptsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { GetOperationsQueryParams } from "@workspace/api-zod";
import { z } from "zod";
import { authenticate } from "../middlewares/auth.js";
import { supabase, RECEIPTS_BUCKET } from "../lib/supabase.js";

const router = Router();

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

// Use memory storage — files go straight to Supabase Storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function calculateNetProfit(
  montoBruto: number,
  tasa: number,
  comisionBanco: number,
  comisionBinance: number,
  comisionServidor: number
) {
  const spread = tasa - 1;
  const gananciaBrutaUsdt = montoBruto * spread;
  const totalComisiones = comisionBanco + comisionBinance + comisionServidor;
  const gananciaNetaUsdt = gananciaBrutaUsdt - totalComisiones;
  return { gananciaNeta: gananciaNetaUsdt, gananciaNetaUsdt };
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

  // Delete all associated receipt files from Supabase Storage
  const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.operationId, id));
  if (receipts.length > 0) {
    const filePaths = receipts.map(r => r.filename);
    await supabase.storage.from(RECEIPTS_BUCKET).remove(filePaths);
  }

  await db.delete(operationsTable).where(eq(operationsTable.id, id));
  res.json({ success: true, message: "Operación eliminada" });
});

// Cerrar Ciclo (una operación)
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

// Cerrar Ciclo (múltiples operaciones)
const BatchCloseCicloBody = z.object({
  operationIds: z.array(z.number()).min(1),
  montoFinalUsdt: z.coerce.number().min(0),
});

router.post("/batch/close", authenticate, async (req, res) => {
  const parsed = BatchCloseCicloBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos", details: parsed.error.issues });
    return;
  }

  const { operationIds, montoFinalUsdt } = parsed.data;

  // Get all operations to close
  const ops = await db.select().from(operationsTable).where(
    and(
      eq(operationsTable.statusCiclo, "abierta"),
      inArray(operationsTable.id, operationIds)
    )
  );

  if (ops.length === 0) {
    res.status(400).json({ error: "bad_request", message: "No hay operaciones abiertas con esos IDs" });
    return;
  }

  // Calculate total montoBruto
  const totalMontoBruto = ops.reduce((sum, op) => sum + parseFloat(op.montoBruto as any), 0);
  
  // Distribute montoFinalUsdt proportionally
  const gananciaRealTotal = montoFinalUsdt - totalMontoBruto;

  // Update all operations
  const updatePromises = ops.map((op) => {
    const montoOp = parseFloat(op.montoBruto as any);
    const proportion = totalMontoBruto > 0 ? montoOp / totalMontoBruto : 0;
    const montoFinalOp = montoOp + (gananciaRealTotal * proportion);
    const gananciaRealOp = montoFinalOp - montoOp;

    return db.update(operationsTable).set({
      statusCiclo: "cerrada",
      montoFinalUsdt: montoFinalOp.toString(),
      gananciaRealUsdt: gananciaRealOp.toString(),
    }).where(eq(operationsTable.id, op.id)).returning();
  });

  const updated = await Promise.all(updatePromises);
  
  // Format response
  const results = [];
  for (const opUpdate of updated) {
    const [op] = opUpdate;
    const receipts = await db.select().from(receiptsTable).where(eq(receiptsTable.operationId, op.id));
    results.push(formatOperation(op, receipts));
  }

  res.json({ 
    success: true, 
    message: `${results.length} operaciones cerradas`, 
    operations: results,
    totalGananciaReal: gananciaRealTotal,
  });
});

// Upload receipt to Supabase Storage
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

  const ext = req.file.originalname.split(".").pop() || "bin";
  const filename = `op-${operationId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    res.status(500).json({ error: "storage_error", message: "Error al subir archivo: " + uploadError.message });
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(filename);

  const [receipt] = await db.insert(receiptsTable).values({
    operationId,
    filename,
    url: publicUrl,
    type,
  }).returning();

  res.status(201).json(receipt);
});

// Delete receipt from Supabase Storage
router.delete("/:id/receipts/:receiptId", authenticate, async (req, res) => {
  const operationId = parseInt(req.params.id);
  const receiptId = parseInt(req.params.receiptId);

  const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.id, receiptId));
  if (!receipt || receipt.operationId !== operationId) {
    res.status(404).json({ error: "not_found", message: "Recibo no encontrado" });
    return;
  }

  const { error: removeError } = await supabase.storage.from(RECEIPTS_BUCKET).remove([receipt.filename]);
  if (removeError) {
    console.error("Error removing file from Supabase Storage:", removeError.message);
  }

  await db.delete(receiptsTable).where(eq(receiptsTable.id, receiptId));
  res.json({ success: true, message: "Recibo eliminado" });
});

export default router;
