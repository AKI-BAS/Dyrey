import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffMembersTable = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});