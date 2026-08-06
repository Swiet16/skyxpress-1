import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import ipRequestRouter from "./ipRequest";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(ipRequestRouter);

export default router;
