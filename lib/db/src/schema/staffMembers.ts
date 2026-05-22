import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffMembersTable = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});