import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, appointmentsTable, servicesTable } from "@workspace/db";
import {
  ListAppointmentsResponse,
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentResponse,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  UpdateAppointmentResponse,
  CancelAppointmentParams,
  GetAppointmentsSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeAppointment(a: typeof appointmentsTable.$inferSelect) {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/appointments/summary", async (req, res): Promise<void> => {
  const all = await db.select().from(appointmentsTable);
  const today = new Date().toISOString().split("T")[0];
  const summary = {
    total: all.length,
    pending: all.filter(a => a.status === "pending").length,
    confirmed: all.filter(a => a.status === "confirmed").length,
    completed: all.filter(a => a.status === "completed").length,
    cancelled: all.filter(a => a.status === "cancelled").length,
    todayCount: all.filter(a => a.date === today).length,
  };
  res.json(GetAppointmentsSummaryResponse.parse(summary));
});

router.get("/appointments", async (req, res): Promise<void> => {
  const params = ListAppointmentsQueryParams.safeParse(req.query);
  let query = db.select().from(appointmentsTable);

  const all = await query;
  let filtered = all;
  if (params.success && params.data.status) {
    filtered = all.filter(a => a.status === params.data.status);
  }

  res.json(ListAppointmentsResponse.parse(filtered.map(serializeAppointment)));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawId = Array.isArray(req.body.serviceId) ? req.body.serviceId[0] : req.body.serviceId;
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, Number(parsed.data.serviceId)));
  if (!service) {
    res.status(400).json({ error: "Service not found" });
    return;
  }

  const [appointment] = await db.insert(appointmentsTable).values({
    ...parsed.data,
    serviceId: Number(parsed.data.serviceId),
    serviceName: service.name,
    status: "pending",
  }).returning();

  res.status(201).json(GetAppointmentResponse.parse(serializeAppointment(appointment)));
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [appointment] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json(GetAppointmentResponse.parse(serializeAppointment(appointment)));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [appointment] = await db
    .update(appointmentsTable)
    .set(parsed.data)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json(UpdateAppointmentResponse.parse(serializeAppointment(appointment)));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CancelAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [appointment] = await db
    .update(appointmentsTable)
    .set({ status: "cancelled" })
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
