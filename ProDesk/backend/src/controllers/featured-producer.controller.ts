
import type { Request, Response } from "express";
import { getFeaturedProducers } from "../services/featured-producer.service.js";

export const getFeaturedProducersController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const producers = await getFeaturedProducers();

    return res.status(200).json({
      success: true,
      producers,
    });
  } catch (error) {
    console.error("Get featured producers error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در دریافت تهیه‌کنندگان منتخب.",
    });
  }
};
