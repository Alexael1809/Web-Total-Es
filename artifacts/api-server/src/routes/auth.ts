import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { authenticate, generateToken } from "../middlewares/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "Credenciales inválidas" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "Credenciales inválidas" });
    return;
  }
  const token = generateToken({ userId: user.id, email: user.email, role: user.role as "admin" | "socio" });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
  });
});

router.get("/me", authenticate, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "Usuario no encontrado" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt });
});

export default router;
