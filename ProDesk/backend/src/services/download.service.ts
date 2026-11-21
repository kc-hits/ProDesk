import { pool } from "../config/database.js";
import { resolveStoragePath } from "../config/storage.js";
import path from "node:path";
interface DownloadResult {
  success: boolean;
  message: string;
  permissionId?: string;
  filePath?: string;
  fileName?: string;
}

export const getDownloadFile = async (
  artistId: string,
  orderItemId: string,
): Promise<DownloadResult> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          dp.id AS permission_id,
          dp.download_count,
          dp.max_downloads,
          dp.expires_at,
          dp.revoked_at,
          oi.original_audio_storage_key,
          oi.beat_title,
          o.status AS order_status,
          p.status AS payment_status
        FROM download_permissions dp
        JOIN order_items oi
          ON oi.id = dp.order_item_id
        JOIN orders o
          ON o.id = oi.order_id
        JOIN payments p
          ON p.order_id = o.id
         AND p.status = 'successful'
        WHERE dp.order_item_id = $1
          AND dp.artist_id = $2
        FOR UPDATE OF dp
      `,
      [orderItemId, artistId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Download permission not found." };
    }

    const permission = result.rows[0];

    if (permission.order_status !== "completed") {
      await client.query("ROLLBACK");
      return { success: false, message: "Order is not completed." };
    }

    if (permission.revoked_at) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Download permission has been revoked.",
      };
    }

    if (
      permission.expires_at &&
      new Date(permission.expires_at).getTime() <= Date.now()
    ) {
      await client.query("ROLLBACK");
      return { success: false, message: "Download permission has expired." };
    }

    if (
      permission.max_downloads !== null &&
      permission.download_count >= permission.max_downloads
    ) {
      await client.query("ROLLBACK");
      return { success: false, message: "Download limit has been reached." };
    }

    if (!permission.original_audio_storage_key) {
      await client.query("ROLLBACK");
      return { success: false, message: "Original audio file not found." };
    }

    const filePath = resolveStoragePath(permission.original_audio_storage_key);

    // رزرو یک دانلود قبل از ارسال فایل
    await client.query(
      `
        UPDATE download_permissions
        SET download_count = download_count + 1
        WHERE id = $1
      `,
      [permission.permission_id],
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Download permission verified.",
      permissionId: permission.permission_id,
      filePath,
      fileName: `${permission.beat_title}${path.extname(
        permission.original_audio_storage_key,
      )}`,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// برگرداندن شمارنده در صورت شکست ارسال فایل
export const releaseDownloadAttempt = async (
  permissionId: string,
): Promise<void> => {
  await pool.query(
    `
      UPDATE download_permissions
      SET download_count = GREATEST(download_count - 1, 0)
      WHERE id = $1
    `,
    [permissionId],
  );
};
export const getCustomOrderDownloadFile = async (
  artistId: string,
  customOrderId: string,
): Promise<DownloadResult> => {
  const result = await pool.query(
    `
      SELECT
        co.id AS custom_order_id,
        co.status AS order_status,
        d.file_storage_key
      FROM custom_orders co
      JOIN custom_order_deliveries d
        ON d.custom_order_id = co.id
      WHERE co.id = $1
        AND co.artist_id = $2
        AND co.payment_status = 'successful'
        AND co.status IN ('delivered', 'completed')
        AND EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.custom_order_id = co.id
            AND p.artist_id = co.artist_id
            AND p.status = 'successful'
        )
      ORDER BY d.created_at DESC
      LIMIT 1
    `,
    [customOrderId, artistId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      message: "Custom order download is not available.",
    };
  }

  const delivery = result.rows[0];

  if (!delivery.file_storage_key) {
    return {
      success: false,
      message: "Delivery file not found.",
    };
  }

  const filePath = resolveStoragePath(delivery.file_storage_key);
  const fileExtension = path.extname(delivery.file_storage_key);

  return {
    success: true,
    message: "Custom order download verified.",
    filePath,
    fileName: `custom-order-${customOrderId}${fileExtension}`,
  };
};

export const getPurchasedBeats = async (artistId: string) => {
  const result = await pool.query(
    `
      SELECT
        dp.id AS download_permission_id,
        oi.id AS order_item_id,
        oi.beat_id,
        oi.beat_title,
        oi.producer_name,
        oi.license_name,
        oi.unit_price,
        o.currency,
        dp.download_count,
        dp.max_downloads,
        dp.expires_at,
        dp.created_at AS purchased_at,

        CASE
          WHEN dp.revoked_at IS NOT NULL THEN FALSE

          WHEN dp.expires_at IS NOT NULL
            AND dp.expires_at <= NOW()
            THEN FALSE

          WHEN dp.max_downloads IS NOT NULL
            AND dp.download_count >= dp.max_downloads
            THEN FALSE

          WHEN oi.original_audio_storage_key IS NULL
            THEN FALSE

          ELSE TRUE
        END AS can_download

      FROM download_permissions dp

      JOIN order_items oi
        ON oi.id = dp.order_item_id

      JOIN orders o
        ON o.id = oi.order_id

      WHERE
        dp.artist_id = $1
        AND o.artist_id = $1
        AND o.status = 'completed'

        AND EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.order_id = o.id
            AND p.artist_id = o.artist_id
            AND p.status = 'successful'
        )

      ORDER BY dp.created_at DESC
    `,
    [artistId],
  );

  return result.rows;
};
