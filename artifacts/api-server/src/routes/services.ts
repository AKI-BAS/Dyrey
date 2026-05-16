import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  ListServicesResponse,
  CreateServiceBody,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeService(s: typeof servicesTable.$inferSelect) {
  return {
    ...s,
    price: parseFloat(s.price),
  };
}

router.get("/services", async (req, res): Promise<void> => {
  const services = await db.select().from(servicesTable);
  res.json(ListServicesResponse.parse(services.map(serializeService)));
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db.insert(servicesTable).values({
    name: parsed.data.name,
    description: parsed.data.description,
    duration: parsed.data.duration,
    price: String(parsed.data.price),
    isActive: parsed.data.isActive ?? true,
    allowCustomDescription: parsed.data.allowCustomDescription ?? false,
  }).returning();
  res.status(201).json(serializeService(service));
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.duration !== undefined) updates.duration = parsed.data.duration;
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  if (parsed.data.allowCustomDescription !== undefined) updates.allowCustomDescription = parsed.data.allowCustomDescription;

  const [service] = await db.update(servicesTable).set(updates).where(eq(servicesTable.id, params.data.id)).returning();
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  res.json(UpdateServiceResponse.parse(serializeService(service)));
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [service] = await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id)).returning();
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  res.sendStatus(204);
});

export default router;
