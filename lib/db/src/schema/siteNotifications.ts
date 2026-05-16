import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const siteNotificationsTable = pgTable("site_notifications", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteNotification = typeof siteNotificationsTable.$inferSelect;
