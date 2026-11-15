import { Request, Response, NextFunction } from "express";
import {
  getOrCreateCart,
  addToCart,
  getCartItems,
  removeCartItem,
} from "../services/cart.service.js";

export const getCartController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;

    const cart = await getOrCreateCart(artistId);

    return res.status(200).json({
      message: "Cart retrieved successfully.",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCartController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;
    const { beatId, beatLicenseId } = req.body;

    if (!beatId || !beatLicenseId) {
      return res.status(400).json({
        message: "Beat ID and license ID are required.",
      });
    }

    const result = await addToCart({
      artistId,
      beatId,
      beatLicenseId,
    });

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(201).json({
      message: result.message,
      item: result.item,
    });
  } catch (error) {
    next(error);
  }
};
export const getCartItemsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;

    const cart = await getCartItems(artistId);

    return res.status(200).json({
      message: "Cart items retrieved successfully.",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartItemController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;
    const itemId = req.params.itemId;

    if (typeof itemId !== "string") {
      return res.status(400).json({
        message: "Invalid cart item ID.",
      });
    }
    const result = await removeCartItem(artistId, itemId);

    if (!result.success) {
      return res.status(404).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
