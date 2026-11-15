import type { Request, Response } from "express";

import {
  getAdminDashboard,
  getAllUsers,
  updateUserStatus,
  getAllBeats,
} from "../services/admin.service.js";
export const getAdminDashboardController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const dashboard = await getAdminDashboard();

    return res.status(200).json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در دریافت اطلاعات داشبورد مدیریت.",
    });
  }
};

export const getAllUsersController = async (_req: Request, res: Response) => {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در دریافت لیست کاربران.",
    });
  }
};

export const updateUserStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = String(req.params.userId);
    const { status } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "شناسه کاربر الزامی است.",
      });
    }

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "وضعیت کاربر معتبر نیست.",
      });
    }

    if (userId === res.locals.auth.userId) {
      return res.status(403).json({
        success: false,
        message: "امکان تغییر وضعیت حساب خودتان وجود ندارد.",
      });
    }

    const user = await updateUserStatus(userId, status);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "کاربر موردنظر پیدا نشد.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "وضعیت کاربر با موفقیت تغییر کرد.",
      user,
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در تغییر وضعیت کاربر.",
    });
  }
};
export const getAllBeatsController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const beats = await getAllBeats();

    return res.status(200).json({
      success: true,
      beats,
    });
  } catch (error) {
    console.error("Get all beats error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در دریافت لیست بیت‌ها.",
    });
  }
};