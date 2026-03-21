import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { operationsTable } from "./operations";

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  operationId: integer("operation_id").references(() => operationsTable.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  type: text("type", { enum: ["enviado", "recibido"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({ id: true, createdAt: true });
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
