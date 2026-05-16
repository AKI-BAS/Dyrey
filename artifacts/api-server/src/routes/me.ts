import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { createClerkClient, getAuth } from "@clerk/express";
import { db, appointmentsTable, ordersTable } from "@workspace/db";

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
    .where(eq(appointmentsTable.customerEmail, email))
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

export default router;
