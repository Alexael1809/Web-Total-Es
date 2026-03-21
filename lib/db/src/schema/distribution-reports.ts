import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const distributionReportsTable = pgTable("distribution_reports", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  resultado: jsonb("resultado").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDistributionReportSchema = createInsertSchema(distributionReportsTable).omit({ id: true, createdAt: true });
export type InsertDistributionReport = z.infer<typeof insertDistributionReportSchema>;
export type DistributionReport = typeof distributionReportsTable.$inferSelect;
