import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const currenciesTable = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCurrencySchema = createInsertSchema(currenciesTable).omit({ id: true, createdAt: true });
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currenciesTable.$inferSelect;
