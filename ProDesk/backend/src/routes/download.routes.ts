
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { downloadBeatController,  downloadCustomOrderController,
 } from "../controllers/download.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/:orderItemId",
  authorize("artist"),
  downloadBeatController
);
// Artist downloads a delivered custom order.
router.get(
  "/custom-orders/:customOrderId",
  authorize("artist"),
  downloadCustomOrderController,
);
export default router;
