import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, productsTable, siteSettingsTable } from "@workspace/db";
import nodemailer from "nodemailer";
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
    deliveryFee: parseFloat(o.deliveryFee ?? "0"),
    createdAt: o.createdAt.toISOString(),
    items: o.items as Array<{ productId: number; productName: string; quantity: number; unitPrice: number }>,
  };
}

async function getDeliveryFee(): Promise<number> {
  try {
    const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "delivery_fee"));
    return row ? parseFloat(row.value) : 500;
  } catch { return 500; }
}

async function sendOrderConfirmation(order: ReturnType<typeof serializeOrder>) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
  if (!smtpUser || !smtpPass) return; // skip if not configured

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const itemsList = order.items.map(i => `${i.productName} ×${i.quantity} — ${(i.unitPrice * i.quantity).toLocaleString()} kr.`).join("\n");
  const fulfillment = order.fulfillmentType === "delivery" ? `Home Delivery\nAddress: ${order.deliveryAddress}` : "Pickup in store";
  const payment = order.paymentMethod === "online" ? "Pay online (we will contact you to confirm payment)" : "Pay on pickup";

  await transporter.sendMail({
    from: `Dýrey Veterinary <${smtpUser}>`,
    to: order.customerEmail,
    subject: `Order Confirmed — Dýrey #${order.id}`,
    text: `Hi ${order.customerName},\n\nThank you for your order!\n\nOrder #${order.id}\n\nItems:\n${itemsList}\n\n${order.deliveryFee > 0 ? `Delivery fee: ${order.deliveryFee.toLocaleString()} kr.\n` : ""}Total: ${order.totalAmount.toLocaleString()} kr.\n\nFulfillment: ${fulfillment}\nPayment: ${payment}\n\nWe will be in touch shortly.\n\nDýrey Veterinary`,
  });
}

router.get("/orders/delivery-fee", async (req, res): Promise<void> => {
  const fee = await getDeliveryFee();
  res.json({ deliveryFee: fee });
});

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
  const fulfillmentType = (req.body.fulfillmentType as string) ?? "pickup";
  const paymentMethod = (req.body.paymentMethod as string) ?? "pickup";
  const deliveryAddress = (req.body.deliveryAddress as string) ?? null;

  const orderItems: Array<{ productId: number; productName: string; quantity: number; unitPrice: number }> = [];
  let subtotal = 0;

  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
    const unitPrice = parseFloat(product.price);
    orderItems.push({ productId: item.productId, productName: product.name, quantity: item.quantity, unitPrice });
    subtotal += unitPrice * item.quantity;
  }

  const deliveryFee = fulfillmentType === "delivery" ? await getDeliveryFee() : 0;
  const totalAmount = subtotal + deliveryFee;
  const paymentStatus = paymentMethod === "online" ? "awaiting_online" : "unpaid";

  const [order] = await db.insert(ordersTable).values({
    customerName,
    customerEmail,
    customerPhone: customerPhone || null,
    items: orderItems,
    totalAmount: totalAmount.toFixed(2),
    status: "pending",
    fulfillmentType,
    paymentMethod,
    paymentStatus,
    deliveryAddress,
    deliveryFee: deliveryFee.toFixed(2),
  }).returning();

  const serialized = serializeOrder(order);
  sendOrderConfirmation(serialized).catch(() => {}); // fire and forget
  res.status(201).json(GetOrderResponse.parse(serialized));
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
  if (req.body.paymentStatus !== undefined) updates.paymentStatus = req.body.paymentStatus;
  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(UpdateOrderResponse.parse(serializeOrder(order)));
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(ordersTable).where(eq(ordersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Order not found" }); return; }
  res.status(204).send();
});

export default router;