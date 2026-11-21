import type { Request, Response, NextFunction } from "express";
import { access } from "node:fs/promises";
import {
  getDownloadFile,
  releaseDownloadAttempt,
  getCustomOrderDownloadFile,
  getPurchasedBeats
} from "../services/download.service.js";

export const downloadBeatController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const artistId = res.locals.auth.userId;
  const orderItemId = req.params.orderItemId;

  if (typeof orderItemId !== "string") {
    res.status(400).json({
      message: "Invalid order item ID.",
    });
    return;
  }

  try {
    const result = await getDownloadFile(artistId, orderItemId);

    if (
      !result.success ||
      !result.filePath ||
      !result.fileName ||
      !result.permissionId
    ) {
      res.status(403).json({
        message: result.message,
      });
      return;
    }

    // بررسی وجود فایل قبل از ارسال
    try {
      await access(result.filePath);
    } catch {
      await releaseDownloadAttempt(result.permissionId);

      res.status(404).json({
        message: "Original audio file not found.",
      });
      return;
    }

    res.download(result.filePath, result.fileName, async (error) => {
      if (error) {
        try {
          await releaseDownloadAttempt(result.permissionId!);
        } catch (releaseError) {
          console.error("Failed to release download attempt:", releaseError);
        }

        if (res.headersSent) {
          next(error);
          return;
        }

        res.status(500).json({
          message: "File download failed.",
        });
      }
    });
  } catch (error) {
    next(error);
  }
};
export const downloadCustomOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const artistId = res.locals.auth.userId;
  const customOrderId = req.params.customOrderId;

  if (typeof customOrderId !== "string") {
    res.status(400).json({
      message: "Invalid custom order ID.",
    });
    return;
  }

  try {
    const result = await getCustomOrderDownloadFile(
      artistId,
      customOrderId,
    );

    if (!result.success || !result.filePath || !result.fileName) {
      res.status(403).json({
        message: result.message,
      });
      return;
    }

    try {
      await access(result.filePath);
    } catch {
      res.status(404).json({
        message: "Delivery file not found.",
      });
      return;
    }

    res.download(result.filePath, result.fileName, (error) => {
      if (error) {
        if (res.headersSent) {
          next(error);
          return;
        }

        res.status(500).json({
          message: "File download failed.",
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchasedBeatsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const artistId = res.locals.auth.userId;

    const beats = await getPurchasedBeats(artistId);

    res.status(200).json({
      message: "Purchased beats retrieved successfully.",
      beats,
    });
  } catch (error) {
    next(error);
  }
};
