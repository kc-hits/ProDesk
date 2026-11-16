
import type { Request, Response } from "express";

import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
} from "../services/favorite.service.js";

// Get user's favorites
export const getFavoritesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const auth = res.locals.auth as { userId: string } | undefined;
    const userId = auth?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const favorites = await getUserFavorites(userId);

    return res.status(200).json({ favorites });
  } catch (error) {
    console.error("Get favorites error:", error);

    return res.status(500).json({
      message: "Failed to fetch favorites.",
    });
  }
};

// Add beat to favorites
export const addFavoriteController = async (
  req: Request,
  res: Response,
) => {
  try {
    const auth = res.locals.auth as { userId: string } | undefined;
    const userId = auth?.userId;
const beatId = String(req.params.beatId);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const favorite = await addFavorite(userId, beatId);

    if (!favorite) {
      const alreadyFavorite = await isFavorite(userId, beatId);

      if (alreadyFavorite) {
        return res.status(200).json({
          message: "Beat is already in favorites.",
        });
      }

      return res.status(404).json({
        message: "Beat not found or not published.",
      });
    }

    return res.status(201).json({
      message: "Beat added to favorites.",
      favorite,
    });
  } catch (error) {
    console.error("Add favorite error:", error);

    return res.status(500).json({
      message: "Failed to add favorite.",
    });
  }
};

// Remove beat from favorites
export const removeFavoriteController = async (
  req: Request,
  res: Response,
) => {
  try {
    const auth = res.locals.auth as { userId: string } | undefined;
    const userId = auth?.userId;
const beatId = String(req.params.beatId);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const favorite = await removeFavorite(userId, beatId);

    if (!favorite) {
      return res.status(404).json({
        message: "Favorite not found.",
      });
    }

    return res.status(200).json({
      message: "Beat removed from favorites.",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);

    return res.status(500).json({
      message: "Failed to remove favorite.",
    });
  }
};

// Check favorite status
export const checkFavoriteController = async (
  req: Request,
  res: Response,
) => {
  try {
    const auth = res.locals.auth as { userId: string } | undefined;
    const userId = auth?.userId;
const beatId = String(req.params.beatId);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const favorite = await isFavorite(userId, beatId);

    return res.status(200).json({
      isFavorite: favorite,
    });
  } catch (error) {
    console.error("Check favorite error:", error);

    return res.status(500).json({
      message: "Failed to check favorite.",
    });
  }
};
