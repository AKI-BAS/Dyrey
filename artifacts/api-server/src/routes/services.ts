import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { ListServicesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (req, res): Promise<void> => {
  const services = await db.select().from(servicesTable);
  res.json(ListServicesResponse.parse(services.map(s => ({
    ...s,
    price: parseFloat(s.price),
  }))));
});

export default router;
