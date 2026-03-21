import { Router } from "express";
import { db } from "@workspace/db";
import { paymentMethodsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { CreatePaymentMethodBody } from "@workspace/api-zod";
import { authenticate, requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  const methods = await db.select().from(paymentMethodsTable);
  res.json(methods);
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const parsed = CreatePaymentMethodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Nombre requerido" });
    return;
  }
  const [method] = await db.insert(paymentMethodsTable).values({ name: parsed.data.name }).returning();
  res.status(201).json(method);
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
  res.json({ success: true, message: "Método de pago eliminado" });
});

export default router;
