
import type { Request, Response } from "express";
import { getArtistDashboard } from "../services/artist-dashboard.service.js";

export const getArtistDashboardController = async (
  req: Request,
  res: Response,
) => {
  try {
    const artistId = res.locals.auth.userId;

    const dashboard = await getArtistDashboard(artistId);

    return res.status(200).json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error("Get artist dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در دریافت اطلاعات داشبورد هنرمند.",
    });
  }
};
