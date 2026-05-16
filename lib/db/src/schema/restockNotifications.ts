import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const restockNotificationsTable = pgTable("restock_notifications", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RestockNotification = typeof restockNotificationsTable.$inferSelect;
