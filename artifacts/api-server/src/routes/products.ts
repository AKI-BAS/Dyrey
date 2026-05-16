import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsResponse,
  ListProductsQueryParams,
  ListFeaturedProductsResponse,
  ListProductCategoriesResponse,
  GetProductParams,
  GetProductResponse,
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

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProductParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(serializeProduct(product)));
});

export default router;
