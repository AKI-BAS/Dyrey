import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { createClerkClient, getAuth } from "@clerk/express";
import { db, appointmentsTable, ordersTable, petsTable } from "@workspace/db";
import { z } from "zod/v4";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const router: IRouter = Router();

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

router.get("/me/appointments", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = await getUserEmail(auth.userId);
  if (!email) {
    res.status(400).json({ error: "No email on account" });
    return;
  }

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.ownerEmail, email))
    .orderBy(appointmentsTable.createdAt);

  res.json(appointments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.get("/me/orders", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = await getUserEmail(auth.userId);
  if (!email) {
    res.status(400).json({ error: "No email on account" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerEmail, email))
    .orderBy(ordersTable.createdAt);

  res.json(
    orders.map((o) => ({
      ...o,
      totalAmount: parseFloat(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    })),
  );
});

// --- Pets ---

const insertPetBodySchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  color: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

const updatePetBodySchema = insertPetBodySchema.partial();

router.get("/me/pets", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const pets = await db
    .select()
    .from(petsTable)
    .where(eq(petsTable.userId, auth.userId))
    .orderBy(petsTable.createdAt);

  res.json(pets.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })));
});

router.post("/me/pets", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = insertPetBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [pet] = await db
    .insert(petsTable)
    .values({ userId: auth.userId, ...parsed.data })
    .returning();

  res.status(201).json({ ...pet, createdAt: pet.createdAt.toISOString() });
});

router.patch("/me/pets/:id", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const petId = parseInt(req.params.id, 10);
  if (isNaN(petId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = updatePetBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [pet] = await db
    .update(petsTable)
    .set(parsed.data)
    .where(and(eq(petsTable.id, petId), eq(petsTable.userId, auth.userId)))
    .returning();

  if (!pet) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...pet, createdAt: pet.createdAt.toISOString() });
});

router.delete("/me/pets/:id", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const petId = parseInt(req.params.id, 10);
  if (isNaN(petId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(petsTable)
    .where(and(eq(petsTable.id, petId), eq(petsTable.userId, auth.userId)));

  res.status(204).send();
});

export default router;
