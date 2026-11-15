
import { Router } from "express";

import {
  createBeatController,
  getBeatsController,
  getBeatByIdController,
  updateBeatController,
  deleteBeatController,
  restoreBeatController,
  getMyBeatsController,
  publishBeatController,
  unpublishBeatController,
} from "../controllers/beat.controller.js";

import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";
import { uploadBeatAudio } from "../middlewares/beat-upload.middleware.js";
const router = Router();

// Public routes
router.get("/", getBeatsController);
router.get(
  "/my",
  authenticate,
  authorize("producer"),
  getMyBeatsController
);
router.get("/:id", getBeatByIdController);

// Protected routes
router.post(
  "/",
  authenticate,
  authorize("producer"),
  uploadBeatAudio,
  createBeatController
);

router.put(
  "/:id",
  authenticate,
  authorize("producer"),
  uploadBeatAudio,
  updateBeatController
);

router.delete(
  "/:id",
  authenticate,
  authorize("producer"),
  deleteBeatController
);

router.patch(
  "/:id/restore",
  authenticate,
  authorize("producer"),
  restoreBeatController
);



router.patch(
  "/:id/publish",
  authenticate,
  authorize("producer"),
  publishBeatController
);
router.patch(
  "/:id/unpublish",
  authenticate,
  authorize("producer"),
  unpublishBeatController
);
export default router;
