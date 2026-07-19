import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import adminSetupRouter from "./admin-setup.js";
import adminRosterRouter from "./admin-roster.js";
import channelsSummaryRouter from "./channels-summary.js";
import alertsActiveRouter from "./alerts-active.js";
import authRouter from "./auth.js";
import messagesRouter from "./messages.js";
import alertsWriteRouter from "./alerts-write.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminSetupRouter);
router.use(authRouter);
router.use(messagesRouter);
router.use(alertsWriteRouter);
router.use(adminRosterRouter);
router.use(channelsSummaryRouter);
router.use(alertsActiveRouter);

export default router;
