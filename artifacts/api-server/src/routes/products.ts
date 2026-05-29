import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable, restockNotificationsTable, siteNotificationsTable, siteContentTable, staffMembersTable } from "@workspace/db";
import {
  ListProductsResponse,
  ListProductsQueryParams,
  ListFeaturedProductsResponse,
  ListProductCategoriesResponse,
  GetProductParams,
  GetProductResponse,
  CreateProductBody,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeProduct(p: typeof productsTable.$inferSelect) {
  return { ...p, price: parseFloat(p.price) };
}

router.get("/products/featured", async (req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.featured, true));
  res.json(ListFeaturedProductsResponse.parse(products.map(serializeProduct)));
});

router.get("/products/categories", async (req, res): Promise<void> => {
  const all = await db.select().from(productsTable);
  const categoryCounts: Record<string, number> = {};
  for (const p of all) { categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; }
  const categories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));
  res.json(ListProductCategoriesResponse.parse(categories));
});

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  const all = await db.select().from(productsTable);
  let filtered = all;
  if (params.success) {
    if (params.data.category) filtered = filtered.filter(p => p.category === params.data.category);
    if (params.data.search) {
      const s = params.data.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
    }
  }
  res.json(ListProductsResponse.parse(filtered.map(serializeProduct)));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [product] = await db.insert(productsTable).values({
    name: parsed.data.name,
    description: parsed.data.description,
    price: String(parsed.data.price),
    category: parsed.data.category,
    imageUrl: parsed.data.imageUrl ?? null,
    inStock: parsed.data.inStock ?? true,
    featured: parsed.data.featured ?? false,
    stockCount: parsed.data.stockCount ?? 0,
    discountPercent: parsed.data.discountPercent ?? 0,
  }).returning();
  res.status(201).json(serializeProduct(product));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProductParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(GetProductResponse.parse(serializeProduct(product)));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;
  if (parsed.data.inStock !== undefined) updates.inStock = parsed.data.inStock;
  if (parsed.data.featured !== undefined) updates.featured = parsed.data.featured;
  if (parsed.data.stockCount !== undefined) updates.stockCount = parsed.data.stockCount;
  if (parsed.data.discountPercent !== undefined) updates.discountPercent = parsed.data.discountPercent;
  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(UpdateProductResponse.parse(serializeProduct(product)));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.sendStatus(204);
});

// Public: Notify me when back in stock
router.post("/products/:id/notify-me", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { email } = req.body as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" }); return;
  }
  await db.insert(restockNotificationsTable).values({ productId: id, email });
  res.status(201).json({ ok: true });
});

// Public: Active site notifications (for banner)
router.get("/site-notifications", async (req, res): Promise<void> => {
  const now = new Date();
  const rows = await db.select().from(siteNotificationsTable).where(eq(siteNotificationsTable.isActive, true));
  const active = rows.filter(r => !r.expiresAt || r.expiresAt > now);
  res.json(active.map(r => ({ id: r.id, message: r.message, type: r.type, expiresAt: r.expiresAt?.toISOString() ?? null })));
});

// Public: Site content key-value store
router.get("/site-content", async (req, res): Promise<void> => {
  const rows = await db.select().from(siteContentTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

export default router;

// Public: staff listing for About page
import { staffMembersTable as _staffMembersTable } from "@workspace/db";
router.get("/staff", async (req, res): Promise<void> => {
  const rows = await db.select().from(_staffMembersTable).orderBy(_staffMembersTable.name);
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    bio: r.bio ?? null,
    photoUrl: r.photoUrl ?? null,
  })));

// Public: staff listing for About page
router.get("/staff", async (req, res): Promise<void> => {
  const staff = await db.select().from(staffMembersTable).orderBy(staffMembersTable.name);
  res.json(staff.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    bio: r.bio ?? null,
    photoUrl: r.photoUrl ?? null,
  })));
});

export default router;
