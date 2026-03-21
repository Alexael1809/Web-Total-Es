import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import paymentMethodsRouter from "./payment-methods.js";
import currenciesRouter from "./currencies.js";
import operationsRouter from "./operations.js";
import dashboardRouter from "./dashboard.js";
import distributionRouter from "./distribution.js";
import reportsRouter from "./reports.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/payment-methods", paymentMethodsRouter);
router.use("/currencies", currenciesRouter);
router.use("/operations", operationsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/distribution", distributionRouter);
router.use("/reports", reportsRouter);

export default router;
