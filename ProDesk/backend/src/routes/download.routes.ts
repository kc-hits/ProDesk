import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  downloadBeatController,
  downloadCustomOrderController,
  getPurchasedBeatsController,
} from "../controllers/download.controller.js";

const router = Router();

router.use(authenticate);

// Get artist's purchased beats.
router.get(
  "/purchased",
  authorize("artist"),
  getPurchasedBeatsController,
);

// Artist downloads a delivered custom order.
router.get(
  "/custom-orders/:customOrderId",
  authorize("artist"),
  downloadCustomOrderController,
);

// Artist downloads a purchased beat.
router.get(
  "/:orderItemId",
  authorize("artist"),
  downloadBeatController,
);

export default router;