
import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";

import {
  getAdminDashboardController,
  getAllUsersController,
  updateUserStatusController,
  getAllBeatsController,
  getAllReviewReportsController,
  updateReviewReportStatusController,
} from "../controllers/admin.controller.js";
const router = Router();

router.use(authenticate);
router.use(authorize("admin"));
router.patch("/users/:userId/status", updateUserStatusController);
router.get("/dashboard", getAdminDashboardController);
router.get("/users", getAllUsersController);
router.get("/beats", getAllBeatsController);
// Review reports
router.get("/reports", getAllReviewReportsController);

router.patch(
  "/reports/:reportId",
  updateReviewReportStatusController,
);
export default router;
