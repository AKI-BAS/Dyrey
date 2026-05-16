import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, productsTable } from "@workspace/db";
import {
  ListOrdersResponse,
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderParams,
  UpdateOrderBody,
  UpdateOrderResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeOrder(o: typeof ordersTable.$inferSelect) {
  return {
    ...o,
    totalAmount: parseFloat(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
    items: o.items as Array<{ productId: number; productName: string; quantity: number; unitPrice: number }>,
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  res.json(ListOrdersResponse.parse(orders.map(serializeOrder)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { customerName, customerEmail, customerPhone, items } = parsed.data;
  const orderItems: Array<{ productId: number; productName: string; quantity: number; unitPrice: number }> = [];
  let totalAmount = 0;

  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const unitPrice = parseFloat(product.price);
    orderItems.push({ productId: item.productId, productName: product.name, quantity: item.quantity, unitPrice });
    totalAmount += unitPrice * item.quantity;
  }

  const [order] = await db.insert(ordersTable).values({
    customerName,
    customerEmail,
    customerPhone: customerPhone || null,
    items: orderItems,
    totalAmount: totalAmount.toFixed(2),
    status: "pending",
  }).returning();

  res.status(201).json(GetOrderResponse.parse(serializeOrder(order)));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOrderParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  res.json(GetOrderResponse.parse(serializeOrder(order)));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  res.json(UpdateOrderResponse.parse(serializeOrder(order)));
});

export default router;
