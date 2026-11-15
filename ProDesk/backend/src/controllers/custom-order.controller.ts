import { Request, Response, NextFunction } from "express";
import {
  createCustomOrder,
  getMyCustomOrders,
  proposeCustomOrder,
  rejectCustomOrderProposal,
  acceptCustomOrderProposal,
  deliverCustomOrder,
  completeCustomOrder,
  retryCustomOrderPayment,
  getCustomOrderDeliveryFile,
} from "../services/custom-order.service.js";
import fs from "node:fs";
import { resolveStoragePath } from "../config/storage.js";
export const createCustomOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;

    const { producerId, title, description, genreId, referenceAudioUrl } =
      req.body;

    if (
      typeof producerId !== "string" ||
      typeof title !== "string" ||
      typeof description !== "string" ||
      !producerId.trim() ||
      !title.trim() ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "Producer, title, and description are required.",
      });
    }

    if (
      genreId !== undefined &&
      genreId !== null &&
      typeof genreId !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid genre ID.",
      });
    }

    if (
      referenceAudioUrl !== undefined &&
      referenceAudioUrl !== null &&
      typeof referenceAudioUrl !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid reference audio URL.",
      });
    }

    const result = await createCustomOrder({
      artistId,
      producerId,
      title: title.trim(),
      description: description.trim(),
      genreId,
      referenceAudioUrl,
    });

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(201).json({
      message: result.message,
      order: result.order,
    });
  } catch (error) {
    next(error);
  }
};
export const getMyCustomOrdersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = res.locals.auth.userId;
    const role = res.locals.auth.role as "artist" | "producer";

    const orders = await getMyCustomOrders(userId, role);

    return res.status(200).json({
      message: "Custom orders retrieved successfully.",
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const proposeCustomOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const producerId = res.locals.auth.userId;
    const orderId = req.params.orderId;

    if (typeof orderId !== "string") {
      return res.status(400).json({
        message: "Invalid custom order ID.",
      });
    }
    const { proposedPrice, deliveryDays } = req.body;

    if (
      typeof proposedPrice !== "number" ||
      !Number.isFinite(proposedPrice) ||
      proposedPrice <= 0 ||
      !Number.isInteger(deliveryDays) ||
      deliveryDays <= 0
    ) {
      return res.status(400).json({
        message: "A valid proposed price and delivery days are required.",
      });
    }

    const result = await proposeCustomOrder({
      orderId,
      producerId,
      proposedPrice,
      deliveryDays,
    });

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: result.message,
      order: result.order,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectCustomOrderProposalController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;
    const orderId = req.params.orderId;

    if (typeof orderId !== "string") {
      return res.status(400).json({
        message: "Invalid custom order ID.",
      });
    }

    const result = await rejectCustomOrderProposal(orderId, artistId);

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: result.message,
      order: result.order,
    });
  } catch (error) {
    next(error);
  }
};
export const acceptCustomOrderProposalController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;
    const orderId = req.params.orderId;

    if (typeof orderId !== "string") {
      return res.status(400).json({
        message: "Invalid custom order ID.",
      });
    }

    const result = await acceptCustomOrderProposal(orderId, artistId);

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: result.message,
      order: result.order,
      payment: result.payment,
    });
  } catch (error) {
    next(error);
  }
};

import { unlink } from "node:fs/promises";
import path from "node:path";
import { STORAGE_PATHS } from "../config/storage.js";

export const deliverCustomOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const uploadedFile = req.file;

  try {
    const producerId = res.locals.auth.userId;
    const orderId = req.params.orderId;
    const { deliveryMessage } = req.body;

    if (typeof orderId !== "string") {
      return res.status(400).json({
        message: "Invalid custom order ID.",
      });
    }

    if (!uploadedFile) {
      return res.status(400).json({
        message: "Delivery audio file is required.",
      });
    }

    if (deliveryMessage !== undefined && typeof deliveryMessage !== "string") {
      await unlink(uploadedFile.path);

      return res.status(400).json({
        message: "Invalid delivery message.",
      });
    }

    const result = await deliverCustomOrder({
      orderId,
      producerId,
      fileStorageKey: path.posix.join("custom-orders", uploadedFile.filename),
      deliveryMessage: deliveryMessage?.trim() || null,
    });

    if (!result.success) {
      await unlink(uploadedFile.path);

      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: result.message,
      delivery: result.delivery,
      order: result.order,
    });
  } catch (error) {
    if (uploadedFile) {
      await unlink(uploadedFile.path).catch(() => undefined);
    }

    next(error);
  }
};
export const completeCustomOrderController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const artistId = res.locals.auth.userId;
  const orderId = req.params.orderId;

  if (typeof orderId !== "string") {
    res.status(400).json({ message: "Invalid custom order ID." });
    return;
  }

  try {
    const result = await completeCustomOrder(orderId, artistId);

    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    res.status(200).json({
      message: result.message,
      order: result.order,
    });
  } catch (error) {
    next(error);
  }
};

export const retryCustomOrderPaymentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;
    const orderId = req.params.orderId;

    if (typeof orderId !== "string") {
      return res.status(400).json({
        message: "Invalid custom order ID.",
      });
    }

    const result = await retryCustomOrderPayment(orderId, artistId);

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
      });
    }

    return res.status(201).json({
      message: result.message,
      order: result.order,
      payment: result.payment,
    });
  } catch (error) {
    next(error);
  }
};
export const downloadCustomOrderDeliveryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const artistId = res.locals.auth.userId;
    const orderId = req.params.orderId;

    if (typeof orderId !== "string" || !orderId.trim()) {
      return res.status(400).json({
        message: "Order ID is required.",
      });
    }
 

    const delivery = await getCustomOrderDeliveryFile(orderId, artistId);

    if (!delivery) {
      return res.status(404).json({
        message: "Delivery file not found.",
      });
    }

    const filePath = resolveStoragePath(delivery.file_storage_key);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Delivery file does not exist.",
      });
    }

    return res.download(filePath, path.basename(filePath), (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};
