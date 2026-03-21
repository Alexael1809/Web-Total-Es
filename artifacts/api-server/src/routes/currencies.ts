import { Router } from "express";
import { db } from "@workspace/db";
import { currenciesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();

const CreateCurrencyBody = z.object({
  code: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1),
  symbol: z.string().optional(),
});

router.get("/", authenticate, async (_req, res) => {
  const currencies = await db.select().from(currenciesTable).orderBy(currenciesTable.code);
  res.json(currencies);
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const parsed = CreateCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Código y nombre requeridos" });
    return;
  }
  try {
    const [currency] = await db
      .insert(currenciesTable)
      .values({
        code: parsed.data.code,
        name: parsed.data.name,
        symbol: parsed.data.symbol ?? "",
      })
      .returning();
    res.status(201).json(currency);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "conflict", message: "Ya existe una moneda con ese código" });
      return;
    }
    throw err;
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(currenciesTable).where(eq(currenciesTable.id, id));
  res.json({ success: true, message: "Moneda eliminada" });
});

export default router;
