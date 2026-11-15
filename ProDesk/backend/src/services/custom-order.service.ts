import { pool } from "../config/database.js";

interface CreateCustomOrderData {
  artistId: string;
  producerId: string;
  title: string;
  description: string;
  genreId?: string | null;
  referenceAudioUrl?: string | null;
}

interface CustomOrderResult {
  success: boolean;
  message: string;
  order?: Record<string, unknown>;
}

export const createCustomOrder = async (
  data: CreateCustomOrderData,
): Promise<CustomOrderResult> => {
  const {
    artistId,
    producerId,
    title,
    description,
    genreId,
    referenceAudioUrl,
  } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify that the producer exists and is active.
    const producerResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
          AND role = 'producer'
          AND status = 'active'
        FOR SHARE
      `,
      [producerId],
    );

    if (producerResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Producer not found or inactive.",
      };
    }

    // Verify the genre if provided.
    if (genreId) {
      const genreResult = await client.query(
        `
          SELECT id
          FROM genres
          WHERE id = $1
        `,
        [genreId],
      );

      if (genreResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return {
          success: false,
          message: "Genre not found.",
        };
      }
    }

    // Create the custom order.
    const orderResult = await client.query(
      `
        INSERT INTO custom_orders (
          artist_id,
          producer_id,
          title,
          description,
          genre_id,
          reference_audio_url,
          status,
          payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'unpaid')
        RETURNING
          id,
          artist_id,
          producer_id,
          title,
          description,
          genre_id,
          reference_audio_url,
          status,
          payment_status,
          created_at
      `,
      [
        artistId,
        producerId,
        title,
        description,
        genreId ?? null,
        referenceAudioUrl ?? null,
      ],
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Custom order created successfully.",
      order: orderResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


export const getMyCustomOrders = async (
  userId: string,
  role: "artist" | "producer",
) => {
  const column = role === "artist" ? "artist_id" : "producer_id";

  const otherUserColumn =
    role === "artist" ? "co.producer_id" : "co.artist_id";

  const result = await pool.query(
    `
      SELECT
        co.id,
        co.artist_id,
        co.producer_id,
        co.title,
        co.description,
        co.genre_id,
        co.reference_audio_url,
        co.proposed_price,
        co.delivery_days,
        co.status,
        co.payment_status,
        co.created_at,
        co.updated_at,
        u.full_name AS other_user_name,

        payment.id AS payment_id,

        delivery.id AS delivery_id,
        delivery.delivery_message,
        delivery.created_at AS delivery_created_at

      FROM custom_orders co

      JOIN users u
        ON u.id = ${otherUserColumn}

      LEFT JOIN LATERAL (
        SELECT
          id
        FROM payments
        WHERE custom_order_id = co.id
        ORDER BY created_at DESC
        LIMIT 1
      ) payment ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          id,
          delivery_message,
          created_at
        FROM custom_order_deliveries
        WHERE custom_order_id = co.id
        ORDER BY created_at DESC
        LIMIT 1
      ) delivery ON TRUE

      WHERE co.${column} = $1
      ORDER BY co.created_at DESC
    `,
    [userId],
  );

  return result.rows;
};



interface ProposeCustomOrderData {
  orderId: string;
  producerId: string;
  proposedPrice: number;
  deliveryDays: number;
}

export const proposeCustomOrder = async (data: ProposeCustomOrderData) => {
  const { orderId, producerId, proposedPrice, deliveryDays } = data;

  const result = await pool.query(
    `
      UPDATE custom_orders
      SET
        proposed_price = $1,
        delivery_days = $2,
        status = 'proposed',
        updated_at = NOW()
      WHERE id = $3
        AND producer_id = $4
        AND status = 'pending'
      RETURNING *
    `,
    [proposedPrice, deliveryDays, orderId, producerId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      message: "Custom order not found or cannot be proposed.",
    };
  }

  return {
    success: true,
    message: "Custom order proposal submitted successfully.",
    order: result.rows[0],
  };
};
export const rejectCustomOrderProposal = async (
  orderId: string,
  artistId: string,
) => {
  const result = await pool.query(
    `
      UPDATE custom_orders
      SET
        status = 'rejected',
        updated_at = NOW()
      WHERE id = $1
        AND artist_id = $2
        AND status = 'proposed'
      RETURNING *
    `,
    [orderId, artistId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      message: "Custom order proposal not found or cannot be rejected.",
    };
  }

  return {
    success: true,
    message: "Custom order proposal rejected successfully.",
    order: result.rows[0],
  };
};

export const acceptCustomOrderProposal = async (
  orderId: string,
  artistId: string,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT
          id,
          artist_id,
          proposed_price,
          status
        FROM custom_orders
        WHERE id = $1
          AND artist_id = $2
        FOR UPDATE
      `,
      [orderId, artistId],
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Custom order not found.",
      };
    }

    const order = orderResult.rows[0];

    if (
      order.status !== "proposed" ||
      !order.proposed_price ||
      Number(order.proposed_price) <= 0
    ) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Custom order proposal cannot be accepted.",
      };
    }

    const existingPayment = await client.query(
      `
        SELECT id, status
        FROM payments
        WHERE custom_order_id = $1
          AND status IN ('pending', 'processing', 'successful')
        LIMIT 1
      `,
      [orderId],
    );

    if (existingPayment.rows.length > 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "An active payment already exists for this order.",
      };
    }

    const paymentResult = await client.query(
      `
        INSERT INTO payments (
          artist_id,
          custom_order_id,
          amount,
          currency,
          status
        )
        VALUES ($1, $2, $3, 'IRT', 'pending')
        RETURNING
          id,
          custom_order_id,
          amount,
          currency,
          status,
          created_at
      `,
      [artistId, orderId, order.proposed_price],
    );

    const updatedOrderResult = await client.query(
      `
        UPDATE custom_orders
        SET
          status = 'awaiting_payment',
          payment_status = 'pending',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [orderId],
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Custom order proposal accepted successfully.",
      order: updatedOrderResult.rows[0],
      payment: paymentResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

interface DeliverCustomOrderData {
  orderId: string;
  producerId: string;
  fileStorageKey: string;
  deliveryMessage?: string | null;
}

export const deliverCustomOrder = async (data: DeliverCustomOrderData) => {
  const { orderId, producerId, fileStorageKey, deliveryMessage } = data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT
          id,
          producer_id,
          status,
          payment_status
        FROM custom_orders
        WHERE id = $1
          AND producer_id = $2
        FOR UPDATE
      `,
      [orderId, producerId],
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Custom order not found.",
      };
    }

    const order = orderResult.rows[0];

    if (
      order.status !== "in_progress" ||
      order.payment_status !== "successful"
    ) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Custom order is not ready for delivery.",
      };
    }

    const deliveryResult = await client.query(
      `
        INSERT INTO custom_order_deliveries (
          custom_order_id,
          producer_id,
          file_storage_key,
          delivery_message
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          custom_order_id,
          producer_id,
          delivery_message,
          created_at
      `,
      [orderId, producerId, fileStorageKey, deliveryMessage ?? null],
    );

    const updatedOrderResult = await client.query(
      `
        UPDATE custom_orders
        SET
          status = 'delivered',
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, status, updated_at
      `,
      [orderId],
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Custom order delivered successfully.",
      delivery: deliveryResult.rows[0],
      order: updatedOrderResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
export const completeCustomOrder = async (
  orderId: string,
  artistId: string,
) => {
  const result = await pool.query(
    `
      UPDATE custom_orders
      SET
        status = 'completed',
        updated_at = NOW()
      WHERE id = $1
        AND artist_id = $2
        AND status = 'delivered'
        AND payment_status = 'successful'
      RETURNING id, status, updated_at
    `,
    [orderId, artistId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      message: "Custom order cannot be completed.",
    };
  }

  return {
    success: true,
    message: "Custom order completed successfully.",
    order: result.rows[0],
  };
};

export const retryCustomOrderPayment = async (
  orderId: string,
  artistId: string,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the custom order.
    const orderResult = await client.query(
      `
        SELECT
          id,
          artist_id,
          proposed_price,
          status,
          payment_status
        FROM custom_orders
        WHERE id = $1
          AND artist_id = $2
        FOR UPDATE
      `,
      [orderId, artistId],
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Custom order not found.",
      };
    }

    const order = orderResult.rows[0];

    if (
      order.status !== "awaiting_payment" ||
      order.payment_status !== "failed" ||
      !order.proposed_price ||
      Number(order.proposed_price) <= 0
    ) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "Custom order is not eligible for payment retry.",
      };
    }

    // Verify that a previous failed payment exists.
    const failedPaymentResult = await client.query(
      `
        SELECT id
        FROM payments
        WHERE custom_order_id = $1
          AND artist_id = $2
          AND status = 'failed'
        LIMIT 1
      `,
      [orderId, artistId],
    );

    if (failedPaymentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        success: false,
        message: "No failed payment found for this order.",
      };
    }

    // Create a new payment.
    const paymentResult = await client.query(
      `
        INSERT INTO payments (
          artist_id,
          custom_order_id,
          amount,
          currency,
          status
        )
        VALUES ($1, $2, $3, 'IRT', 'pending')
        RETURNING
          id,
          custom_order_id,
          amount,
          currency,
          status,
          created_at
      `,
      [artistId, orderId, order.proposed_price],
    );

    // Update the order payment status.
    const updatedOrderResult = await client.query(
      `
        UPDATE custom_orders
        SET
          payment_status = 'pending',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [orderId],
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: "Payment retry created successfully.",
      order: updatedOrderResult.rows[0],
      payment: paymentResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
export const getCustomOrderDeliveryFile = async (
  orderId: string,
  artistId: string,
) => {
  const result = await pool.query(
    `
      SELECT
        cod.id,
        cod.file_storage_key,
        cod.delivery_message,
        cod.created_at
      FROM custom_orders co
      JOIN custom_order_deliveries cod
        ON cod.custom_order_id = co.id
      WHERE co.id = $1
        AND co.artist_id = $2
        AND co.status IN ('delivered', 'completed')
        AND co.payment_status = 'successful'
      ORDER BY cod.created_at DESC
      LIMIT 1
    `,
    [orderId, artistId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};