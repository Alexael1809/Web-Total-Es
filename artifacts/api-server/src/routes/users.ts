import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { CreateUserBody } from "@workspace/api-zod";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { supabase } from "../lib/supabase.js";
import bcrypt from "bcryptjs";

const router = Router();

router.get("/", authenticate, requireAdmin, async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  res.json(users);
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "bad_request", message: "Datos inválidos" });
    return;
  }
  const { email, name, password, role } = parsed.data;

  // Create user in Supabase Auth first
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (authError) {
    res.status(400).json({ error: "auth_error", message: "Error al crear usuario: " + authError.message });
    return;
  }

  // Create user in local users table (keep password hash for fallback)
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email,
    name,
    passwordHash,
    role,
    supabaseUid: authData.user.id,
  }).returning({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });

  res.status(201).json(user);
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  // Get user to find supabase_uid
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);

  // Delete from Supabase Auth if linked
  if (user?.supabaseUid) {
    await supabase.auth.admin.deleteUser(user.supabaseUid);
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Usuario eliminado" });
});

export default router;
