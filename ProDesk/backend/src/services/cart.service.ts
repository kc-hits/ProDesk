
import { pool } from "../config/database.js";

export const getOrCreateCart = async (artistId: string) => {
  const result = await pool.query(
    `
      INSERT INTO carts (artist_id)
      VALUES ($1)
      ON CONFLICT (artist_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id, artist_id, created_at, updated_at
    `,
    [artistId],
  );

  return result.rows[0];
};

interface AddToCartData {
  artistId: string;
  beatId: string;
  beatLicenseId: string;
}

export const addToCart = async (data: AddToCartData) => {
  const cart = await getOrCreateCart(data.artistId);

  const beatResult = await pool.query(
    `
      SELECT
        b.id,
        b.status,
        bl.id AS beat_license_id,
        bl.is_available,
        bl.is_exclusive
      FROM beats b
      JOIN beat_licenses bl
        ON bl.beat_id = b.id
      WHERE b.id = $1
        AND bl.id = $2
    `,
    [data.beatId, data.beatLicenseId],
  );

  if (beatResult.rows.length === 0) {
    return {
      success: false,
      message: "Beat or license not found.",
    };
  }

  const beat = beatResult.rows[0];

  if (beat.status !== "published" || !beat.is_available) {
    return {
      success: false,
      message: "This beat is not available for purchase.",
    };
  }

  // Check active reservation for exclusive licenses.
  if (beat.is_exclusive) {
    const reservationResult = await pool.query(
      `
        SELECT 1
        FROM exclusive_beat_reservations
        WHERE beat_id = $1
          AND expires_at > NOW()
        LIMIT 1
      `,
      [data.beatId],
    );

    if (reservationResult.rows.length > 0) {
      return {
        success: false,
        message: "This exclusive license is currently reserved.",
      };
    }
  }

  const result = await pool.query(
    `
      INSERT INTO cart_items (
        cart_id,
        beat_id,
        beat_license_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, beat_id)
      DO UPDATE SET
        beat_license_id = EXCLUDED.beat_license_id
      RETURNING id, cart_id, beat_id, beat_license_id, added_at
    `,
    [cart.id, data.beatId, data.beatLicenseId],
  );

  return {
    success: true,
    message: "Beat added to cart successfully.",
    item: result.rows[0],
  };
};

export const getCartItems = async (artistId: string) => {
  const cart = await getOrCreateCart(artistId);

  // Remove unavailable or unpublished beats from the cart.
  await pool.query(
    `
      DELETE FROM cart_items ci
      USING beat_licenses bl, beats b
      WHERE ci.cart_id = $1
        AND bl.id = ci.beat_license_id
        AND b.id = ci.beat_id
        AND (
          bl.is_available = FALSE
          OR b.status <> 'published'
        )
    `,
    [cart.id],
  );

  const result = await pool.query(
    `
      SELECT
        ci.id AS cart_item_id,
        ci.added_at,

        b.id AS beat_id,
        b.title AS beat_title,
        b.cover_image_url,
        b.preview_audio_url,
        b.bpm,
        b.musical_key,

        COALESCE(
          NULLIF(pp.producer_name, ''),
          u.full_name
        ) AS producer_name,

        g.name AS genre_name,
        s.name AS subgenre_name,

        bl.id AS beat_license_id,
        bl.price,
        bl.is_exclusive,

        l.name AS license_name

      FROM cart_items ci

      JOIN beats b ON b.id = ci.beat_id

      JOIN beat_licenses bl
        ON bl.id = ci.beat_license_id
        AND bl.beat_id = b.id

      JOIN licenses l ON l.id = bl.license_id
      JOIN users u ON u.id = b.producer_id

      LEFT JOIN producer_profiles pp
        ON pp.user_id = b.producer_id

      LEFT JOIN genres g ON g.id = b.genre_id
      LEFT JOIN subgenres s ON s.id = b.subgenre_id

      WHERE ci.cart_id = $1
        AND bl.is_available = TRUE
        AND b.status = 'published'

      ORDER BY ci.added_at DESC
    `,
    [cart.id],
  );

  const totalAmount = result.rows.reduce(
    (total, item) => total + Number(item.price),
    0,
  );

  return {
    cartId: cart.id,
    items: result.rows,
    totalAmount,
    currency: "IRT",
  };
};

export const removeCartItem = async (
  artistId: string,
  cartItemId: string,
) => {
  const result = await pool.query(
    `
      DELETE FROM cart_items ci
      USING carts c
      WHERE ci.id = $1
        AND ci.cart_id = c.id
        AND c.artist_id = $2
      RETURNING ci.id
    `,
    [cartItemId, artistId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      message: "Cart item not found.",
    };
  }

  return {
    success: true,
    message: "Beat removed from cart successfully.",
  };
};
