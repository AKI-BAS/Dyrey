import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
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
  return {
    ...p,
    price: parseFloat(p.price),
  };
}

router.get("/products/featured", async (req, res): Promise<void> => {
  const products = await db.select().from(productsTable).where(eq(productsTable.featured, true));
  res.json(ListFeaturedProductsResponse.parse(products.map(serializeProduct)));
});

router.get("/products/categories", async (req, res): Promise<void> => {
  const all = await db.select().from(productsTable);
  const categoryCounts: Record<string, number> = {};
  for (const p of all) {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  }
  const categories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));
  res.json(ListProductCategoriesResponse.parse(categories));
});

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  const all = await db.select().from(productsTable);

  let filtered = all;
  if (params.success) {
    if (params.data.category) {
      filtered = filtered.filter(p => p.category === params.data.category);
    }
    if (params.data.search) {
      const s = params.data.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
      );
    }
  }

  res.json(ListProductsResponse.parse(filtered.map(serializeProduct)));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    name: parsed.data.name,
    description: parsed.data.description,
    price: String(parsed.data.price),
    category: parsed.data.category,
    imageUrl: parsed.data.imageUrl ?? null,
    inStock: parsed.data.inStock ?? true,
    featured: parsed.data.featured ?? false,
    stockCount: parsed.data.stockCount ?? 0,
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

export default router;
