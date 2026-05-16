import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const staffNotepadTable = pgTable("staff_notepad", {
  key: text("key").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StaffNotepad = typeof staffNotepadTable.$inferSelect;
