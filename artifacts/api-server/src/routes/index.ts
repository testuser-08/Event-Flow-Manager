import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminSetupRouter from "./admin-setup";
import adminRosterRouter from "./admin-roster";
import channelsSummaryRouter from "./channels-summary";
import alertsActiveRouter from "./alerts-active";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminSetupRouter);
router.use(adminRosterRouter);
router.use(channelsSummaryRouter);
router.use(alertsActiveRouter);

export default router;
