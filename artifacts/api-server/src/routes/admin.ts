import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { AdminLoginBody, AdminLoginResponse, GetAdminMeResponse } from "@workspace/api-zod";
import { db, appointmentsTable, ordersTable, scheduleCapacityTable, staffNotepadTable } from "@workspace/db";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "staff1234";

function requireAdminToken(req: any, res: any): boolean {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  try {
    const decoded = Buffer.from(auth.replace("Bearer ", ""), "base64").toString("utf-8");
    if (decoded.startsWith("admin:")) return true;
  } catch {
    // fall through
  }
  res.status(401).json({ error: "Not authenticated" });
  return false;
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
  res.json(AdminLoginResponse.parse({ success: true, token }));
});

router.get("/admin/me", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  res.json(GetAdminMeResponse.parse({ authenticated: true }));
});

router.get("/admin/analytics", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const appointments = await db.select().from(appointmentsTable);
  const orders = await db.select().from(ordersTable);

  // Top services by appointment count
  const serviceCount: Record<string, number> = {};
  for (const a of appointments) {
    serviceCount[a.serviceName] = (serviceCount[a.serviceName] ?? 0) + 1;
  }
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Top products by quantity sold
  const productCount: Record<string, { count: number; revenue: number }> = {};
  for (const o of orders) {
    const items = o.items as Array<{ productName: string; quantity: number; unitPrice: number }>;
    for (const item of items) {
      if (!productCount[item.productName]) productCount[item.productName] = { count: 0, revenue: 0 };
      productCount[item.productName].count += item.quantity;
      productCount[item.productName].revenue += item.quantity * item.unitPrice;
    }
  }
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([name, { count, revenue }]) => ({ name, count, revenue }));

  // Appointment status distribution
  const statusCount: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const a of appointments) {
    statusCount[a.status] = (statusCount[a.status] ?? 0) + 1;
  }

  // Revenue & order totals
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

  res.json({
    topServices,
    topProducts,
    statusCount,
    totalRevenue,
    orderCount: orders.length,
    appointmentCount: appointments.length,
  });
});

router.get("/admin/schedule-capacity", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(scheduleCapacityTable);
  res.json(rows);
});

router.post("/admin/schedule-capacity", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { date, maxConcurrent } = req.body as { date: string; maxConcurrent: number };
  if (!date || typeof maxConcurrent !== "number" || maxConcurrent < 1) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [record] = await db
    .insert(scheduleCapacityTable)
    .values({ date, maxConcurrent, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scheduleCapacityTable.date,
      set: { maxConcurrent, updatedAt: new Date() },
    })
    .returning();
  res.json(record);
});

// --- Staff Notepad ---

const NOTEPAD_KEY = "main";

router.get("/admin/notepad", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(staffNotepadTable).where(eq(staffNotepadTable.key, NOTEPAD_KEY));
  if (rows.length === 0) {
    res.json({ key: NOTEPAD_KEY, content: "", updatedAt: null });
    return;
  }
  const row = rows[0];
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

router.put("/admin/notepad", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { content } = req.body as { content: string };
  if (typeof content !== "string") {
    res.status(400).json({ error: "content must be a string" });
    return;
  }
  const now = new Date();
  const [row] = await db
    .insert(staffNotepadTable)
    .values({ key: NOTEPAD_KEY, content, updatedAt: now })
    .onConflictDoUpdate({
      target: staffNotepadTable.key,
      set: { content, updatedAt: now },
    })
    .returning();
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

export default router;
