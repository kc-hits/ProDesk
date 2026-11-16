
import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";
import {
  getFavoritesController,
  addFavoriteController,
  removeFavoriteController,
  checkFavoriteController,
} from "../controllers/favorite.controller.js";

const router = Router();

// All favorite routes require authentication and artist role
router.use(authenticate, authorize("artist"));

// Get all favorites
router.get("/", getFavoritesController);

// Check if a beat is favorite
router.get("/check/:beatId", checkFavoriteController);

// Add a beat to favorites
router.post("/:beatId", addFavoriteController);

// Remove a beat from favorites
router.delete("/:beatId", removeFavoriteController);

export default router;
