import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import ipRequestRouter, { serverIpRouter } from "./ipRequest";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(ipRequestRouter);
router.use(serverIpRouter);

export default router;
