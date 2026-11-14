
import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";
import {
  getArtistDashboardController,
} from "../controllers/artist-dashboard.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/dashboard",
  authorize("artist"),
  getArtistDashboardController,
);

export default router;
