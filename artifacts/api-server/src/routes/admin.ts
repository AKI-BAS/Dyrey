import { Router, type IRouter } from "express";
import { eq, sql, desc, and } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { AdminLoginBody, AdminLoginResponse, GetAdminMeResponse } from "@workspace/api-zod";
import {
  db, appointmentsTable, ordersTable, scheduleCapacityTable, staffNotepadTable,
  staffNotesTable, siteNotificationsTable, siteContentTable, restockNotificationsTable,
  staffMembersTable,
} from "@workspace/db";

const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "staff1234";
const OWNER_PASSWORD = process.env["OWNER_PASSWORD"] ?? "owner1234";

function requireAdminToken(req: any, res: any): boolean {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  try {
    const decoded = Buffer.from(auth.replace("Bearer ", ""), "base64").toString("utf-8");
    if (decoded.startsWith("admin:")) return true;
  } catch { /* fall through */ }
  res.status(401).json({ error: "Not authenticated" });
  return false;
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const isOwner = parsed.data.password === OWNER_PASSWORD;
  const isStaff = parsed.data.password === ADMIN_PASSWORD;
  if (!isOwner && !isStaff) { res.status(401).json({ error: "Invalid password" }); return; }
  const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
  res.json({ success: true, token, loginRole: isOwner ? "owner" : "staff" });
});

router.get("/admin/me", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  res.json(GetAdminMeResponse.parse({ authenticated: true }));
});

router.get("/admin/analytics", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const appointments = await db.select().from(appointmentsTable);
  const orders = await db.select().from(ordersTable);
  const serviceCount: Record<string, number> = {};
  for (const a of appointments) { serviceCount[a.serviceName] = (serviceCount[a.serviceName] ?? 0) + 1; }
  const topServices = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  const productCount: Record<string, { count: number; revenue: number }> = {};
  for (const o of orders) {
    const items = o.items as Array<{ productName: string; quantity: number; unitPrice: number }>;
    for (const item of items) {
      if (!productCount[item.productName]) productCount[item.productName] = { count: 0, revenue: 0 };
      productCount[item.productName].count += item.quantity;
      productCount[item.productName].revenue += item.quantity * item.unitPrice;
    }
  }
  const topProducts = Object.entries(productCount).sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([name, { count, revenue }]) => ({ name, count, revenue }));
  const statusCount: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const a of appointments) { statusCount[a.status] = (statusCount[a.status] ?? 0) + 1; }
  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
  res.json({ topServices, topProducts, statusCount, totalRevenue, orderCount: orders.length, appointmentCount: appointments.length });
});

router.get("/admin/schedule-capacity", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(scheduleCapacityTable);
  res.json(rows);
});

router.post("/admin/schedule-capacity", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { date, maxConcurrent } = req.body as { date: string; maxConcurrent: number };
  if (!date || typeof maxConcurrent !== "number" || maxConcurrent < 1) { res.status(400).json({ error: "Invalid request" }); return; }
  const [record] = await db.insert(scheduleCapacityTable).values({ date, maxConcurrent, updatedAt: new Date() })
    .onConflictDoUpdate({ target: scheduleCapacityTable.date, set: { maxConcurrent, updatedAt: new Date() } }).returning();
  res.json(record);
});

// --- Legacy Notepad ---
const NOTEPAD_KEY = "main";
router.get("/admin/notepad", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(staffNotepadTable).where(eq(staffNotepadTable.key, NOTEPAD_KEY));
  if (rows.length === 0) { res.json({ key: NOTEPAD_KEY, content: "", updatedAt: null }); return; }
  const row = rows[0];
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});
router.put("/admin/notepad", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { content } = req.body as { content: string };
  if (typeof content !== "string") { res.status(400).json({ error: "content must be a string" }); return; }
  const now = new Date();
  const [row] = await db.insert(staffNotepadTable).values({ key: NOTEPAD_KEY, content, updatedAt: now })
    .onConflictDoUpdate({ target: staffNotepadTable.key, set: { content, updatedAt: now } }).returning();
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

// --- Staff Notes (individual, with importance) ---
const IMPORTANCE_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

router.get("/admin/notes", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const notes = await db.select().from(staffNotesTable).orderBy(desc(staffNotesTable.createdAt));
  const sorted = notes.sort((a, b) => (IMPORTANCE_ORDER[a.importance] ?? 4) - (IMPORTANCE_ORDER[b.importance] ?? 4));
  res.json(sorted.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })));
});

router.post("/admin/notes", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { content, importance = "medium" } = req.body as { content: string; importance?: string };
  if (!content || typeof content !== "string") { res.status(400).json({ error: "content required" }); return; }
  const now = new Date();
  const [note] = await db.insert(staffNotesTable).values({ content, importance, createdAt: now, updatedAt: now }).returning();
  res.status(201).json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

router.patch("/admin/notes/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { content, importance } = req.body as { content?: string; importance?: string };
  const now = new Date();
  const [note] = await db.update(staffNotesTable).set({ ...(content ? { content } : {}), ...(importance ? { importance } : {}), updatedAt: now })
    .where(eq(staffNotesTable.id, id)).returning();
  if (!note) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

router.delete("/admin/notes/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(staffNotesTable).where(eq(staffNotesTable.id, id));
  res.status(204).send();
});

// --- Site Notifications ---
router.get("/admin/site-notifications", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(siteNotificationsTable).orderBy(desc(siteNotificationsTable.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt?.toISOString() ?? null })));
});

router.post("/admin/site-notifications", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { message, type = "info", isActive = true, expiresAt } = req.body as any;
  if (!message) { res.status(400).json({ error: "message required" }); return; }
  const [row] = await db.insert(siteNotificationsTable).values({
    message, type, isActive,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null });
});

router.patch("/admin/site-notifications/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { message, type, isActive, expiresAt } = req.body as any;
  const set: any = {};
  if (message !== undefined) set.message = message;
  if (type !== undefined) set.type = type;
  if (isActive !== undefined) set.isActive = isActive;
  if (expiresAt !== undefined) set.expiresAt = expiresAt ? new Date(expiresAt) : null;
  const [row] = await db.update(siteNotificationsTable).set(set).where(eq(siteNotificationsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null });
});

router.delete("/admin/site-notifications/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id, 10);
  await db.delete(siteNotificationsTable).where(eq(siteNotificationsTable.id, id));
  res.status(204).send();
});

// --- Site Content ---
router.get("/admin/site-content", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(siteContentTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

router.put("/admin/site-content", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const updates = req.body as Record<string, string>;
  if (typeof updates !== "object" || Array.isArray(updates)) { res.status(400).json({ error: "body must be object" }); return; }
  const now = new Date();
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== "string") continue;
    await db.insert(siteContentTable).values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: siteContentTable.key, set: { value, updatedAt: now } });
  }
  res.json({ ok: true });
});

// --- Restock notification signups (admin view) ---
router.get("/admin/restock-signups", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(restockNotificationsTable).orderBy(desc(restockNotificationsTable.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// --- Staff members ---
router.get("/admin/staff", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(staffMembersTable).orderBy(staffMembersTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/admin/staff", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { name, role = "staff" } = req.body as { name: string; role?: string };
  if (!name || typeof name !== "string") { res.status(400).json({ error: "name required" }); return; }
  const [row] = await db.insert(staffMembersTable).values({ name, role, createdAt: new Date() }).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/admin/staff/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { role } = req.body as { role: string };
  if (!role) { res.status(400).json({ error: "role required" }); return; }
  const [row] = await db.update(staffMembersTable).set({ role }).where(eq(staffMembersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/admin/staff/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(staffMembersTable).where(eq(staffMembersTable.id, id));
  res.status(204).send();
});
// --- Site Settings ---
router.get("/admin/settings", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(siteSettingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  if (!map.delivery_fee) map.delivery_fee = "500";
  res.json(map);
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const updates = req.body as Record<string, string>;
  const now = new Date();
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== "string") continue;
    await db.insert(siteSettingsTable).values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: now } });
  }
  res.json({ ok: true });
});
export default router;
