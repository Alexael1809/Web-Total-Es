import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const operationsTable = pgTable("operations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  fecha: timestamp("fecha").notNull(),
  moneda: text("moneda", { enum: ["PAB", "USD", "VES", "COP"] }).notNull(),
  tasaDeCambio: numeric("tasa_de_cambio", { precision: 18, scale: 8 }).notNull(),
  plataformaOrigen: text("plataforma_origen").notNull(),
  plataformaDestino: text("plataforma_destino").notNull(),
  montoBruto: numeric("monto_bruto", { precision: 18, scale: 8 }).notNull(),
  comisionBanco: numeric("comision_banco", { precision: 18, scale: 8 }).notNull().default("0"),
  comisionBinance: numeric("comision_binance", { precision: 18, scale: 8 }).notNull().default("0"),
  comisionServidor: numeric("comision_servidor", { precision: 18, scale: 8 }).notNull().default("0"),
  comisionServidorEnUsdt: boolean("comision_servidor_en_usdt").notNull().default(false),
  gananciaNeta: numeric("ganancia_neta", { precision: 18, scale: 8 }).notNull().default("0"),
  gananciaNetaUsdt: numeric("ganancia_neta_usdt", { precision: 18, scale: 8 }).notNull().default("0"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOperationSchema = createInsertSchema(operationsTable).omit({ id: true, createdAt: true });
export type InsertOperation = z.infer<typeof insertOperationSchema>;
export type Operation = typeof operationsTable.$inferSelect;
