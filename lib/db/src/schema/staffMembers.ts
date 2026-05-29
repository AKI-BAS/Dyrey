import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffMembersTable = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StaffMember = typeof staffMembersTable.$inferSelect;
