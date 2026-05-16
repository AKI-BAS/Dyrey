import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const siteContentTable = pgTable("site_content", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteContent = typeof siteContentTable.$inferSelect;
