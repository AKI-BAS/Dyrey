import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import appointmentsRouter from "./appointments";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(appointmentsRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
