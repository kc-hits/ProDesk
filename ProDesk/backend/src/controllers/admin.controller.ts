import type { Request, Response } from "express";

import {
  getAdminDashboard,
  getAllUsers,
  updateUserStatus,
  getAllBeats,
  getAllReviewReports,
  updateReviewReportStatus,
  type ReviewReportStatus,
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
export const getAllBeatsController = async (_req: Request, res: Response) => {
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

export const getAllReviewReportsController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const reports = await getAllReviewReports();

    return res.status(200).json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Get review reports error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در دریافت گزارش‌ها.",
    });
  }
};

export const updateReviewReportStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const reportId = String(req.params.reportId ?? "");
    const { status, adminNote } = req.body;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: "شناسه گزارش الزامی است.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "وضعیت گزارش معتبر نیست.",
      });
    }

    if (
      adminNote !== undefined &&
      adminNote !== null &&
      typeof adminNote !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "یادداشت ادمین معتبر نیست.",
      });
    }

    if (
      typeof adminNote === "string" &&
      adminNote.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "یادداشت ادمین نباید بیشتر از ۱۰۰۰ کاراکتر باشد.",
      });
    }

    const report = await updateReviewReportStatus(
      reportId,
      status as ReviewReportStatus,
      typeof adminNote === "string"
        ? adminNote.trim() || null
        : null,
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "گزارش پیدا نشد یا قبلاً بررسی شده است.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "وضعیت گزارش با موفقیت تغییر کرد.",
      report,
    });
  } catch (error) {
    console.error("Update review report status error:", error);

    return res.status(500).json({
      success: false,
      message: "خطا در بررسی گزارش.",
    });
  }
};
