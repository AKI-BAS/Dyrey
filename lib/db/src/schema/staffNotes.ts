import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const IMPORTANCE_LEVELS = ["low", "medium", "high", "urgent"] as const;
export type Importance = typeof IMPORTANCE_LEVELS[number];

export const staffNotesTable = pgTable("staff_notes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  importance: text("importance").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StaffNote = typeof staffNotesTable.$inferSelect;
