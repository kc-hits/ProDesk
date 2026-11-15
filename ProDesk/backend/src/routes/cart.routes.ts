import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";
import { getCartController,addToCartController,getCartItemsController,removeCartItemController } from "../controllers/cart.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("artist"),
  getCartController,
);
router.post(
  "/items",
  authorize("artist"),
  addToCartController,
);
router.get(
  "/items",
  authorize("artist"),
  getCartItemsController,
);

router.delete(
  "/items/:itemId",
  authorize("artist"),
  removeCartItemController,
);

export default router;