import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const scheduleCapacityTable = pgTable("schedule_capacity", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  maxConcurrent: integer("max_concurrent").notNull().default(2),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScheduleCapacity = typeof scheduleCapacityTable.$inferSelect;
