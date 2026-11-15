
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
} from "../controllers/admin.controller.js";
const router = Router();

router.use(authenticate);
router.use(authorize("admin"));
router.patch("/users/:userId/status", updateUserStatusController);
router.get("/dashboard", getAdminDashboardController);
router.get("/users", getAllUsersController);
router.get("/beats", getAllBeatsController);
export default router;
