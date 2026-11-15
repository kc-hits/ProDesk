import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

import {
  createCustomOrderController,
  getMyCustomOrdersController,
  proposeCustomOrderController,
  rejectCustomOrderProposalController,
  acceptCustomOrderProposalController,
  completeCustomOrderController,
  retryCustomOrderPaymentController,
  downloadCustomOrderDeliveryController,
} from "../controllers/custom-order.controller.js";
import { customOrderUpload } from "../middlewares/custom-order-upload.middleware.js";
import { deliverCustomOrderController } from "../controllers/custom-order.controller.js";
const router = Router();

router.use(authenticate);
// Artist and Producer view their own custom orders.
router.get("/my", authorize("artist", "producer"), getMyCustomOrdersController);
// Artist creates a custom order.
router.post("/", authorize("artist"), createCustomOrderController);
// Producer proposes price and delivery time.
router.patch(
  "/:orderId/propose",
  authorize("producer"),
  proposeCustomOrderController,
);
// Artist rejects the producer's proposal.
router.patch(
  "/:orderId/reject",
  authorize("artist"),
  rejectCustomOrderProposalController,
);
// Artist accepts the producer's proposal.
router.patch(
  "/:orderId/accept",
  authorize("artist"),
  acceptCustomOrderProposalController,
);
// Producer uploads the completed custom order.
router.post(
  "/:orderId/deliver",
  authorize("producer"),
  customOrderUpload.single("file"),
  deliverCustomOrderController,
);
router.get(
  "/:orderId/delivery/download",
  authorize("artist"),
  downloadCustomOrderDeliveryController,
);
router.patch(
  "/:orderId/complete",
  authorize("artist"),
  completeCustomOrderController,
);
export default router;
